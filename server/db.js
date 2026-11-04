import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../.env');

// Ensure .env is loaded
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const MYSQL_URI = process.env.DATABASE_URL || '';

if (!MYSQL_URI) {
  console.warn('⚠️ Warning: DATABASE_URL is not set in environment variables. Check .env file.');
}

// Clean URI by stripping ?ssl-mode=REQUIRED to avoid mysql2 configuration warning
const cleanUri = MYSQL_URI ? MYSQL_URI.split('?')[0] : '';

// Create resilient connection pool to Aiven Cloud MySQL with SSL
export const pool = mysql.createPool({
  uri: cleanUri || 'mysql://localhost:3306/muthaallim_conference',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Reconnect/error listener
pool.on('connection', (conn) => {
  conn.on('error', (err) => {
    console.error('MySQL Connection error on pool:', err.code || err.message);
  });
});

export const db = {
  pool,

  async query(sql, params = []) {
    try {
      const flatParams = Array.isArray(params) ? params.flat() : [params];
      const [rows] = await pool.query(sql, flatParams);
      return rows;
    } catch (err) {
      console.error('Database query error:', err.message, '\nSQL:', sql);
      throw err;
    }
  },

  prepare(sql) {
    return {
      async get(...params) {
        try {
          const flatParams = params.flat();
          const [rows] = await pool.query(sql, flatParams);
          return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        } catch (err) {
          console.error('Database prepare.get error:', err.message, '\nSQL:', sql);
          throw err;
        }
      },
      async all(...params) {
        try {
          const flatParams = params.flat();
          const [rows] = await pool.query(sql, flatParams);
          return Array.isArray(rows) ? rows : [];
        } catch (err) {
          console.error('Database prepare.all error:', err.message, '\nSQL:', sql);
          throw err;
        }
      },
      async run(...params) {
        try {
          const flatParams = params.flat();
          const [result] = await pool.query(sql, flatParams);
          return {
            lastInsertRowid: result.insertId,
            insertId: result.insertId,
            changes: result.affectedRows,
            affectedRows: result.affectedRows
          };
        } catch (err) {
          console.error('Database prepare.run error:', err.message, '\nSQL:', sql);
          throw err;
        }
      }
    };
  },

  async exec(sql) {
    try {
      const [result] = await pool.query(sql);
      return result;
    } catch (err) {
      console.error('Database exec error:', err.message);
      throw err;
    }
  }
};

// Function to initialize tables and initial data in MySQL
export async function initializeSeedData() {
  try {
    if (!cleanUri) {
      console.warn('⚠️ No DATABASE_URL configured; skipping DB initialization.');
      return;
    }

    // 0. Ensure sectors and units tables exist to prevent missing table errors
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        division_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sector_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 1. Settings check
    const checkSetting = await db.prepare('SELECT `value` FROM settings WHERE `key` = ?').get('event_title');
    if (!checkSetting) {
      const insertSetting = db.prepare('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)');
      await insertSetting.run('event_title', '');
      await insertSetting.run('event_subtitle', 'Malappuram East District Muthaallim Conference');
      await insertSetting.run('event_date', '19 November 2026, Thursday');
      await insertSetting.run('event_venue', 'പുളിക്കൽ, ഐക്കരപ്പടി (Pulikkal, Aikkarappadi)');
      await insertSetting.run('registration_open', 'true');
      await insertSetting.run('contact_phone', '+91 98460 12345');
      await insertSetting.run('contact_email', 'muthaallim.east@gmail.com');
    }

    // 2. Admin check (username: admin / password: admin123, subadmin / subadmin123)
    const checkAdmin = await db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
    if (!checkAdmin) {
      await db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
        .run('admin', '$2a$10$ooypNcRqUJGL1v8/HECveOKtKcBt1uQb49Ibl2CU.gkmgzx8o4QK6', 'superadmin');
    }

    const checkSubAdmin = await db.prepare('SELECT id FROM admins WHERE username = ?').get('subadmin');
    if (!checkSubAdmin) {
      await db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
        .run('subadmin', '$2a$10$ooypNcRqUJGL1v8/HECveOKtKcBt1uQb49Ibl2CU.gkmgzx8o4QK6', 'subadmin');
    }

    // 3. Divisions check
    const divCount = await db.prepare('SELECT COUNT(*) as count FROM divisions').get();
    if (!divCount || divCount.count === 0) {
      const defaultDivs = [
        ['Pulikkal', 'PLK'],
        ['Kondotty', 'KON'],
        ['Malappuram', 'MLP'],
        ['Paravoor East', 'PVE'],
        ['Paravoor West', 'PVW'],
        ['Aluva East', 'ALE'],
        ['Angamaly', 'ANG'],
        ['Kalamassery', 'KLM']
      ];
      for (const [name, code] of defaultDivs) {
        await db.prepare('INSERT IGNORE INTO divisions (name, code) VALUES (?, ?)').run(name, code);
      }
    }

    // 4. Colleges check
    const collegeCount = await db.prepare('SELECT COUNT(*) as count FROM colleges').get();
    if (!collegeCount || collegeCount.count === 0) {
      const defaultColleges = [
        'Markazu Ssaqafathi Ssunniyya, Karanthur',
        'Jamia Madeenathunnoor, Kozhikode',
        'Darul Huda Islamic University, Chemmad',
        'Jamia Nooriya Arabic College, Pattikkad',
        'Ma\'din Academy, Malappuram',
        'Al Jamiathul Ashrafiyya, Azamgarh / Regional',
        'Busthanabad Arabic College',
        'Al Jamia Al Islamiyya, Santhapuram',
        'Sirajul Huda, Kuttiady',
        'Sa-adiya Arabic College, Kasaragod',
        'Al Maqarr Islamic Academy, Kannur',
        'Hadiyya Dawa College, Ernakulam',
        'Kottuvally Mahallu Dars, Paravoor East',
        'Local Mahallu Dars (Independent)',
        'Other / Independent Studies'
      ];
      for (const name of defaultColleges) {
        await db.prepare('INSERT IGNORE INTO colleges (name) VALUES (?)').run(name);
      }
    }

    console.log('✅ Connected to Aiven MySQL & verified schema successfully!');
  } catch (err) {
    console.error('❌ Error during MySQL seed initialization:', err.message);
  }
}
