import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

// Helper to generate a clean, unique registration ID: MEMC1001, MEMC1002, ...
async function generateRegistrationId() {
  const rows = await db.prepare("SELECT registration_id FROM attendees WHERE registration_id LIKE 'MEMC%'").all();
  let maxNum = 1000;
  for (const r of rows) {
    const numPart = parseInt(r.registration_id.replace(/^MEMC/i, ''), 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  }
  if (maxNum === 1000) {
    const countRow = await db.prepare('SELECT COUNT(*) as count FROM attendees').get();
    maxNum = 1000 + (countRow ? Number(countRow.count) : 0);
  }
  return `MEMC${maxNum + 1}`;
}

// POST /api/attendees/check - Check if attendee is already registered by mobile number
router.post('/check', async (req, res) => {
  try {
    const { mobile, full_name } = req.body;
    if (full_name && full_name.trim() && !/^[a-zA-Z\s.'-]+$/.test(full_name.trim())) {
      return res.status(400).json({ error: 'Please enter your name in English text only (A-Z).' });
    }
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
    }

    const existing = await db.prepare('SELECT * FROM attendees WHERE mobile = ?').get(cleanMobile);
    if (existing) {
      const qrPayload = JSON.stringify({
        regId: existing.registration_id,
        name: existing.full_name,
        token: existing.verification_token
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 350,
        margin: 2,
        color: { dark: '#064e3b', light: '#ffffff' }
      });

      return res.json({
        exists: true,
        message: `Welcome back, ${existing.full_name}! You are already registered. Here is your entry ticket.`,
        attendee: {
          ...existing,
          qrCode: qrDataUrl
        }
      });
    }

    return res.json({
      exists: false,
      message: 'Mobile number not registered. Please complete the remaining fields below.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendees/register - Public attendee registration
router.post('/register', async (req, res) => {
  try {
    const {
      full_name,
      mobile,
      division_id,
      sector_id,
      unit_id,
      college,
      custom_college,
      notes
    } = req.body;

    // Validation
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // English text only validation for Full Name
    if (!/^[a-zA-Z\s.'-]+$/.test(full_name.trim())) {
      return res.status(400).json({ error: 'Full name must be filled out in English text only (A-Z).' });
    }

    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    if (!division_id) {
      return res.status(400).json({ error: 'Division selection is required' });
    }

    const finalCollege = (college === 'Other' && custom_college) ? custom_college.trim() : (college || '').trim();
    if (!finalCollege) {
      return res.status(400).json({ error: 'Dars / Dawa College is required' });
    }

    // English text only validation for Institution / College name
    if (!/^[a-zA-Z0-9\s.,'()&/-]+$/.test(finalCollege)) {
      return res.status(400).json({ error: 'Dars / College name must be filled out in English text only (A-Z).' });
    }

    // Auto-save new Dars / College into colleges table so it is permanently visible and selectable by others
    try {
      const existingCollege = await db.prepare('SELECT id FROM colleges WHERE LOWER(name) = LOWER(?)').get(finalCollege);
      if (!existingCollege) {
        await db.prepare('INSERT IGNORE INTO colleges (name) VALUES (?)').run(finalCollege);
      }
    } catch (cErr) {
      console.error('Error auto-inserting new college into directory:', cErr);
    }

    // Check if duplicate registration by same mobile number
    const existing = await db.prepare('SELECT * FROM attendees WHERE mobile = ?').get(cleanMobile);
    if (existing) {
      const qrPayload = JSON.stringify({
        regId: existing.registration_id,
        name: existing.full_name,
        token: existing.verification_token
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: { dark: '#064e3b', light: '#ffffff' }
      });

      return res.status(200).json({
        alreadyRegistered: true,
        message: 'You have already registered with this mobile number. Here is your existing ticket pass!',
        attendee: {
          ...existing,
          qrCode: qrDataUrl
        }
      });
    }

    // Resolve division name (Sector & Unit are not required)
    const divRow = await db.prepare('SELECT * FROM divisions WHERE id = ?').get(division_id);
    if (!divRow) {
      return res.status(400).json({ error: 'Please select a valid Division' });
    }

    const secRow = sector_id ? await db.prepare('SELECT * FROM sectors WHERE id = ?').get(sector_id) : null;
    const unitRow = unit_id ? await db.prepare('SELECT * FROM units WHERE id = ?').get(unit_id) : null;

    const registration_id = await generateRegistrationId();
    const verification_token = 'vtok_' + crypto.randomBytes(10).toString('hex');

    const insertStmt = db.prepare(`
      INSERT INTO attendees (
        registration_id, full_name, mobile,
        division_id, division_name,
        sector_id, sector_name,
        unit_id, unit_name,
        college, verification_token,
        status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Registered', ?)
    `);

    const result = await insertStmt.run(
      registration_id,
      full_name.trim(),
      cleanMobile,
      divRow.id,
      divRow.name,
      secRow ? secRow.id : 0,
      secRow ? secRow.name : '',
      unitRow ? unitRow.id : 0,
      unitRow ? unitRow.name : '',
      finalCollege,
      verification_token,
      (notes || '').trim()
    );

    const newAttendee = await db.prepare('SELECT * FROM attendees WHERE id = ?').get(result.lastInsertRowid);

    // Generate high quality QR code data URL
    const qrPayload = JSON.stringify({
      regId: newAttendee.registration_id,
      name: newAttendee.full_name,
      token: newAttendee.verification_token
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 350,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your digital conference entry pass has been generated.',
      attendee: {
        ...newAttendee,
        qrCode: qrDataUrl
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function for Ticket / Pass lookup by Registration ID, Verification Token, or Mobile
async function handleTicketLookup(identifier, req, res) {
  if (!identifier || !String(identifier).trim()) {
    return res.status(400).json({ error: 'Mobile number or Registration ID is required' });
  }

  const clean = String(identifier).trim();
  const cleanMobile = clean.replace(/\D/g, '');

  let attendee = null;
  // 1. Match exact registration_id or verification_token
  attendee = await db.prepare(`
    SELECT * FROM attendees 
    WHERE registration_id = ? OR verification_token = ?
  `).get(clean, clean);

  // 2. If not found and mobile is at least 10 digits, search by mobile
  if (!attendee && cleanMobile.length >= 10) {
    attendee = await db.prepare(`
      SELECT * FROM attendees 
      WHERE mobile = ? OR mobile LIKE ?
    `).get(cleanMobile, `%${cleanMobile.slice(-10)}`);
  }

  // 3. Fallback search by raw input
  if (!attendee) {
    attendee = await db.prepare(`
      SELECT * FROM attendees 
      WHERE mobile = ?
    `).get(clean);
  }

  if (!attendee) {
    return res.status(404).json({ error: 'No attendee ticket found matching this identifier' });
  }

  const qrPayload = JSON.stringify({
    regId: attendee.registration_id,
    name: attendee.full_name,
    token: attendee.verification_token
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 350,
    margin: 2,
    color: { dark: '#064e3b', light: '#ffffff' }
  });

  return res.json({
    attendee: {
      ...attendee,
      qrCode: qrDataUrl
    }
  });
}

// GET /api/attendees/ticket/:identifier (lookup by registration_id, token, or mobile)
router.get('/ticket/:identifier', async (req, res) => {
  try {
    await handleTicketLookup(req.params.identifier, req, res);
  } catch (err) {
    console.error('Ticket lookup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendees/lookup/:identifier
router.get('/lookup/:identifier', async (req, res) => {
  try {
    await handleTicketLookup(req.params.identifier, req, res);
  } catch (err) {
    console.error('Lookup identifier error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendees/lookup
router.get('/lookup', async (req, res) => {
  try {
    const id = req.query.query || req.query.identifier || req.query.mobile || req.query.registration_id;
    await handleTicketLookup(id, req, res);
  } catch (err) {
    console.error('Lookup query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendees/lookup
router.post('/lookup', async (req, res) => {
  try {
    const id = req.body.query || req.body.identifier || req.body.mobile || req.body.registration_id;
    await handleTicketLookup(id, req, res);
  } catch (err) {
    console.error('Lookup post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendees - Admin list attendees with search, filter, pagination
router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      search,
      division_id,
      sector_id,
      unit_id,
      status,
      college,
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let query = 'SELECT * FROM attendees WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      query += ` AND (
        full_name LIKE ? OR 
        mobile LIKE ? OR 
        registration_id LIKE ? OR 
        college LIKE ? OR
        unit_name LIKE ?
      )`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (division_id) {
      query += ' AND division_id = ?';
      params.push(division_id);
    }

    if (sector_id) {
      query += ' AND sector_id = ?';
      params.push(sector_id);
    }

    if (unit_id) {
      query += ' AND unit_id = ?';
      params.push(unit_id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (college) {
      query += ' AND college LIKE ?';
      params.push(`%${college}%`);
    }

    // Total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countRow = await db.prepare(countQuery).get(...params);
    const totalCount = Number(countRow?.total) || 0;

    // Sorting & pagination
    const validSortCols = ['id', 'registration_id', 'full_name', 'mobile', 'division_name', 'sector_name', 'unit_name', 'college', 'status', 'created_at', 'check_in_time'];
    const safeSort = validSortCols.includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    query += ` ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const attendees = await db.prepare(query).all(...params);

    res.json({
      attendees,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/attendees/:id - Admin update attendee
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, mobile, division_id, sector_id, unit_id, college, status, notes } = req.body;

    const existing = await db.prepare('SELECT * FROM attendees WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    let divName = existing.division_name;
    let secName = existing.sector_name;
    let unitName = existing.unit_name;

    if (division_id && division_id !== existing.division_id) {
      const d = await db.prepare('SELECT name FROM divisions WHERE id = ?').get(division_id);
      if (d) divName = d.name;
    }
    if (sector_id && sector_id !== existing.sector_id) {
      const s = await db.prepare('SELECT name FROM sectors WHERE id = ?').get(sector_id);
      if (s) secName = s.name;
    }
    if (unit_id && unit_id !== existing.unit_id) {
      const u = await db.prepare('SELECT name FROM units WHERE id = ?').get(unit_id);
      if (u) unitName = u.name;
    }

    const cleanMobile = mobile ? mobile.replace(/\D/g, '') : existing.mobile;

    await db.prepare(`
      UPDATE attendees SET
        full_name = COALESCE(?, full_name),
        mobile = COALESCE(?, mobile),
        division_id = COALESCE(?, division_id),
        division_name = COALESCE(?, division_name),
        sector_id = COALESCE(?, sector_id),
        sector_name = COALESCE(?, sector_name),
        unit_id = COALESCE(?, unit_id),
        unit_name = COALESCE(?, unit_name),
        college = COALESCE(?, college),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      full_name ? full_name.trim() : null,
      cleanMobile,
      division_id || null,
      divName,
      sector_id || null,
      secName,
      unit_id || null,
      unitName,
      college ? college.trim() : null,
      status || null,
      notes !== undefined ? notes : null,
      id
    );

    const updated = await db.prepare('SELECT * FROM attendees WHERE id = ?').get(id);
    res.json({ success: true, attendee: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attendees/:id - Admin delete attendee
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM attendees WHERE id = ?').run(id);
    res.json({ success: true, message: 'Attendee record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendees/export/csv - Export attendees to CSV
router.get('/export/csv', requireAdmin, async (req, res) => {
  try {
    const { division_id, status } = req.query;
    let query = 'SELECT * FROM attendees WHERE 1=1';
    const params = [];

    if (division_id) {
      query += ' AND division_id = ?';
      params.push(division_id);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY id ASC';
    const attendees = await db.prepare(query).all(...params);

    const headers = [
      'Registration ID',
      'Full Name',
      'Mobile Number',
      'Division',
      'Sector',
      'Unit',
      'Dars / Dawa College',
      'Admission Status',
      'Check-in Time',
      'Check-in Verifier',
      'Registration Date',
      'Verification Token'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = attendees.map(a => [
      escapeCsv(a.registration_id),
      escapeCsv(a.full_name),
      escapeCsv(a.mobile),
      escapeCsv(a.division_name),
      escapeCsv(a.sector_name),
      escapeCsv(a.unit_name),
      escapeCsv(a.college),
      escapeCsv(a.status),
      escapeCsv(a.check_in_time || 'N/A'),
      escapeCsv(a.check_in_by || 'N/A'),
      escapeCsv(a.created_at),
      escapeCsv(a.verification_token)
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=muthaallim_attendees_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
