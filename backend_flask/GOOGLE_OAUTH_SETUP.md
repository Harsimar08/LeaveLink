# Google OAuth Setup Guide

Follow these steps to enable "Sign in with Google" for TechTimeOff.

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g. "TechTimeOff") and click **Create**

## 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in:
   - App name: `TechTimeOff`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue** through the scopes step (default is fine)
5. Add test users if in Testing mode (your email)

## 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `TechTimeOff Web`
5. **Authorized redirect URIs** – add:
   - `http://localhost:5000/api/auth/google/callback` (for local dev)
   - If deployed: `https://your-backend-domain.com/api/auth/google/callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## 4. Add Credentials to .env

Edit `backend_flask/.env` and set:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## 5. Restart the Backend

```bash
cd backend_flask
python app.py
```

## 6. Verify Setup

```bash
cd backend_flask
python test_oauth_setup.py
```

If all checks pass, Google Sign-In is ready. Test at http://localhost:5173/login

## Troubleshooting

- **Error 401: invalid_client** – Wrong or missing Client ID/Secret in .env
- **Error 400: redirect_uri_mismatch** – Add this EXACT URI in Google Console → Credentials → your OAuth client → Authorized redirect URIs:
  - `http://localhost:5000/api/auth/google/callback`
  - If still failing, also add: `http://127.0.0.1:5000/api/auth/google/callback`
- **Access blocked** – Add your email as a test user in OAuth consent screen (Testing mode)
