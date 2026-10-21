# 🚀 Vercel Deployment Guide for LeaveLink (TechTimeOff)

This project is configured for seamless deployment on **Vercel** with full support for:
- ⚡ **Vite + React SPA Frontend**
- 🐍 **Flask Python Serverless API Backend** (routes `/api/*`)

---

## 📋 Quick Deployment Steps

### 1. Import Repository into Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New" -> "Project"**.
2. Import your GitHub repository: `Harsimar08/LeaveLink`.
3. Select **Vite** as the Framework Preset (Vercel will auto-detect `npm run build` and `dist` directory).

---

### 2. Configure Environment Variables in Vercel
In the Vercel Project Settings under **Environment Variables**, add the following:

#### Required Backend & Security Variables:
- `DATABASE_URL`: `mysql+pymysql://<user>:<password>@<cloud-db-host>:3306/<database>` (or PostgreSQL connection string if using Supabase/Neon/Railway).
- `SECRET_KEY`: A strong random string for Flask session security.
- `JWT_SECRET`: A strong random string for JWT token authentication.
- `FRONTEND_URL`: Your deployed Vercel URL (e.g., `https://leavelink.vercel.app`).

#### Optional Google OAuth Variables (if using Google Login):
- `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.

#### Email Notification Variables (leave request emails):
- `SMTP_HOST`: Mail server, e.g. `smtp.gmail.com`.
- `SMTP_PORT`: `587` (STARTTLS) or `465` (SSL). Defaults to `587`.
- `SMTP_USER`: The sending mailbox, e.g. `leavelink.jims@gmail.com`.
- `SMTP_PASSWORD`: Its password. For Gmail this must be an **App Password** (Google Account → Security → 2-Step Verification → App passwords), not the normal password.
- `MAIL_FROM` (optional): Sender address if different from `SMTP_USER`.
- `MAIL_FROM_NAME` (optional): Sender name. Defaults to `LeaveLink`.
- `APP_URL` (optional): Site address used in the "Action Required – Review Leave Request" link. On Vercel it defaults to the address the request came from.

If the SMTP variables are missing, leaves still work and the server log shows `[MAIL] SMTP is not configured`.

---

### 3. Deploy!
Click **"Deploy"**. Vercel will:
1. Build the Vite React frontend into `dist/`.
2. Package the Flask backend serverless functions in `api/index.py`.
3. Provision your deployment at `https://<your-project-name>.vercel.app`.

---

## 🛠️ Configuration Details

- **`vercel.json`**: Configures rewrite rules so that:
  - Any request to `/api/*` is handled by the Flask serverless backend (`api/index.py`).
  - All application routes (e.g. `/login`, `/dashboard`, `/profile`) are handled by React Router (`/index.html`).
- **`requirements.txt`**: Contains Python dependencies required for the serverless backend.
- **`api/index.py`**: Serverless entry point exposing the Flask application to Vercel.

---

## 🔍 Database Recommendations for Vercel
Since Vercel serverless functions are stateless, a cloud database is **required** for logins and leaves to be shared between devices:
- Easiest: Vercel Dashboard → your project → **Storage** → **Create Database** → **Neon (Postgres)** → connect it to the project. This injects `DATABASE_URL` automatically.
- Any cloud MySQL (e.g. **Aiven**, **Railway**, **AWS RDS**) or PostgreSQL (e.g. **Supabase**, **Neon**) also works. The backend reads `DATABASE_URL`, then `POSTGRES_URL`, then `MYSQL_URL`. Neon/Supabase URLs with `?sslmode=require` can be pasted as-is.
- Redeploy after adding the variable, then open `/api/health`: it must report `"sharedDatabase": true`.

Without a cloud database every serverless instance uses its own temporary SQLite file. `/api/health` then reports `"status": "degraded"`, accounts disappear on cold starts, and users are asked to log in again whenever their request reaches a different instance.

Uploaded holiday PDFs and leave attachments are stored in the database (max 4 MB per file), so they are visible from every device.
