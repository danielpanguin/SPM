# 🧠 SPM — Smart Task Management System  
*A Software Project Management Coursework Project (IS212 AY 2025/26 T1, SMU)*  

---

## 📘 Overview  
The Smart Task Management System (SPM) is developed for *All-In-One Pte Ltd*, a digital-transformation company aiming to enhance productivity across its regional workforce.  
This repository contains the first software release (Week 12) built using the scrum process, implementing the core functionality areas defined by the customer briefing and change documents.

> 💡 *This release demonstrates the foundation of a scalable, secure, and collaborative task-management platform for staff, managers, and HR users.*

---

## 🚀 First Release – Core Functionality  

| # | Functionality Area | Description |
|:-:|--------------------|--------------|
| 1 | User Authorisation & Authentication | Secure role-based access using Supabase Auth. Users (Staff, Manager, Director, HR) log in to view and perform actions appropriate to their role. Data access protected via Row-Level Security (RLS). |
| 2 | Task Management + Recurring Tasks | Create, view, update, and assign tasks/subtasks (stand-alone or project-based). Managers can delegate tasks. Supports deadlines, notes, collaborators, and status tracking. Recurring Tasks auto-generate routine tasks after completion. |
| 3 | Task Grouping & Organisation + Priority Buckets | Group tasks under projects for clarity. Each task has a Priority Bucket (1 – 10) to indicate importance; editable after creation. |
| 4 | Deadline & Schedule Tracking | Attach due dates, visualize timelines (Gantt view), and highlight overdue items. Automated reminders help users stay on track. |
| 5 | Notification System (email & in-app) | Alerts users about new assignments, approaching deadlines, and task updates via Supabase Realtime and Gmail API. |
| 6 | Report Generation & Exporting | Generate project reports summarizing completed, in-progress, and under-review tasks. Export as PDF or CSV. |

---

## 🧩 System Architecture  

- Frontend: Next.js 15 (App Router, TypeScript, React 19)  
- Backend: Supabase (Database, Auth, Storage, Realtime)  
- Notifications: Supabase Realtime + Cron Jobs  
- Storage: Supabase Storage Bucket attachments with RLS policies  
- Email Service: Nodemailer / Gmail API  
- Testing: Jest + React Testing Library

---

## ⚙️ Getting Started  

Below are the full setup and bash commands needed to run the app locally.

### 🧱 Prerequisites  
- Node v18 or newer  
- npm or pnpm  
- Supabase project (URL + keys)

---

### 🧾 Environment Variables  

Create a `.env.local` file in your project root and paste the following (replace placeholders with your values):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

GMAIL_ADDRESS=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password

---

# ▶️ Setup and Run Commands

# Install dependencies:
npm install
npm i @supabase/ssr @supabase/supabase-js

# Start development server:
npm run dev

# Then open your browser and visit:
# http://localhost:3000


# 🗄️ Database & Storage Setup

# 1️⃣ Run SQL migrations:
# Run each SQL file manually or via Supabase SQL editor
# Folder: /supabase_migrations/

# 2️⃣ Ensure Row-Level Security (RLS) is enabled for the attachments bucket.
# (No command here — configure in Supabase dashboard / SQL policies.)

# 3️⃣ Run storage setup script:
node scripts/setup-supabase-storage.js

# This creates the required bucket, permissions, and RLS policies automatically.


# 🧪 Testing

# Run all test suites:
npm test

# This includes:
# - Unit tests for Auth, Task CRUD, and Reports
# - Integration tests for filters & notifications
# - End-to-End tests for Staff and Manager workflows


# 🧱 Scrum Process Summary
# This project follows the Scrum framework taught in IS212.
# Sprints: 4 total (2 weeks each)
# Velocity: ~12 User Story Points per member per week
# Artifacts: Product Backlog, Sprint Backlogs, Burndown Charts, Retrospectives, and Meeting Recordings
# Continuous Integration: Tests and deployments automated via npm scripts and GitHub repository


# 🔮 Future Enhancements (Backlog Beyond Release 1)
# - Activity Tracking & History
# - User Roles and Management
# - Dashboard and Insights
# - Calendar Integration
# - Focus Timer and Time Logging
# - User Personalisation Settings


# 👩‍💻 Contributors
# Team SPM — School of Computing and Information Systems, Singapore Management University

# Our team practised rotating Scrum roles across sprints to ensure shared ownership and cross-functional learning.

# Name                     Role(s)
# (Name 1)                 Sprint 1–2: Scrum Master | Sprint 3–4: Developer
# (Name 2)                 Sprint 1–2: Developer | Sprint 3–4: Product Owner
# (Name 3)                 Sprint 1–2: Developer | Sprint 3–4: Tester
# (Name 4)                 Sprint 1–2: Tester | Sprint 3–4: Developer
# (Name 5)                 Sprint 1–2: Product Owner | Sprint 3–4: Scrum Master


