# 🚀 Quick Vercel Deployment Guide

## Step-by-Step Instructions

### 1️⃣ Push to GitHub
```bash
cd frontend
git add .
git commit -m "Ready for Vercel deployment"
git push
```

### 2️⃣ Go to Vercel
- Visit: **https://vercel.com**
- Sign in with GitHub
- Click **"Add New..."** → **"Project"**

### 3️⃣ Import Repository
- Find your repository
- Click **"Import"**

### 4️⃣ Configure Settings

**Framework Preset**: Vite ✅ (auto-detected)

**Root Directory**: 
- If frontend is in subfolder: `frontend`
- If in root: leave blank

**Build Settings**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 5️⃣ Environment Variables

Click **"Environment Variables"** and add:

```
VITE_API_URL=https://backend-nodejs-amms.onrender.com
VITE_PYTHON_API_URL=https://backendpython-production-0ade.up.railway.app
```

**Important**: Select "Production", "Preview", and "Development" for each variable!

### 6️⃣ Deploy
- Click **"Deploy"**
- Wait 2-3 minutes
- Get your URL: `https://your-project.vercel.app`

### 7️⃣ Test Deployment

Open your Vercel URL and verify:
- [ ] Site loads
- [ ] Passengers display
- [ ] Stats work
- [ ] Date filter works
- [ ] Trip selector works
- [ ] No CORS errors in console (F12)

### 8️⃣ Fix CORS (If Needed)

If you see CORS errors:

1. Copy your Vercel URL (e.g., `https://bus-tracking.vercel.app`)

2. Update `backend-nodejs/server.js`:
   ```javascript
   const allowedOrigins = [
     'http://localhost:5173',
     'http://localhost:3000',
     'https://bus-tracking.vercel.app',  // Add your URL here
     process.env.FRONTEND_URL,
   ].filter(Boolean);
   ```

3. Push to GitHub:
   ```bash
   cd backend-nodejs
   git add .
   git commit -m "Added Vercel URL to CORS"
   git push
   ```

4. Render will auto-redeploy (wait 2 minutes)

5. Refresh your Vercel site - CORS errors should be gone!

## 🎉 Success!

Your complete system is now live:

```
✅ ESP32 Devices
    ↓
✅ Python Backend (Railway)
    backendpython-production-0ade.up.railway.app
    ↓
✅ MongoDB Atlas
    ↓
✅ Node.js Backend (Render)
    backend-nodejs-amms.onrender.com
    ↓
✅ Frontend (Vercel)
    your-project.vercel.app
```

## 🔧 Troubleshooting

### Build Fails
- Check Vercel build logs
- Verify Node.js version (18+)
- Check environment variables are set

### CORS Errors
- Add Vercel URL to backend's `allowedOrigins`
- Make sure to redeploy backend after changes

### API Not Loading
- Check browser console for errors
- Verify environment variables in Vercel dashboard
- Test backend URLs directly

### Blank Page
- Check Vercel function logs
- Verify build output directory is `dist`
- Check for JavaScript errors in console

## 📝 Post-Deployment

- [ ] Share URL with team
- [ ] Set up custom domain (optional)
- [ ] Monitor Vercel analytics
- [ ] Update ESP32 devices with backend URLs
- [ ] Test all features thoroughly

## 🔗 Your URLs

- **Frontend**: `https://__________.vercel.app` (fill in after deployment)
- **Node.js Backend**: `https://backend-nodejs-amms.onrender.com`
- **Python Backend**: `https://backendpython-production-0ade.up.railway.app`

---

**Need help?** Check Vercel documentation: https://vercel.com/docs
