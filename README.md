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

