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
Since Vercel serverless functions are stateless:
- Use a cloud-hosted MySQL/MariaDB database (e.g. **PlanetScale**, **Aiven**, **Railway**, **AWS RDS**) or PostgreSQL (e.g. **Supabase**, **Neon**).
- Set the connection string in the `DATABASE_URL` environment variable on Vercel.
