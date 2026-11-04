import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables from .env
const envPath = path.resolve(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

import { initializeSeedData } from './db.js';
import attendeesRoutes from './routes/attendees.js';
import hierarchyRoutes from './routes/hierarchy.js';
import checkinRoutes from './routes/checkin.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 5050;

// Initialize Database & Seed realistic data
initializeSeedData();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    event: 'Muthaallim Conference 2026',
    time: new Date().toISOString(),
    env: process.env.VERCEL ? 'vercel-serverless' : 'standalone'
  });
});

// API Routes (Mounted with /api prefix as well as without /api for Vercel rewrite compatibility)
app.use(['/api/attendees', '/attendees'], attendeesRoutes);
app.use(['/api/hierarchy', '/hierarchy'], hierarchyRoutes);
app.use(['/api/checkin', '/checkin'], checkinRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/settings', '/settings'], settingsRoutes);

// Explicit 404 handler for any unhandled /api/* requests - ALWAYS returns JSON, never HTML
app.all(['/api/*', '/api'], (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Serve frontend in production (dist directory) when running standalone
const distPath = path.join(projectRoot, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    // If request matches API prefix, do not return index.html
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Express JSON Error Handler - guarantees JSON response on any server crash/exception
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

export { app };

// Determine if this file is the direct entrypoint or imported as a module (e.g. by Vercel serverless)
const isMainScript = process.argv[1] && (
  process.argv[1].endsWith('server' + path.sep + 'index.js') ||
  process.argv[1].endsWith('server/index.js')
);

if (isMainScript && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Muthaallim Conference Registration & Ticketing Server `);
    console.log(` Backend listening on: http://localhost:${PORT}        `);
    console.log(` Super Admin: username: admin    / password: admin123  `);
    console.log(` Sub Admin:   username: subadmin / password: subadmin123`);
    console.log(`=======================================================`);
  });
}
