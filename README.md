# USC Management Portal
This project is an implementation of an innovative RFID-based vehicular access system at the University of San Carlos.

## 🎯 Project Overview

**Purpose:** SThe system enables administrators to manage vehicle and user information, security personnel to monitor logs and issue violations, and students and faculty to review their vehicle records.

**Target Users:**
- **Security Guards** - Create and manage violations in the field
- **Carolinians** (Students/Faculty) - View violations and submit appeals with evidence
- **Administrators** - Review appeals, manage users, and analyze violation data

## ✨ Key Features

### For Security Guards
- 📝 Create violations with photo evidence
- 🚗 Link violations to registered vehicles
- 📍 Record location and violation details
- 📱 Mobile-responsive interface for field use

### For Carolinians (Students/Faculty)
- 👁️ View current and historical violations
- ⚖️ Submit appeals with supporting evidence
- 📎 Upload multiple files (images, PDFs, documents)
- 📨 Receive admin decisions with detailed feedback
- 📊 Track appeal status in real-time

### For Administrators
- 📊 Real-time analytics dashboard with charts
- 📈 Violation trends and metrics
- 🔍 Review and process appeals
- 👥 User management system
- 📋 Export reports (CSV/Excel/PDF)
- 🎫 RFID tag management

## 🏗️ Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19
- **Backend:** Next.js API Routes
- **Database:** MySQL 8.0
- **Authentication:** Custom session-based auth with bcrypt
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts + Chart.js
- **File Handling:** Multer
- **Export:** ExcelJS, jsPDF, csv-writer

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn
- Git

## 📁 Project Structure

```
management-portal/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── admin/                # Admin dashboard & management
│   │   ├── carolinian/           # Student/Faculty portal
│   │   ├── security/             # Security guard interface
│   │   ├── api/                  # API routes
│   │   │   ├── auth/             # Authentication endpoints
│   │   │   ├── violations/       # Violation management
│   │   │   ├── analytics/        # Dashboard metrics
│   │   │   └── reports/          # Export functionality
│   │   ├── components/           # Reusable React components
│   │   └── login/                # Login page
│   ├── lib/                      # Utility libraries
│   │   ├── database.js           # MySQL connection pool
│   │   ├── auth.js               # Authentication helpers
│   │   ├── migrations/           # Database migrations
│   │   └── init-database.js      # Database initialization
│   └── middleware.js             # Route protection middleware
├── public/
│   └── images/                   # Static assets (USC logos, backgrounds)
├── scripts/                      # Migration runner scripts
├── .env.local                    # Environment variables (create this)
├── next.config.mjs               # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── package.json                  # Dependencies
```
## 📦 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📄 License

This project is developed as part of a thesis requirement for Computer Engineering at the University of San Carlos.

**Built with 💚💛 for 🔰USC🔰**
