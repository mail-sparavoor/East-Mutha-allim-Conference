import express from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

// Helper to load settings map with safe defaults
async function loadSettingsMap() {
  const rows = await db.prepare('SELECT `key`, `value` FROM settings').all();
  const settings = {
    registration_open: 'true',
    registration_closed_message: '',
    spot_registration_open: 'true',
    spot_registration_closed_message: ''
  };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// GET /api/settings - Public event settings
router.get('/', async (req, res) => {
  try {
    const settings = await loadSettingsMap();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings - Admin update settings
router.post('/', requireAdmin, async (req, res) => {
  try {
    const updates = req.body || {};
    const prevSettings = await loadSettingsMap();

    const upsertStmt = db.prepare(`
      INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
    `);

    let nextRegOpen = null;
    let nextSpotRegOpen = null;

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (key === 'registration_open' || key === 'spot_registration_open') {
          const normalized =
            value === true || String(value).trim().toLowerCase() === 'true' ? 'true' : 'false';
          await upsertStmt.run(key, normalized);
          if (key === 'registration_open') nextRegOpen = normalized;
          if (key === 'spot_registration_open') nextSpotRegOpen = normalized;
        } else {
          await upsertStmt.run(key, String(value));
        }
      }
    }

    // Record audit log when normal registration status changes
    if (nextRegOpen !== null && nextRegOpen !== prevSettings.registration_open) {
      try {
        const action = nextRegOpen === 'true' ? 'REGISTRATION_REOPENED' : 'REGISTRATION_CLOSED';
        const details = `Normal registration ${nextRegOpen === 'true' ? 'reopened' : 'closed'} by ${req.admin?.username || 'admin'} (${req.admin?.role || 'admin'})`;
        await db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(action, details);
      } catch (auditErr) {
        // Non-fatal if audit_logs table is unavailable
      }
    }

    // Record audit log when spot registration status changes
    if (nextSpotRegOpen !== null && nextSpotRegOpen !== prevSettings.spot_registration_open) {
      try {
        const action = nextSpotRegOpen === 'true' ? 'SPOT_REGISTRATION_REOPENED' : 'SPOT_REGISTRATION_CLOSED';
        const details = `Spot registration ${nextSpotRegOpen === 'true' ? 'reopened' : 'closed'} by ${req.admin?.username || 'admin'} (${req.admin?.role || 'admin'})`;
        await db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(action, details);
      } catch (auditErr) {
        // Non-fatal if audit_logs table is unavailable
      }
    }

    const updatedSettings = await loadSettingsMap();
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
