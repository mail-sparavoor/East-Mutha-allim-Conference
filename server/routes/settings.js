import express from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

// GET /api/settings - Public event settings
router.get('/', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT `key`, `value` FROM settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings - Admin update settings
router.post('/', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const upsertStmt = db.prepare(`
      INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
    `);

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        await upsertStmt.run(key, String(value));
      }
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
