import express from 'express';
import { db } from '../db.js';

const router = express.Router();

const SELECT_FIELDS = `
  id, registration_id, full_name, mobile,
  division_name, sector_name, unit_name, college,
  verification_token, status, check_in_time, check_in_by
`;

// Helper to parse QR content (JSON, URL, registration_id, mobile, or token)
function parseScanInput(raw) {
  if (!raw) return { token: null, regId: null, mobile: null, raw: '' };
  const trimmed = String(raw).trim();

  // Try JSON first (official QR format)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        token: parsed.token || null,
        regId: parsed.regId || parsed.id || null,
        mobile: parsed.mobile || null,
        raw: trimmed
      };
    } catch (_) {}
  }

  // Handle URL formats: /ticket/MEMC1001 or #ticket=MEMC1001
  let clean = trimmed;
  if (clean.includes('/ticket/')) {
    clean = clean.split('/ticket/')[1].split('?')[0].split('#')[0].replace(/\/+$/, '');
  } else if (clean.includes('ticket=')) {
    clean = clean.split('ticket=')[1].split('&')[0];
  }

  // Direct registration ID (e.g. MEMC1001)
  if (/^MEMC\d+$/i.test(clean)) {
    return { token: null, regId: clean.toUpperCase(), mobile: null, raw: clean };
  }

  // 10-digit mobile number
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 10) {
    return { token: null, regId: null, mobile: digits, raw: clean };
  }

  // Treat as verification token / fallback
  return { token: clean, regId: null, mobile: null, raw: clean };
}

// In-memory stats cache with 2.5s TTL to avoid heavy aggregate queries during simultaneous scans
let cachedStats = null;
let cachedStatsTime = 0;

