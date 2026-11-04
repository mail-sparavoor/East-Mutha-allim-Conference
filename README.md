# Muthaallim Conference 2026
### Event Registration, Digital Ticketing Pass & Gate Admission Verification System

A complete full-stack web application designed for the **Muthaallim Conference** (Paravoor East). The platform features an attendee registration workflow with strict 3-tier organizational cascading dropdowns, automated entry ticket generation with secure QR codes, mobile-friendly venue gate check-in scanner with duplicate admission prevention, and an executive administrative dashboard with metrics, breakdown analytics, hierarchy management, and CSV exports.

---

## 🌟 Key Features

### 1. Attendee Registration & Cascading Hierarchy
- **Strict 3-Tier Cascading Logic**: `Division -> Sector -> Unit`
  - Selecting a Division dynamically loads only its assigned Sectors.
  - Selecting a Sector dynamically loads only its assigned Units.
- **Form Fields**:
  - Full Name
  - Mobile Number (with 10-digit validation)
  - Division (Dropdown)
  - Sector (Cascading Dropdown)
  - Unit (Cascading Dropdown)
  - Dars / Dawa College (Comprehensive list of regional institutions + "Other" specify option)
- **Duplicate Detection**: If an attendee registers again with the same mobile number, the system recovers their existing ticket pass instead of creating duplicate records.
- **Confetti Celebration**: Immediate celebratory visual feedback upon pass issuance.

### 2. Digital Entry Pass & QR Code Generation
- Unique formatted Registration ID (e.g. `MC2026-PVE-1001`).
- Cryptographic verification token embedded inside a high-resolution QR code.
- Detailed pass card displaying Delegate Name, Mobile, Division, Sector, Unit, Institution, and Admission Status badge.
- **Export & Share Options**:
  - **Download PDF Pass** (A5 high-DPI document)
  - **Save as Image (PNG)**
  - **Print Ticket** (Printer-optimized layout)
  - **Shareable Link** (e.g. `/#ticket=MC2026-PVE-1001`)

### 3. Venue Check-In & Gate Admission System
- Mobile-friendly web QR scanner using the device camera (`html5-qrcode`).
- Camera switcher (rear/front camera) and start/stop controls.
- **Instant Audio Feedback**: Built-in Web Audio API tone synthesis (success chime, warning double buzz, error tone).
- **Duplicate Entry Prevention**:
  - Scanning a new pass marks the attendee as **"Admitted"** with live timestamp and gate verifier identifier.
  - Scanning an already admitted pass immediately displays a bold warning: **"ALREADY ADMITTED at [Time] by [Gate]"**, preventing ticket sharing or duplicate entry.
- **Manual Search Fallback**: Search by Mobile, Name, or Registration ID for attendees with cracked screens or depleted batteries, with a 1-click Check-in button.
- **Live Stream**: Real-time admission activity feed and attendance rate indicator.

### 4. Administrative Dashboard (`/admin`)
- **Secure Authentication**: Administrator login with JWT token session.
  - **Super Admin**: `emcadmin` / `emcsadmin`
  - **Sub-Admin**: `cmsadmin` / `passcmseast`
- **Analytics & Breakdowns**:
  - Total registrations, venue admissions, pending check-ins, admission rate.
  - Distribution breakdown cards for **Divisions**, **Sectors**, **Units**, and **Dars / Dawa Colleges**.
- **Attendee Registry Table**:
  - Multi-column search, division filtering, admission status filtering, pagination.
  - View ticket pass modal, toggle admission status, edit details, or delete records.
  - **CSV Export**: 1-click export of attendee data and attendance records.
- **Hierarchy Management**:
  - Visual hierarchy tree of Divisions, Sectors, and Units.
  - Add, edit, or delete any Division, Sector, or Unit.
  - **Bulk Import**: Paste CSV or JSON to bulk insert hierarchy rows (`Division, Sector, Unit`).
- **Event Branding Settings**:
  - Customize Event Title, Subtitle, Date, Venue, and contact details in real-time.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ or v20+; fully tested on Node.js v25)
- npm

### Installation
All dependencies are already installed in this directory. If running on a new machine:
```bash
npm install
```

### Build & Run
To build the frontend and launch the unified production server:
```bash
npm run serve
```
Or start the server directly (dist is pre-compiled):
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:5050
```

---

## 🔑 Default Administrator Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| Super Administrator | `emcadmin` | `emcsadmin` | Full Dashboard, Hierarchy Management, CSV Export, Event Settings |
| Sub-Administrator | `cmsadmin` | `passcmseast` | Overview & Analytics, Attendee Directory |
| Gate Coordinator | *Public Portal* | *No password required* | Gate Scanner tab accessible to on-ground volunteers |

---

## 🏗️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Canvas-Confetti, jsPDF, html2canvas, html5-qrcode.
- **Backend**: Express.js, Node.js SQLite (`node:sqlite`), JSON Web Tokens (JWT), bcryptjs, qrcode.
- **Database**: Embedded SQLite database (`data/conference.db`) with WAL mode and atomic transactions.
