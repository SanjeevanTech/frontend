# 🔗 Backend URLs Configuration

## ✅ Your Deployed Backends

### Node.js Backend (Render)
- **URL**: `https://backend-nodejs-amms.onrender.com`
- **Purpose**: Main API server for MongoDB operations
- **Endpoints**:
  - `/api/passengers` - Get passengers
  - `/api/trips` - Get trips
  - `/api/stats` - Get statistics
  - `/api/unmatched` - Get unmatched passengers
  - `/api/fare/*` - Fare management
  - `/api/season-ticket/*` - Season ticket management
  - `/api/bus-routes/*` - Bus route management
  - `/api/python-stats` - Proxy to Python backend

### Python Backend (Railway)
- **URL**: `https://backendpython-production-0ade.up.railway.app`
- **Purpose**: Face recognition & ESP32 integration
- **Endpoints**:
  - `/status` - Server status
  - `/trip` - Current trip info
  - `/passengers` - Passenger list
  - `/face-log` - ESP32 face detection (POST)
  - `/api/power-config` - Power management
  - `/api/schedule` - Bus schedule

## 📝 Environment Files Updated

### `.env.production` (For Production Build)
```env
VITE_API_URL=https://backend-nodejs-amms.onrender.com
VITE_PYTHON_API_URL=https://backendpython-production-0ade.up.railway.app
```

### `.env.development` (For Local Development)
```env
VITE_API_URL=http://localhost:5000
VITE_PYTHON_API_URL=http://192.168.8.102:8888
```

## 🧪 Quick Test

Test if backends are working:

```bash
# Test Node.js backend
curl https://backend-nodejs-amms.onrender.com/api/passengers

# Test Python backend
curl https://backendpython-production-0ade.up.railway.app/status
```

## 🚀 Next Steps

1. **Test locally with production URLs**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Deploy to Vercel**:
   - Push to GitHub
   - Import project in Vercel
   - Add environment variables
   - Deploy!

3. **Update CORS** (if needed):
   - Add your Vercel URL to backend's allowed origins
   - Redeploy backend

## 📊 Data Flow

```
User Browser (Frontend)
    ↓
    ├─→ Node.js Backend (Render) ─→ MongoDB
    │   • Passengers
    │   • Trips
    │   • Stats
    │
    └─→ Python Backend (Railway) ─→ MongoDB
        • Real-time status
        • Power config
        • Face detection
```

## 🔒 Security Notes

- All connections use HTTPS
- CORS configured for security
- Environment variables keep URLs configurable
- No sensitive data in frontend code

## ✅ Status

- [x] Node.js Backend: **LIVE** ✅
- [x] Python Backend: **LIVE** ✅
- [x] MongoDB: **Connected** ✅
- [x] Frontend Config: **Updated** ✅
- [ ] Frontend: **Ready to Deploy** 📦

---

**Ready to deploy your frontend!** Follow `DEPLOY_CHECKLIST.md` for step-by-step instructions.