async function getCheckinStats(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedStats && now - cachedStatsTime < 2500) {
    return { ...cachedStats };
  }

  try {
    const counts = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Admitted' THEN 1 ELSE 0 END) as admitted
      FROM attendees
      WHERE status != 'Cancelled'
    `).get();

    const total = Number(counts?.total) || 0;
    const admitted = Number(counts?.admitted) || 0;

    cachedStats = {
      total,
      admitted,
      pending: Math.max(0, total - admitted),
      rate: total > 0 ? Math.round((admitted / total) * 100) : 0
    };
    cachedStatsTime = now;
    return { ...cachedStats };
  } catch (err) {
    return cachedStats || { total: 0, admitted: 0, pending: 0, rate: 0 };
  }
}

// Helper to look up an attendee using optimized individual index lookups
async function findAttendeeByScan(keys) {
  // 1. Indexed lookup by verification_token (B-Tree UNIQUE index: ~0.1ms)
  if (keys.token) {
    const byToken = await db.prepare(`
      SELECT ${SELECT_FIELDS} FROM attendees WHERE verification_token = ?
    `).get(keys.token);
    if (byToken) return byToken;
  }

  // 2. Indexed lookup by registration_id (B-Tree UNIQUE index: ~0.1ms)
  if (keys.regId) {
    const byReg = await db.prepare(`
      SELECT ${SELECT_FIELDS} FROM attendees WHERE registration_id = ?
    `).get(keys.regId);
    if (byReg) return byReg;
  }

  // 3. Indexed lookup by mobile (B-Tree index: ~0.1ms)
  if (keys.mobile) {
    const byMobile = await db.prepare(`
      SELECT ${SELECT_FIELDS} FROM attendees WHERE mobile = ?
    `).get(keys.mobile);
    if (byMobile) return byMobile;
  }

  // 4. Fallback search: check registration_id or mobile directly with raw string
  if (keys.raw) {
    const byRegFallback = await db.prepare(`
      SELECT ${SELECT_FIELDS} FROM attendees WHERE registration_id = ?
    `).get(keys.raw);
    if (byRegFallback) return byRegFallback;

    const byMobileFallback = await db.prepare(`
      SELECT ${SELECT_FIELDS} FROM attendees WHERE mobile = ?
    `).get(keys.raw);
    if (byMobileFallback) return byMobileFallback;
  }

  return null;
}

// POST /api/checkin/scan - Ultra-fast, high-concurrency admission processing
router.post('/scan', async (req, res) => {
  try {
    const { qrData, verifier = 'Gate Coordinator' } = req.body;
    if (!qrData) {
      return res.status(400).json({ valid: false, message: 'No QR data received' });
    }

    const keys = parseScanInput(qrData);
    const attendee = await findAttendeeByScan(keys);

    if (!attendee) {
      // Non-blocking failed scan logging
      db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)')
        .run('FAILED_SCAN', `Unrecognized scan: ${String(keys.raw || qrData).substring(0, 50)}`)
        .catch(() => {});

      return res.status(404).json({
        valid: false,
        status: 'INVALID',
        message: 'Invalid Entry Pass! No registered attendee matches this QR code.'
      });
    }

    // Check if attendee is already admitted
    if (attendee.status === 'Admitted') {
      const stats = await getCheckinStats(false);
      return res.status(200).json({
        valid: true,
        alreadyAdmitted: true,
        status: 'ALREADY_ADMITTED',
        message: `ALREADY ADMITTED: Verified on ${attendee.check_in_time || 'earlier'} by ${attendee.check_in_by || 'Staff'}.`,
        attendee,
        stats
      });
    }

    // Atomic conditional update: prevents race condition if multiple gates scan simultaneously
    const nowTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    const updateRes = await db.prepare(`
      UPDATE attendees SET 
        status = 'Admitted', 
        check_in_time = ?, 
        check_in_by = ? 
      WHERE id = ? AND status != 'Admitted'
    `).run(nowTime, verifier, attendee.id);

    // If 0 rows affected, another gate admitted this exact attendee milliseconds ago
    if (updateRes.affectedRows === 0 && updateRes.changes === 0) {
      const fresh = await db.prepare(`SELECT ${SELECT_FIELDS} FROM attendees WHERE id = ?`).get(attendee.id);
      const stats = await getCheckinStats(false);
      return res.status(200).json({
        valid: true,
        alreadyAdmitted: true,
        status: 'ALREADY_ADMITTED',
        message: `ALREADY ADMITTED: Verified on ${fresh?.check_in_time || 'earlier'} by ${fresh?.check_in_by || 'Staff'}.`,
        attendee: fresh || attendee,
        stats
      });
    }

    // Admission successful! Construct updated object in memory without a redundant SELECT query
    const updatedAttendee = {
      ...attendee,
      status: 'Admitted',
      check_in_time: nowTime,
      check_in_by: verifier
    };

    // Update in-memory stats cache immediately
    if (cachedStats) {
      cachedStats.admitted += 1;
      cachedStats.pending = Math.max(0, cachedStats.pending - 1);
      if (cachedStats.total > 0) {
        cachedStats.rate = Math.round((cachedStats.admitted / cachedStats.total) * 100);
      }
    }
    const stats = cachedStats || (await getCheckinStats(true));

    // Non-blocking audit log insert
    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)')
      .run('ADMISSION_SUCCESS', `Attendee ${attendee.registration_id} (${attendee.full_name}) checked in by ${verifier}`)
      .catch(() => {});

    return res.status(200).json({
      valid: true,
      success: true,
      status: 'ADMITTED_NOW',
      message: `Admission Granted! Welcome ${updatedAttendee.full_name}.`,
      attendee: updatedAttendee,
      stats
    });
  } catch (err) {
    console.error('Checkin scan error:', err);
    res.status(500).json({ valid: false, error: err.message });
  }
});

// POST /api/checkin/manual - Manual check-in by ID or undo check-in
router.post('/manual', async (req, res) => {
  try {
    const { attendee_id, action = 'admit', verifier = 'Gate Coordinator' } = req.body;
    const attendee = await db.prepare(`SELECT ${SELECT_FIELDS} FROM attendees WHERE id = ?`).get(attendee_id);
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    if (action === 'undo') {
      await db.prepare(`
        UPDATE attendees SET status = 'Registered', check_in_time = NULL, check_in_by = NULL WHERE id = ?
      `).run(attendee_id);

      db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)')
        .run('ADMISSION_UNDO', `Reverted admission for ${attendee.registration_id} (${attendee.full_name})`)
        .catch(() => {});

      if (cachedStats) {
        cachedStats.admitted = Math.max(0, cachedStats.admitted - 1);
        cachedStats.pending += 1;
        if (cachedStats.total > 0) {
          cachedStats.rate = Math.round((cachedStats.admitted / cachedStats.total) * 100);
        }
      }

      const reverted = {
        ...attendee,
        status: 'Registered',
        check_in_time: null,
        check_in_by: null
      };

      return res.json({ success: true, message: 'Check-in reverted to Registered', attendee: reverted });
    }

    // Admit
    if (attendee.status === 'Admitted') {
      return res.status(400).json({
        error: `Attendee was already checked in at ${attendee.check_in_time}`,
        attendee
      });
    }

    const nowTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    const updateRes = await db.prepare(`
      UPDATE attendees SET status = 'Admitted', check_in_time = ?, check_in_by = ? WHERE id = ? AND status != 'Admitted'
    `).run(nowTime, verifier, attendee_id);

    if (updateRes.affectedRows === 0 && updateRes.changes === 0) {
      const fresh = await db.prepare(`SELECT ${SELECT_FIELDS} FROM attendees WHERE id = ?`).get(attendee_id);
      return res.status(400).json({
        error: `Attendee was already checked in at ${fresh?.check_in_time || 'earlier'}`,
        attendee: fresh || attendee
      });
    }

    if (cachedStats) {
      cachedStats.admitted += 1;
      cachedStats.pending = Math.max(0, cachedStats.pending - 1);
      if (cachedStats.total > 0) {
        cachedStats.rate = Math.round((cachedStats.admitted / cachedStats.total) * 100);
      }
    }

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)')
      .run('ADMISSION_MANUAL', `Attendee ${attendee.registration_id} (${attendee.full_name}) manually checked in by ${verifier}`)
      .catch(() => {});

    const updated = {
      ...attendee,
      status: 'Admitted',
      check_in_time: nowTime,
      check_in_by: verifier
    };

    res.json({ success: true, message: 'Attendee marked as Admitted', attendee: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkin/recent - Recent admissions stream
router.get('/recent', async (req, res) => {
  try {
    const recent = await db.prepare(`
      SELECT ${SELECT_FIELDS}
      FROM attendees
      WHERE status = 'Admitted'
      ORDER BY id DESC
      LIMIT 15
    `).all();

    const stats = await getCheckinStats(false);

    res.json({
      recent,
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
