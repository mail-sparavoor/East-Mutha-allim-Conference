import express from 'express';
import { db, ensureUniqueDivisionSlug, sanitizeDivisionSlug } from '../db.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

// GET all divisions (public: excludes private share slugs)
router.get('/divisions', async (req, res) => {
  try {
    const divisions = await db.prepare('SELECT id, name, code FROM divisions ORDER BY name ASC').all();
    res.json(divisions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET sectors by division_id
router.get('/sectors', async (req, res) => {
  try {
    const { division_id } = req.query;
    if (!division_id) {
      const allSectors = await db.prepare('SELECT s.*, d.name as division_name FROM sectors s JOIN divisions d ON s.division_id = d.id ORDER BY s.name ASC').all();
      return res.json(allSectors);
    }
    const sectors = await db.prepare('SELECT * FROM sectors WHERE division_id = ? ORDER BY name ASC').all(division_id);
    res.json(sectors);
  } catch (err) {
    res.json([]);
  }
});

// GET units by sector_id
router.get('/units', async (req, res) => {
  try {
    const { sector_id } = req.query;
    if (!sector_id) {
      const allUnits = await db.prepare('SELECT u.*, s.name as sector_name FROM units u JOIN sectors s ON u.sector_id = s.id ORDER BY u.name ASC').all();
      return res.json(allUnits);
    }
    const units = await db.prepare('SELECT * FROM units WHERE sector_id = ? ORDER BY name ASC').all(sector_id);
    res.json(units);
  } catch (err) {
    res.json([]);
  }
});

// GET full nested hierarchy tree (Admin only: includes private division slugs)
router.get('/tree', requireAdmin, async (req, res) => {
  try {
    const divisions = await db.prepare('SELECT id, name, code, slug FROM divisions ORDER BY name ASC').all();
    let institutions = [];
    try {
      institutions = await db.prepare(`
        SELECT 
          i.*,
          (SELECT COUNT(*) FROM attendees a WHERE (a.institution_id = i.id OR (a.institution_id IS NULL AND LOWER(a.college) = LOWER(i.name))) AND a.status != 'Cancelled') as registered_count
        FROM institutions i 
        ORDER BY i.name ASC
      `).all();
    } catch (e) {
      institutions = [];
    }
    let sectors = [];
    let units = [];
    try {
      sectors = await db.prepare('SELECT * FROM sectors ORDER BY name ASC').all();
      units = await db.prepare('SELECT * FROM units ORDER BY name ASC').all();
    } catch (e) {
      sectors = [];
      units = [];
    }

    const tree = divisions.map(div => {
      const divInstitutions = (institutions || []).filter(i => i.division_id === div.id).map(inst => {
        const quotaNum = (inst.quota !== null && inst.quota !== undefined && inst.quota !== '') ? Number(inst.quota) : null;
        const regCount = Number(inst.registered_count || 0);
        const hasQuota = quotaNum !== null && quotaNum > 0;
        const isFull = hasQuota ? (regCount >= quotaNum) : false;
        const remainingSeats = hasQuota ? Math.max(0, quotaNum - regCount) : 0;
        return {
          ...inst,
          quota: quotaNum,
          has_quota: hasQuota,
          registered_count: regCount,
          is_full: isFull,
          remaining: remainingSeats,
          can_register: hasQuota && !isFull
        };
      });
      const divSectors = (sectors || []).filter(s => s.division_id === div.id).map(sec => {
        const secUnits = (units || []).filter(u => u.sector_id === sec.id);
        return {
          ...sec,
          units: secUnits
        };
      });
      return {
        ...div,
        institutions: divInstitutions,
        sectors: divSectors
      };
    });

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET institutions (with optional ?division_id filter)
router.get('/institutions', async (req, res) => {
  try {
    const { division_id } = req.query;
    let list;
    if (division_id) {
      list = await db.prepare(`
        SELECT 
          i.*,
          (SELECT COUNT(*) FROM attendees a WHERE (a.institution_id = i.id OR (a.institution_id IS NULL AND LOWER(a.college) = LOWER(i.name))) AND a.status != 'Cancelled') as registered_count
        FROM institutions i 
        WHERE i.division_id = ? 
        ORDER BY i.name ASC
      `).all(division_id);
    } else {
      list = await db.prepare(`
        SELECT 
          i.*, 
          d.name as division_name,
          (SELECT COUNT(*) FROM attendees a WHERE (a.institution_id = i.id OR (a.institution_id IS NULL AND LOWER(a.college) = LOWER(i.name))) AND a.status != 'Cancelled') as registered_count
        FROM institutions i 
        JOIN divisions d ON i.division_id = d.id 
        ORDER BY d.name ASC, i.name ASC
      `).all();
    }

    const processed = (list || []).map(inst => {
      const quotaNum = (inst.quota !== null && inst.quota !== undefined && inst.quota !== '') ? Number(inst.quota) : null;
      const regCount = Number(inst.registered_count || 0);
      const hasQuota = quotaNum !== null && quotaNum > 0;
      const isFull = hasQuota ? (regCount >= quotaNum) : false;
      const remainingSeats = hasQuota ? Math.max(0, quotaNum - regCount) : 0;
      return {
        ...inst,
        quota: quotaNum,
        has_quota: hasQuota,
        registered_count: regCount,
        is_full: isFull,
        remaining: remainingSeats,
        can_register: hasQuota && !isFull
      };
    });

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET list of colleges
router.get('/colleges', async (req, res) => {
  try {
    const colleges = await db.prepare('SELECT * FROM colleges ORDER BY name ASC').all();
    res.json(colleges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hierarchy/college - Add new Dars or College (English only, publicly usable by all users)
router.post('/college', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'College or Dars name is required' });
    }
    const cleanName = name.trim();
    // Only English text allowed
    if (!/^[a-zA-Z0-9\s.,'()&/-]+$/.test(cleanName)) {
      return res.status(400).json({ error: 'Please enter institution name in English text only (A-Z)' });
    }

    // Check if already exists (case-insensitive)
    let existing = await db.prepare('SELECT * FROM colleges WHERE LOWER(name) = LOWER(?)').get(cleanName);
    if (existing) {
      return res.json({ id: existing.id, name: existing.name, alreadyExisted: true });
    }

    const result = await db.prepare('INSERT INTO colleges (name) VALUES (?)').run(cleanName);
    res.status(201).json({ id: result.lastInsertRowid, name: cleanName, success: true });
  } catch (err) {
    if (err.message && (err.message.includes('Duplicate') || err.message.includes('UNIQUE'))) {
      const existing = await db.prepare('SELECT * FROM colleges WHERE LOWER(name) = LOWER(?)').get(req.body.name.trim());
      return res.json({ id: existing?.id, name: existing?.name || req.body.name.trim(), alreadyExisted: true });
    }
    res.status(500).json({ error: err.message });
  }
});

// Public Scoped Route: GET /api/hierarchy/division/:slug/breakdown
// Returns ONLY summary statistics and Dars/College breakdown for the division matching :slug.
router.get('/division/:slug/breakdown', async (req, res) => {
  try {
    const cleanSlug = sanitizeDivisionSlug(req.params.slug);
    if (!cleanSlug || cleanSlug.length < 3) {
      return res.status(404).json({ error: 'Invalid or expired division breakdown link.' });
    }

    const division = await db
      .prepare('SELECT id, name, code, slug FROM divisions WHERE slug = ?')
      .get(cleanSlug);

    if (!division) {
      return res.status(404).json({ error: 'Division breakdown not found. Please check your link or contact the conference administrator.' });
    }

    const summary = await db.prepare(`
      SELECT
        COUNT(*) as total_attendees,
        SUM(CASE WHEN status = 'Admitted' THEN 1 ELSE 0 END) as admitted_count,
        SUM(CASE WHEN status = 'Registered' THEN 1 ELSE 0 END) as pending_count
      FROM attendees
      WHERE division_id = ? AND status != 'Cancelled'
    `).get(division.id);

    const institutions = await db.prepare(`
      SELECT
        i.id as institution_id,
        i.name as college,
        i.code,
        COALESCE(i.quota, 0) as allocated_quota,
        COUNT(a.id) as total_attendees,
        SUM(CASE WHEN a.status = 'Admitted' THEN 1 ELSE 0 END) as admitted_count
      FROM institutions i
      LEFT JOIN attendees a ON (a.institution_id = i.id OR (a.institution_id IS NULL AND LOWER(a.college) = LOWER(i.name))) AND a.division_id = i.division_id AND a.status != 'Cancelled'
      WHERE i.division_id = ?
      GROUP BY i.id, i.name, i.code, i.quota
      ORDER BY total_attendees DESC, i.name ASC
    `).all(division.id);

    const byCollege = (institutions || []).map((row) => {
      const quota = Number(row.allocated_quota) || 0;
      const count = Number(row.total_attendees) || 0;
      const admitted = Number(row.admitted_count) || 0;
      return {
        institution_id: row.institution_id,
        college: row.college,
        code: row.code,
        division_id: division.id,
        division_name: division.name,
        allocated_quota: quota,
        total_attendees: count,
        admitted_count: admitted,
        remaining: quota > 0 ? Math.max(0, quota - count) : 0,
        quota_percentage: quota > 0 ? Math.round((count / quota) * 100) : 0
      };
    });

    const allocatedQuota = byCollege.reduce(
      (sum, item) => sum + (item.allocated_quota > 0 ? item.allocated_quota : 0),
      0
    );
    const totalAttendees = Number(summary?.total_attendees) || 0;
    const admittedCount = Number(summary?.admitted_count) || 0;
    const pendingCount = Number(summary?.pending_count) || 0;
    const activeInstitutions = byCollege.filter((c) => c.total_attendees > 0).length;

    res.json({
      division: {
        id: division.id,
        name: division.name,
        code: division.code,
        slug: division.slug
      },
      overview: {
        total_attendees: totalAttendees,
        admitted_count: admittedCount,
        pending_count: pendingCount,
        allocated_quota: allocatedQuota,
        remaining_quota: allocatedQuota > 0 ? Math.max(0, allocatedQuota - totalAttendees) : 0,
        quota_percentage: allocatedQuota > 0 ? Math.round((totalAttendees / allocatedQuota) * 100) : 0,
        admission_rate: totalAttendees > 0 ? Math.round((admittedCount / totalAttendees) * 100) : 0,
        total_institutions: byCollege.length,
        active_institutions: activeInstitutions
      },
      byCollege
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin routes:
router.post('/division', requireAdmin, async (req, res) => {
  try {
    const { name, code, slug } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const cleanName = name.trim();
    const cleanCode = (code || '').trim().toUpperCase();

    let finalSlug;
    if (slug && String(slug).trim()) {
      finalSlug = sanitizeDivisionSlug(slug);
      if (!finalSlug || finalSlug.length < 3) {
        return res.status(400).json({ error: 'Custom slug must be at least 3 alphanumeric characters' });
      }
      const slugTaken = await db.prepare('SELECT id FROM divisions WHERE slug = ?').get(finalSlug);
      if (slugTaken) {
        return res.status(400).json({ error: 'This division slug is already in use' });
      }
    } else {
      finalSlug = await ensureUniqueDivisionSlug(cleanName);
    }

    const stmt = db.prepare('INSERT INTO divisions (name, code, slug) VALUES (?, ?, ?)');
    const result = await stmt.run(cleanName, cleanCode, finalSlug);
    res.json({ id: result.lastInsertRowid, name: cleanName, code: cleanCode, slug: finalSlug });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('Duplicate') || err.message.includes('UNIQUE') ? 'Division or slug already exists' : err.message });
  }
});

router.put('/division/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, slug } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const cleanName = name.trim();
    const cleanCode = (code || '').trim().toUpperCase();

    const current = await db.prepare('SELECT id, slug FROM divisions WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ error: 'Division not found' });
    }

    let finalSlug = current.slug;
    if (slug !== undefined && String(slug).trim() !== '') {
      finalSlug = sanitizeDivisionSlug(slug);
      if (!finalSlug || finalSlug.length < 3) {
        return res.status(400).json({ error: 'Custom slug must be at least 3 alphanumeric characters' });
      }
      const conflict = await db.prepare('SELECT id FROM divisions WHERE slug = ? AND id != ?').get(finalSlug, id);
      if (conflict) {
        return res.status(400).json({ error: 'This division slug is already assigned to another division' });
      }
    } else if (!finalSlug) {
      finalSlug = await ensureUniqueDivisionSlug(cleanName, id);
    }

    await db.prepare('UPDATE divisions SET name = ?, code = ?, slug = ? WHERE id = ?').run(cleanName, cleanCode, finalSlug, id);
    res.json({ success: true, slug: finalSlug, message: 'Division updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/division/:id/regenerate-slug', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const division = await db.prepare('SELECT id, name FROM divisions WHERE id = ?').get(id);
    if (!division) {
      return res.status(404).json({ error: 'Division not found' });
    }
    const newSlug = await ensureUniqueDivisionSlug(division.name, division.id);
    await db.prepare('UPDATE divisions SET slug = ? WHERE id = ?').run(newSlug, division.id);
    res.json({ success: true, slug: newSlug, message: 'Division share link regenerated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/division/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM divisions WHERE id = ?').run(id);
    res.json({ success: true, message: 'Division deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sector', requireAdmin, async (req, res) => {
  try {
    const { division_id, name, code } = req.body;
    if (!division_id || !name || !name.trim()) {
      return res.status(400).json({ error: 'Division and Sector name are required' });
    }
    const stmt = db.prepare('INSERT INTO sectors (division_id, name, code) VALUES (?, ?, ?)');
    const result = await stmt.run(division_id, name.trim(), (code || '').trim().toUpperCase());
    res.json({ id: result.lastInsertRowid, division_id, name: name.trim(), code });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('Duplicate') || err.message.includes('UNIQUE') ? 'Sector already exists in this division' : err.message });
  }
});

router.put('/sector/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    await db.prepare('UPDATE sectors SET name = ?, code = ? WHERE id = ?').run(name.trim(), (code || '').trim().toUpperCase(), id);
    res.json({ success: true, message: 'Sector updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/sector/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM sectors WHERE id = ?').run(id);
    res.json({ success: true, message: 'Sector deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unit', requireAdmin, async (req, res) => {
  try {
    const { sector_id, name, code } = req.body;
    if (!sector_id || !name || !name.trim()) {
      return res.status(400).json({ error: 'Sector and Unit name are required' });
    }
    const stmt = db.prepare('INSERT INTO units (sector_id, name, code) VALUES (?, ?, ?)');
    const result = await stmt.run(sector_id, name.trim(), (code || '').trim().toUpperCase());
    res.json({ id: result.lastInsertRowid, sector_id, name: name.trim(), code });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('Duplicate') || err.message.includes('UNIQUE') ? 'Unit already exists in this sector' : err.message });
  }
});

router.put('/unit/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    await db.prepare('UPDATE units SET name = ?, code = ? WHERE id = ?').run(name.trim(), (code || '').trim().toUpperCase(), id);
    res.json({ success: true, message: 'Unit updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/unit/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM units WHERE id = ?').run(id);
    res.json({ success: true, message: 'Unit deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Institution Admin Routes:
router.post('/institution', requireAdmin, async (req, res) => {
  try {
    const { division_id, name, code, quota } = req.body;
    if (!division_id) {
      return res.status(400).json({ error: 'Division selection is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Institution name is required' });
    }
    const cleanName = name.trim();
    if (!/^[a-zA-Z0-9\s.,'()&/-]+$/.test(cleanName)) {
      return res.status(400).json({ error: 'Institution name must be in English text only (A-Z)' });
    }

    // Check duplicate under same division
    const existing = await db.prepare('SELECT * FROM institutions WHERE division_id = ? AND LOWER(name) = LOWER(?)').get(division_id, cleanName);
    if (existing) {
      return res.status(400).json({ error: 'This institution already exists under the selected division' });
    }

    const cleanCode = (code || '').trim().toUpperCase();
    let quotaVal = null;
    if (quota !== undefined && quota !== null && String(quota).trim() !== '') {
      const q = parseInt(quota, 10);
      if (!isNaN(q) && q >= 0) {
        quotaVal = q;
      }
    }

    const result = await db.prepare('INSERT INTO institutions (division_id, name, code, quota) VALUES (?, ?, ?, ?)').run(
      division_id, 
      cleanName, 
      cleanCode || null,
      quotaVal
    );

    // Keep legacy colleges table in sync
    try {
      await db.prepare('INSERT IGNORE INTO colleges (name) VALUES (?)').run(cleanName);
    } catch (_) {}

    res.status(201).json({
      id: result.lastInsertRowid,
      division_id,
      name: cleanName,
      code: cleanCode,
      quota: quotaVal,
      success: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/institution/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { division_id, name, code, quota } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Institution name is required' });
    }
    const cleanName = name.trim();
    if (!/^[a-zA-Z0-9\s.,'()&/-]+$/.test(cleanName)) {
      return res.status(400).json({ error: 'Institution name must be in English text only (A-Z)' });
    }
    const cleanCode = (code || '').trim().toUpperCase();
    let quotaVal = null;
    if (quota !== undefined && quota !== null && String(quota).trim() !== '') {
      const q = parseInt(quota, 10);
      if (!isNaN(q) && q >= 0) {
        quotaVal = q;
      }
    }

    if (division_id) {
      await db.prepare('UPDATE institutions SET division_id = ?, name = ?, code = ?, quota = ? WHERE id = ?').run(
        division_id, 
        cleanName, 
        cleanCode || null, 
        quotaVal,
        id
      );
    } else {
      await db.prepare('UPDATE institutions SET name = ?, code = ?, quota = ? WHERE id = ?').run(
        cleanName, 
        cleanCode || null, 
        quotaVal,
        id
      );
    }

    res.json({ success: true, message: 'Institution updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/institution/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM institutions WHERE id = ?').run(id);
    res.json({ success: true, message: 'Institution deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk import institutions under divisions (supports CSV text or array of { division, institution, code, quota })
router.post('/bulk-institutions', requireAdmin, async (req, res) => {
  try {
    const { rows, text } = req.body;
    let itemsToProcess = [];

    if (Array.isArray(rows) && rows.length > 0) {
      itemsToProcess = rows;
    } else if (text && typeof text === 'string') {
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const startIndex = lines[0].toLowerCase().includes('division') ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          let codePart = '';
          let quotaPart = null;

          if (parts.length === 3) {
            // Check if 3rd part is purely a number (quota) or a code
            if (/^\d+$/.test(parts[2])) {
              quotaPart = parts[2];
            } else {
              codePart = parts[2];
            }
          } else if (parts.length >= 4) {
            codePart = parts[2];
            quotaPart = parts[3];
          }

          itemsToProcess.push({
            division: parts[0],
            institution: parts[1],
            code: codePart,
            quota: quotaPart
          });
        }
      }
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ error: 'No valid rows provided. Required format: Division, Institution, Code(optional), Quota(optional)' });
    }

    let addedInstitutions = 0;
    let updatedInstitutions = 0;
    let createdDivisions = 0;
    let skipped = 0;

    for (const item of itemsToProcess) {
      const divName = (item.division || item.Division || '').trim();
      const instName = (item.institution || item.Institution || item.name || item.Name || '').trim();
      const code = (item.code || item.Code || '').trim();
      const rawQuota = item.quota ?? item.limit ?? item.Quota ?? item.Limit ?? item.max ?? item.seats;

      let parsedQuota = null;
      if (rawQuota !== undefined && rawQuota !== null && String(rawQuota).trim() !== '') {
        const q = parseInt(rawQuota, 10);
        if (!isNaN(q) && q >= 0) parsedQuota = q;
      }

      if (!divName || !instName) {
        skipped++;
        continue;
      }

      // Check or create division
      let div = await db.prepare('SELECT id FROM divisions WHERE LOWER(name) = LOWER(?)').get(divName);
      if (!div) {
        const newSlug = await ensureUniqueDivisionSlug(divName);
        const divRes = await db.prepare('INSERT INTO divisions (name, code, slug) VALUES (?, ?, ?)').run(divName, divName.substring(0, 3).toUpperCase(), newSlug);
        div = { id: divRes.lastInsertRowid };
        createdDivisions++;
      }

      // Check if institution already exists under this division
      const existingInst = await db.prepare('SELECT id, quota, code FROM institutions WHERE division_id = ? AND LOWER(name) = LOWER(?)').get(div.id, instName);
      if (!existingInst) {
        await db.prepare('INSERT INTO institutions (division_id, name, code, quota) VALUES (?, ?, ?, ?)').run(div.id, instName, code || null, parsedQuota);
        addedInstitutions++;
        // Keep colleges table synchronized
        try {
          await db.prepare('INSERT IGNORE INTO colleges (name) VALUES (?)').run(instName);
        } catch (_) {}
      } else {
        // If already exists, update quota or code if provided
        if (parsedQuota !== null || code) {
          const finalQuota = parsedQuota !== null ? parsedQuota : existingInst.quota;
          const finalCode = code || existingInst.code;
          await db.prepare('UPDATE institutions SET quota = ?, code = ? WHERE id = ?').run(finalQuota, finalCode, existingInst.id);
          updatedInstitutions++;
        } else {
          skipped++;
        }
      }
    }

    res.json({
      success: true,
      addedInstitutions,
      updatedInstitutions,
      createdDivisions,
      skipped,
      message: `Bulk import completed: ${addedInstitutions} institutions added, ${updatedInstitutions} updated across ${createdDivisions} new and existing divisions.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk import hierarchy (array of { division, sector, unit })
router.post('/bulk-import', requireAdmin, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty rows data' });
    }

    let addedDivs = 0;
    let addedSecs = 0;
    let addedUnits = 0;

    for (const row of rows) {
      const divName = (row.division || row.Division || '').trim();
      const secName = (row.sector || row.Sector || '').trim();
      const unitName = (row.unit || row.Unit || '').trim();

      if (!divName) continue;

      // Ensure division exists
      let div = await db.prepare('SELECT id FROM divisions WHERE name = ?').get(divName);
      if (!div) {
        const newSlug = await ensureUniqueDivisionSlug(divName);
        const divRes = await db.prepare('INSERT INTO divisions (name, code, slug) VALUES (?, ?, ?)').run(divName, divName.substring(0, 3).toUpperCase(), newSlug);
        div = { id: divRes.lastInsertRowid };
        addedDivs++;
      }

      if (secName) {
        let sec = await db.prepare('SELECT id FROM sectors WHERE division_id = ? AND name = ?').get(div.id, secName);
        if (!sec) {
          const secRes = await db.prepare('INSERT INTO sectors (division_id, name, code) VALUES (?, ?, ?)').run(div.id, secName, secName.substring(0, 3).toUpperCase());
          sec = { id: secRes.lastInsertRowid };
          addedSecs++;
        }

        if (unitName) {
          let unit = await db.prepare('SELECT id FROM units WHERE sector_id = ? AND name = ?').get(sec.id, unitName);
          if (!unit) {
            await db.prepare('INSERT INTO units (sector_id, name, code) VALUES (?, ?, ?)').run(sec.id, unitName, unitName.substring(0, 3).toUpperCase());
            addedUnits++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Hierarchy imported: ${addedDivs} divisions, ${addedSecs} sectors, ${addedUnits} units added.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
