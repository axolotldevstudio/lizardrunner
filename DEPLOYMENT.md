# Lizard Runner - Deployment Guide

## Architecture Overview

```
Player Browser
    ↓
Cloudflare Pages (Static Frontend)
    ↓
Firebase Authentication
    ↓
Northflank Node.js Server (Socket.IO Backend)
    ↓
Firebase Admin SDK
    ↓
Firebase Realtime Database
```

---

## Step 1: Repository Setup

### 1.1 Push Repository to GitHub

```bash
git init
git add .
git commit -m "Initial Lizard Runner commit"
git branch -M main
git remote add origin https://github.com/yourusername/lizardrunner.git
git push -u origin main
```

**Important:** Verify `.gitignore` includes:
- `.env` and environment files
- `**/service-account.json`
- `**/*-key.json`
- `firebase-debug.log`
- `node_modules/`

### 1.2 Verify No Secrets Committed

```bash
git log --all -p | grep -i "private_key\|PRIVATE_KEY\|service_account" || echo "No secrets found"
```

---

## Step 2: Frontend Deployment (Cloudflare Pages)

### 2.1 Create Cloudflare Pages Project

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select **Pages** from the sidebar
3. Click **Create a project**
4. Select **Connect to Git**
5. Authorize your GitHub account
6. Select your `lizardrunner` repository

### 2.2 Configure Build Settings

- **Production branch:** `main`
- **Build command:** (leave empty - static site)
- **Build output directory:** `/` (repository root)
- **Root directory:** `/` (default)

**Important:** Do NOT include `lizardserver/` in the frontend deployment.

### 2.3 Configure Environment Variables

In Cloudflare Pages project settings:

```
NORTHFLANK_BACKEND_URL = https://your-northflank-url.com
```

Or update `config.js` manually after deployment (see Step 6).

### 2.4 Deploy

Cloudflare will automatically deploy on push to `main`.

### 2.5 Obtain Frontend URL

After deployment, you'll receive:
```
https://your-game.pages.dev
```

**Document this URL** - you'll need it for Firebase and backend CORS.

---

## Step 3: Backend Deployment (Northflank)

### 3.1 Create Northflank Project

1. Go to [northflank.com](https://www.northflank.com/)
2. Sign up / log in
3. Create a new project named "lizard-runner-backend"

### 3.2 Create Node.js Service

1. **Name:** `lizard-runner-pvp-server`
2. **Source:** GitHub
3. **Repository:** `yourusername/lizardrunner`
4. **Branch:** `main`
5. **Root directory:** `lizardserver`

### 3.3 Configure Node.js Settings

- **Start command:**
  ```
  node server.js
  ```

- **Port:** (Let Northflank assign, or set to `3001` if possible)

- **Node version:** `18` or `20`

### 3.4 Add Northflank Environment Variables

Create secrets and environment variables in Northflank dashboard:

```
# Environment Variables
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-game.pages.dev,http://localhost:3000

# Secrets (copy from Firebase Service Account)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

**Get Firebase credentials from:**
- [Google Cloud Console](https://console.cloud.google.com)
- **Service Accounts**
- Select your Firebase project's service account
- Download JSON key
- Extract `project_id`, `client_email`, `private_key`

### 3.5 Deploy

Click **Deploy** and wait for build completion.

### 3.6 Obtain Backend URL

After deployment, Northflank provides:
```
https://your-lizard-runner.northflank.com
```

Or check the deployment details for the actual URL.

**Document this URL.**

---

## Step 4: Firebase Configuration

### 4.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: "Lizard Runner"
3. Enable Google Analytics (optional)

### 4.2 Enable Authentication

1. Go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password**
4. Click **Settings** (gear icon)
5. Go to **Authorized domains**
6. Add both domains:
   ```
   your-game.pages.dev
   localhost:3000
   ```

### 4.3 Create Realtime Database

1. Go to **Realtime Database**
2. Click **Create Database**
3. Start in **Test Mode** (for development)
4. Region: Choose closest to your users

**Important: Update security rules before production:**

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "singleplayer": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    },
    "multiplayer": {
      "matches": {
        ".read": true,
        ".write": "root.child('server').val() === true"
      },
      "leaderboard": {
        ".read": true,
        ".write": "root.child('server').val() === true"
      }
    }
  }
}
```

### 4.4 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Under "Your apps", select Web app
3. Copy the config object
4. Add to `firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

---

## Step 5: Update Frontend Configuration

### 5.1 Update `config.js`

```javascript
const CONFIG = (() => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Update with your Northflank URL
  const PRODUCTION_BACKEND_URL = 'https://your-lizard-runner.northflank.com';
  
  return {
    BACKEND_URL: isLocalhost 
      ? 'http://localhost:3001'
      : PRODUCTION_BACKEND_URL,
    // ... rest of config
  };
})();
```

### 5.2 Push to GitHub

```bash
git add config.js firebase.js
git commit -m "Add production configuration"
git push
```

Cloudflare Pages will auto-deploy.

---

## Step 6: Testing

### 6.1 Test Frontend

Visit `https://your-game.pages.dev` and verify:
- [ ] UI loads
- [ ] Authentication works
- [ ] Single-player gameplay works

