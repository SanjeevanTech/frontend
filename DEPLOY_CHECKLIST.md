# ✅ Frontend Deployment Checklist

## Pre-Deployment

- [x] Backend URLs updated in `.env.production`
  - Node.js: `https://backend-nodejs-amms.onrender.com`
  - Python: `https://backendpython-production-0ade.up.railway.app`

## Step 1: Test Locally with Production URLs ⬜

```bash
cd frontend

# Create .env.local
echo "VITE_API_URL=https://backend-nodejs-amms.onrender.com" > .env.local
echo "VITE_PYTHON_API_URL=https://backendpython-production-0ade.up.railway.app" >> .env.local

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open http://localhost:5173 and verify:
- [ ] Passengers load correctly
- [ ] Stats display
- [ ] Trips show up
- [ ] No console errors
- [ ] No CORS errors

## Step 2: Push to GitHub ⬜

```bash
git add .
git commit -m "Updated backend URLs for production deployment"
git push
```

## Step 3: Deploy to Vercel ⬜

### Option A: Using Vercel CLI (Quick)
```bash
npm install -g vercel
cd frontend
vercel
```

### Option B: Using Vercel Dashboard
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework: **Vite**
   - Root Directory: **frontend** (if monorepo)
   - Build Command: **npm run build**
   - Output Directory: **dist**
5. Add Environment Variables:
   ```
   VITE_API_URL=https://backend-nodejs-amms.onrender.com
   VITE_PYTHON_API_URL=https://backendpython-production-0ade.up.railway.app
   ```
6. Click **Deploy**

## Step 4: Test Deployed Site ⬜

Once deployed, test your live site:

```bash
# Replace YOUR_VERCEL_URL with your actual URL
curl https://YOUR_VERCEL_URL
```

In browser, check:
- [ ] Site loads
- [ ] Passengers display
- [ ] Stats work
- [ ] Date filter works
- [ ] Trip selector works
- [ ] All tabs functional
- [ ] No CORS errors

## Step 5: Update Backend CORS (If Needed) ⬜

If you get CORS errors, update `backend-nodejs/server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://YOUR_VERCEL_URL.vercel.app',  // Add your URL here
  process.env.FRONTEND_URL,
].filter(Boolean);
```

Then:
```bash
cd backend-nodejs
git add .
git commit -m "Added frontend URL to CORS"
git push
```

Render will auto-redeploy.

## 🎉 Deployment Complete!

Your URLs:
- **Frontend**: `https://__________.vercel.app`
- **Node.js Backend**: `https://backend-nodejs-amms.onrender.com`
- **Python Backend**: `https://backendpython-production-0ade.up.railway.app`

## 📊 Final Architecture

```
ESP32 → Python (Railway) → MongoDB ← Node.js (Render) ← Frontend (Vercel)
         ✅ LIVE              ✅         ✅ LIVE           📦 DEPLOYING
```

## 🔧 Post-Deployment

- [ ] Share frontend URL with team
- [ ] Update ESP32 devices with backend URLs
- [ ] Monitor Vercel analytics
- [ ] Check backend logs for errors
- [ ] Set up custom domain (optional)

---

**Need help?** Check `DEPLOYMENT.md` for detailed instructions!
