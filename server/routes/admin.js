import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAdmin } from '../auth.js';

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username).trim());
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = bcrypt.compareSync(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken({
      id: admin.id,
      username: admin.username,
      role: admin.role
    });

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/me
router.get('/me', requireAdmin, async (req, res) => {
  try {
    const admin = await db.prepare('SELECT id, username, role, created_at FROM admins WHERE id = ?').get(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/change-password
router.post('/change-password', requireAdmin, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
    if (!bcrypt.compareSync(current_password, admin.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    await db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, req.admin.id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics - Full overview metrics & breakdowns
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    // 1. Overall counts
    const overview = await db.prepare(`
      SELECT 
        COUNT(*) as total_registrations,
        SUM(CASE WHEN status = 'Admitted' THEN 1 ELSE 0 END) as total_admitted,
        SUM(CASE WHEN status = 'Registered' THEN 1 ELSE 0 END) as pending_admissions
      FROM attendees
    `).get();

    const totalReg = Number(overview?.total_registrations) || 0;
    const totalAdm = Number(overview?.total_admitted) || 0;
    const pendingAdm = Number(overview?.pending_admissions) || 0;
    const admissionRate = totalReg > 0 ? Math.round((totalAdm / totalReg) * 100) : 0;

    // 2. Breakdown by Division with allocated quota
    const divisionBreakdown = await db.prepare(`
      SELECT 
        d.id,
        d.name,
        d.code,
        COUNT(a.id) as total_attendees,
        SUM(CASE WHEN a.status = 'Admitted' THEN 1 ELSE 0 END) as admitted_count,
        COALESCE((SELECT SUM(i.quota) FROM institutions i WHERE i.division_id = d.id AND i.quota > 0), 0) as allocated_quota
      FROM divisions d
      LEFT JOIN attendees a ON d.id = a.division_id
      GROUP BY d.id, d.name, d.code
      ORDER BY total_attendees DESC, d.name ASC
    `).all();

    // 3. Breakdown by Sector (gracefully fallback if not configured)
    let sectorBreakdown = [];
    try {
      sectorBreakdown = await db.prepare(`
        SELECT 
          s.id,
          s.name,
          d.name as division_name,
          COUNT(a.id) as total_attendees,
          SUM(CASE WHEN a.status = 'Admitted' THEN 1 ELSE 0 END) as admitted_count
        FROM sectors s
        JOIN divisions d ON s.division_id = d.id
        LEFT JOIN attendees a ON s.id = a.sector_id
        GROUP BY s.id, s.name, d.name
        ORDER BY total_attendees DESC, s.name ASC
      `).all();
    } catch (e) {
      sectorBreakdown = [];
    }

    // 4. Breakdown by Unit (gracefully fallback if not configured)
    let unitBreakdown = [];
    try {
      unitBreakdown = await db.prepare(`
        SELECT 
          u.id,
          u.name,
          s.name as sector_name,
          d.name as division_name,
          COUNT(a.id) as total_attendees,
          SUM(CASE WHEN a.status = 'Admitted' THEN 1 ELSE 0 END) as admitted_count
        FROM units u
        JOIN sectors s ON u.sector_id = s.id
        JOIN divisions d ON s.division_id = d.id
        LEFT JOIN attendees a ON u.id = a.unit_id
        GROUP BY u.id, u.name, s.name, d.name
        ORDER BY total_attendees DESC, u.name ASC
      `).all();
    } catch (e) {
      unitBreakdown = [];
    }

    // 5. Breakdown by Dars / Dawa College (all configured institutions + allocated quota)
    const collegeBreakdown = await db.prepare(`
      SELECT 
        i.id as institution_id,
        i.name as college,
        i.code,
        COALESCE(i.quota, 0) as allocated_quota,
        d.id as division_id,
        d.name as division_name,
        COUNT(a.id) as total_attendees,
        SUM(CASE WHEN a.status = 'Admitted' THEN 1 ELSE 0 END) as admitted_count
      FROM institutions i
      LEFT JOIN divisions d ON i.division_id = d.id
      LEFT JOIN attendees a ON (a.institution_id = i.id OR (a.institution_id IS NULL AND LOWER(a.college) = LOWER(i.name))) AND a.status != 'Cancelled'
      GROUP BY i.id, i.name, i.code, i.quota, d.id, d.name
      ORDER BY total_attendees DESC, i.name ASC
    `).all();

    // 6. Recent Registrations (latest 10)
    const recentRegistrations = await db.prepare(`
      SELECT id, registration_id, full_name, mobile, division_name, sector_name, unit_name, college, status, created_at
      FROM attendees
      ORDER BY id DESC
      LIMIT 10
    `).all();

    // 7. Hierarchy counts
    let divCount = 0;
    let secCount = 0;
    let unitCount = 0;
    try {
      const divCountRow = await db.prepare('SELECT COUNT(*) as c FROM divisions').get();
      divCount = Number(divCountRow?.c) || 0;
    } catch (e) {}
    try {
      const secCountRow = await db.prepare('SELECT COUNT(*) as c FROM sectors').get();
      secCount = Number(secCountRow?.c) || 0;
    } catch (e) {}
    try {
      const unitCountRow = await db.prepare('SELECT COUNT(*) as c FROM units').get();
      unitCount = Number(unitCountRow?.c) || 0;
    } catch (e) {}

    const counts = {
      divisions: divCount,
      sectors: secCount,
      units: unitCount
    };

    res.json({
      overview: {
        total_registrations: totalReg,
        total_admitted: totalAdm,
        pending_admissions: pendingAdm,
        admission_rate: admissionRate
      },
      hierarchyCounts: counts,
      breakdown: {
        byDivision: (divisionBreakdown || []).map(r => {
          const quota = Number(r.allocated_quota) || 0;
          const count = Number(r.total_attendees) || 0;
          return {
            ...r,
            total_attendees: count,
            admitted_count: Number(r.admitted_count) || 0,
            allocated_quota: quota,
            quota_percentage: quota > 0 ? Math.round((count / quota) * 100) : 0
          };
        }),
        bySector: (sectorBreakdown || []).map(r => ({
          ...r,
          total_attendees: Number(r.total_attendees) || 0,
          admitted_count: Number(r.admitted_count) || 0
        })),
        byUnit: (unitBreakdown || []).map(r => ({
          ...r,
          total_attendees: Number(r.total_attendees) || 0,
          admitted_count: Number(r.admitted_count) || 0
        })),
        byCollege: (collegeBreakdown || []).map(r => {
          const quota = Number(r.allocated_quota) || 0;
          const count = Number(r.total_attendees) || 0;
          return {
            ...r,
            total_attendees: count,
            admitted_count: Number(r.admitted_count) || 0,
            allocated_quota: quota,
            quota_percentage: quota > 0 ? Math.round((count / quota) * 100) : 0
          };
        })
      },
      recentRegistrations
    });
  } catch (err) {
    console.error('Analytics query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/logs
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
