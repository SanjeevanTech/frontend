# 🔧 Axios Configuration Fix

## Problem
Frontend was using relative paths (`/api/passengers`) which worked in development through Vite's proxy, but failed in production on Vercel because there's no proxy server.

## Solution
Created a centralized axios instance with the backend URL configured from environment variables.

## Changes Made

### 1. Created `src/utils/axios.js`
- Configured axios with `VITE_API_URL` from environment
- Added request/response interceptors for debugging
- Set 30-second timeout
- Proper error handling

### 2. Updated All Components
Updated these files to use `import axios from '../utils/axios'`:
- ✅ `src/App.jsx`
- ✅ `src/components/UnmatchedPassengers.jsx`
- ✅ `src/components/ScheduleAdmin.jsx`
- ✅ `src/components/WaypointGroupManagement.jsx`
- ✅ `src/components/SeasonTicketManagement.jsx`
- ✅ `src/components/RouteManagement.jsx`
- ✅ `src/components/FareAdmin.jsx`
- ✅ `src/components/BusSelector.jsx`
- ✅ `src/components/TripManagement.jsx`

## How It Works

### Development (localhost)
```javascript
// Uses .env.development or .env.local
VITE_API_URL=https://backend-nodejs-amms.onrender.com
```

### Production (Vercel)
```javascript
// Uses .env.production or Vercel environment variables
VITE_API_URL=https://backend-nodejs-amms.onrender.com
```

## Testing

### 1. Test Locally
```bash
# Stop dev server (Ctrl+C)
npm run dev
# Check browser console for axios logs
```

### 2. Test on Vercel
After deploying:
1. Open browser console (F12)
2. Look for axios logs:
   - `🌐 API Request: GET /api/passengers`
   - `✅ API Response: /api/passengers 200`
3. If errors, check:
   - Environment variables in Vercel dashboard
   - CORS settings in backend

## Debugging

The axios instance includes console logs:
- `🌐 API Request:` - Shows outgoing requests
- `✅ API Response:` - Shows successful responses
- `❌ API Error:` - Shows failed requests with details

## Next Steps

1. **Restart dev server** to apply changes
2. **Test locally** - verify data loads
3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Fixed axios configuration for production"
   git push
   ```
4. **Redeploy on Vercel** - changes will auto-deploy
5. **Test production** - verify Vercel site works

## Verification Checklist

- [ ] Dev server restarted
- [ ] Passengers load locally
- [ ] Console shows axios logs
- [ ] No errors in console
- [ ] Code pushed to GitHub
- [ ] Vercel redeployed
- [ ] Production site loads data
- [ ] No CORS errors

## Common Issues

### Still getting errors?
1. Check Vercel environment variables are set
2. Verify backend URL is correct
3. Check backend CORS allows your Vercel URL
4. Look at browser console for specific errors

### CORS errors?
Add your Vercel URL to backend's `allowedOrigins` in `server.js`

---

**All axios imports updated!** Ready to redeploy to Vercel! 🚀
