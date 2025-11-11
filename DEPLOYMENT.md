# Frontend Deployment Guide

## ✅ Backend URLs Configured

Your frontend is now configured to connect to:
- **Node.js Backend (Render)**: `https://backend-nodejs-amms.onrender.com`
- **Python Backend (Railway)**: `https://backendpython-production-0ade.up.railway.app`

## 🚀 Deploy to Vercel (Recommended)

### Step 1: Push to GitHub
```bash
cd frontend
git add .
git commit -m "Updated backend URLs for production"
git push
```

### Step 2: Deploy on Vercel
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if in monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Environment Variables
Add these in Vercel dashboard:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://backend-nodejs-amms.onrender.com` |
| `VITE_PYTHON_API_URL` | `https://backendpython-production-0ade.up.railway.app` |

### Step 4: Deploy
- Click "Deploy"
- Wait 2-3 minutes
- Your app will be live at: `https://your-app.vercel.app`

## 🎯 Alternative: Deploy to Netlify

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy on Netlify
1. Go to https://netlify.com
2. Sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

### Step 3: Environment Variables
Go to Site settings → Environment variables:

```
VITE_API_URL=https://backend-nodejs-amms.onrender.com
VITE_PYTHON_API_URL=https://backendpython-production-0ade.up.railway.app
```

### Step 4: Deploy
- Click "Deploy site"
- Your app will be live at: `https://your-app.netlify.app`

## 🧪 Test Locally with Production URLs

Before deploying, test with production backends:

```bash
cd frontend

# Create .env.local for testing
echo "VITE_API_URL=https://backend-nodejs-amms.onrender.com" > .env.local
echo "VITE_PYTHON_API_URL=https://backendpython-production-0ade.up.railway.app" >> .env.local

# Run dev server
npm run dev
```

Open http://localhost:5173 and verify:
- ✅ Passengers load from Render backend
- ✅ Stats display correctly
- ✅ Trips show up
- ✅ No CORS errors in console

## 📋 CORS Configuration

If you get CORS errors, update the Node.js backend `server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://your-app.vercel.app',  // Add your Vercel URL
  'https://your-app.netlify.app', // Add your Netlify URL
  process.env.FRONTEND_URL,
].filter(Boolean);
```

Then redeploy the backend.

## 🏗️ Complete Architecture

```
┌─────────────┐
│ ESP32 Boards│
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│ Python Backend (Railway)        │
│ backendpython-production-0ade   │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────┐
│ MongoDB Atlas   │
└──────┬──────────┘
       │
       ↓
┌─────────────────────────────────┐
│ Node.js Backend (Render)        │
│ backend-nodejs-amms             │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│ Frontend (Vercel/Netlify)       │
│ your-app.vercel.app             │
└─────────────────────────────────┘
```

## 🔍 Troubleshooting

### CORS Errors
- Add your frontend URL to backend's `allowedOrigins`
- Redeploy backend after changes

### API Not Loading
- Check browser console for errors
- Verify environment variables in Vercel/Netlify
- Test backend URLs directly in browser

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

## ✅ Deployment Checklist

- [ ] Backend URLs updated in `.env.production`
- [ ] Code pushed to GitHub
- [ ] Vercel/Netlify project created
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Site is live
- [ ] Test all features work
- [ ] No CORS errors
- [ ] Update backend CORS if needed

## 🎉 Success!

Once deployed, your complete Bus Passenger Tracking System will be live:
- ✅ ESP32 devices → Python backend (face recognition)
- ✅ Python backend → MongoDB (data storage)
- ✅ Node.js backend → API & data management
- ✅ Frontend → User interface

All components working together! 🚀
