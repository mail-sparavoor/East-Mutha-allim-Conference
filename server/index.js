import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initializeSeedData } from './db.js';
import attendeesRoutes from './routes/attendees.js';
import hierarchyRoutes from './routes/hierarchy.js';
import checkinRoutes from './routes/checkin.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 5050;

// Initialize Database & Seed realistic data
initializeSeedData();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/attendees', attendeesRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    event: 'Muthaallim Conference 2026',
    time: new Date().toISOString()
  });
});

// Serve frontend in production (dist directory)
const distPath = path.join(projectRoot, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    // If request doesn't match API, serve index.html
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

export { app };

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Muthaallim Conference Registration & Ticketing Server `);
  console.log(` Backend listening on: http://localhost:${PORT}        `);
  console.log(` Default Admin: username: admin / password: admin123   `);
  console.log(`=======================================================`);
});
