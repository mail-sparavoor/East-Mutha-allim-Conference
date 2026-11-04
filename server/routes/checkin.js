import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Helper to parse QR content which might be JSON or plain registration_id / token
function parseScanInput(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed.token || parsed.regId || parsed.id || trimmed;
  } catch (e) {
    return trimmed;
  }
}

// POST /api/checkin/scan - Process scanned QR code
router.post('/scan', async (req, res) => {
  try {
    const { qrData, verifier = 'Gate Coordinator' } = req.body;
    if (!qrData) {
      return res.status(400).json({ valid: false, message: 'No QR data received' });
    }

    const key = parseScanInput(qrData);

    // Search attendee by verification_token, registration_id, or mobile
    const attendee = await db.prepare(`
      SELECT * FROM attendees 
      WHERE verification_token = ? OR registration_id = ? OR mobile = ?
    `).get(key, key, key);

    if (!attendee) {
      // Log failed scan attempt
      await db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
        'FAILED_SCAN',
        `Unrecognized scan: ${String(key).substring(0, 50)}`
      );

      return res.status(404).json({
        valid: false,
        status: 'INVALID',
        message: 'Invalid Entry Pass! No registered attendee matches this QR code.'
      });
    }

    // Check if duplicate check-in
    if (attendee.status === 'Admitted') {
      return res.status(200).json({
        valid: true,
        alreadyAdmitted: true,
        status: 'ALREADY_ADMITTED',
        message: `ALREADY ADMITTED: This ticket was already verified on ${attendee.check_in_time || 'earlier'} by ${attendee.check_in_by || 'Staff'}.`,
        attendee
      });
    }

    // First time check-in -> mark as Admitted
    const nowTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    await db.prepare(`
      UPDATE attendees SET 
        status = 'Admitted', 
        check_in_time = ?, 
        check_in_by = ? 
      WHERE id = ?
    `).run(nowTime, verifier, attendee.id);

    await db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'ADMISSION_SUCCESS',
      `Attendee ${attendee.registration_id} (${attendee.full_name}) checked in by ${verifier}`
    );

    const updatedAttendee = await db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendee.id);

    return res.status(200).json({
      valid: true,
      success: true,
      status: 'ADMITTED_NOW',
      message: `Admission Granted! Welcome ${updatedAttendee.full_name}.`,
      attendee: updatedAttendee
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
    const attendee = await db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendee_id);
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    if (action === 'undo') {
      await db.prepare(`
        UPDATE attendees SET status = 'Registered', check_in_time = NULL, check_in_by = NULL WHERE id = ?
      `).run(attendee_id);

      await db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
        'ADMISSION_UNDO',
        `Reverted admission for ${attendee.registration_id} (${attendee.full_name})`
      );

      const reverted = await db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendee_id);
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

    await db.prepare(`
      UPDATE attendees SET status = 'Admitted', check_in_time = ?, check_in_by = ? WHERE id = ?
    `).run(nowTime, verifier, attendee_id);

    const updated = await db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendee_id);
    res.json({ success: true, message: 'Attendee marked as Admitted', attendee: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkin/recent - Recent admissions stream
router.get('/recent', async (req, res) => {
  try {
    const recent = await db.prepare(`
      SELECT id, registration_id, full_name, mobile, division_name, sector_name, unit_name, college, status, check_in_time, check_in_by
      FROM attendees
      WHERE status = 'Admitted'
      ORDER BY id DESC
      LIMIT 15
    `).all();

    const counts = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Admitted' THEN 1 ELSE 0 END) as admitted
      FROM attendees
    `).get();

    res.json({
      recent,
      stats: {
        total: Number(counts?.total) || 0,
        admitted: Number(counts?.admitted) || 0,
        pending: (Number(counts?.total) || 0) - (Number(counts?.admitted) || 0),
        rate: counts?.total ? Math.round(((Number(counts.admitted) || 0) / counts.total) * 100) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