### 6.2 Test Firebase Authentication

1. Sign up with a new email
2. Verify user appears in Firebase Console
3. Sign in with same credentials
4. Verify "currentUser" appears

### 6.3 Test Backend Connection

1. Open browser console
2. Verify no CORS errors
3. Click multiplayer → Connect
4. Verify connection success message

### 6.4 Test Multiplayer

1. Open TWO browser windows (incognito for different account)
2. Both connect to multiplayer
3. Both click "Find Match"
4. Verify match starts with both players
5. Verify game state updates

### 6.5 Test Reconnect

1. Start a multiplayer match
2. Close ONE browser window
3. Verify other player sees disconnection message
4. Verify match continues (or ends if only 1 player left)

### 6.6 Test Results Persistence

1. Complete a multiplayer match
2. Check Firebase Realtime Database
3. Verify match results saved
4. Verify stats updated

---

## Step 7: Production Checklist

- [ ] All tests passing
- [ ] No console errors in production
- [ ] HTTPS/WSS working for Socket.IO
- [ ] Firebase rules secure (not test mode)
- [ ] No hardcoded secrets in code
- [ ] Backend health endpoint working: `/health`
- [ ] Leaderboards updating correctly
- [ ] Score submissions authenticated
- [ ] Multiplayer results server-authoritative
- [ ] Reconnect working

---

## Troubleshooting

### Socket.IO Connection Failed

1. Check Northflank deployment is running: visit `https://your-url/health`
2. Verify `ALLOWED_ORIGINS` includes frontend domain
3. Check firewall/network allows WebSocket (WSS in production)
4. Verify backend URL in `config.js` is correct

### Firebase Authentication Not Working

1. Verify domain is in "Authorized domains" list
2. Check Firebase config in `firebase.js`
3. Verify Firebase project exists
4. Check browser console for Firebase errors

### Multiplayer Match Won't Start

1. Verify minimum 2 players in lobby
2. Check lobby countdown timer (should trigger after min players)
3. Check Northflank backend logs
4. Verify game.js and matchmaking.js are deployed

### Scores Not Saving

1. Verify user is authenticated
2. Check Firebase Realtime Database rules allow writes
3. Verify `fbSubmitScore()` is called after game ends
4. Check Firebase console for data in `/singleplayer/{uid}`

---

## Deployment Maintenance

### Monitoring

- **Northflank:** Check dashboard for CPU, memory, request metrics
- **Cloudflare Pages:** Check analytics for traffic/errors
- **Firebase:** Monitor database size and operations

### Updates

```bash
git pull origin main
git push  # Triggers automatic deployments
```

For backend changes, Northflank will redeploy automatically.

### Rolling Back

```bash
git revert <commit-hash>
git push  # Cloudflare and Northflank redeploy
```

---

## Security Reminders

- Never commit `.env` files
- Never commit Firebase service account keys
- Rotate Firebase keys periodically
- Monitor Firebase security rules
- Enable 2FA on GitHub, Firebase, Cloudflare, Northflank accounts
- Review CORS settings regularly

---

## Support

For issues:
1. Check backend logs on Northflank dashboard
2. Check browser console (F12) for client errors
3. Check Firebase console for data/rules errors
4. Check Cloudflare Pages build logs
