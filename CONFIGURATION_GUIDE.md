# ⚙️ CaseSwift Configuration Guide

## Overview
CaseSwift uses environment variables to configure API endpoints and service URLs. This allows you to easily switch between local development and production deployment (including ngrok tunnels).

---

## 📁 Environment Files

### Frontend (.env)
Location: `frontend/.env`

```env
# Node.js Backend API
VITE_NODE_API_URL=http://localhost:3001

# Python AI API (FastAPI + Ollama)
VITE_AI_API_URL=http://localhost:8000

# Legacy/Compatibility
VITE_API_BASE_URL=https://1729c7d01b18.ngrok-free.app
NGROK_API_URL=http://1729c7d01b18.ngrok-free.app
```

### Backend Python (.env)
Location: `ChatBot/.env`

```env
# AI API Configuration
AI_API_URL=http://localhost:8000
AI_API_NGROK_URL=

# LLM Model Configuration
OLLAMA_MODEL=huihui_ai/llama3.2-abliterate:latest
EMBEDDING_MODEL=mixedbread-ai/mxbai-embed-large-v1

# Database
CHROMA_PERSIST_DIRECTORY=./document_store

# Server Configuration
PORT=8000
```

---

## 🌐 Using ngrok for AI API

When you want to expose your AI API (running on port 8000) via ngrok:

### Step 1: Start ngrok tunnel
```powershell
ngrok http 8000
```

You'll get output like:
```
Forwarding  https://abc123xyz.ngrok-free.app -> http://localhost:8000
```

### Step 2: Update Frontend .env
```env
# frontend/.env
VITE_AI_API_URL=https://abc123xyz.ngrok-free.app
```

### Step 3: Restart Frontend
```powershell
cd frontend
npm run dev
```

**Important:** Every time ngrok restarts, you get a new URL. Update `.env` accordingly.

---

## 🔧 Configuration Scenarios

### Scenario 1: Local Development (Default)
**Setup:** Everything running locally on your machine.

**Frontend `.env`:**
```env
VITE_NODE_API_URL=http://localhost:3001
VITE_AI_API_URL=http://localhost:8000
```

**Backend `.env`:**
```env
AI_API_URL=http://localhost:8000
PORT=8000
```

**Commands:**
```powershell
# Terminal 1: Start AI API
cd ChatBot
uvicorn api:app --reload --port 8000

# Terminal 2: Start Node Backend
cd backend
npm start

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

---

### Scenario 2: AI API via ngrok
**Setup:** AI API exposed via ngrok for remote testing/demo.

**Frontend `.env`:**
```env
VITE_NODE_API_URL=http://localhost:3001
VITE_AI_API_URL=https://abc123xyz.ngrok-free.app
```

**Commands:**
```powershell
# Terminal 1: Start ngrok
ngrok http 8000

# Terminal 2: Start AI API (locally)
cd ChatBot
uvicorn api:app --reload --port 8000

# Terminal 3: Start Node Backend
cd backend
npm start

# Terminal 4: Start Frontend
cd frontend
npm run dev
```

---

### Scenario 3: Production Deployment
**Setup:** All services deployed to production servers.

**Frontend `.env`:**
```env
VITE_NODE_API_URL=https://api.caseswift.com
VITE_AI_API_URL=https://ai.caseswift.com
```

**Backend `.env`:**
```env
AI_API_URL=https://ai.caseswift.com
PORT=8000
```

---

## 📝 Environment Variable Reference

### Frontend Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_NODE_API_URL` | Node.js backend for case management | `http://localhost:3001` |
| `VITE_AI_API_URL` | Python AI API for LLM features | `http://localhost:8000` |
| `VITE_API_BASE_URL` | Legacy compatibility | `http://localhost:3001` |
| `NGROK_API_URL` | Legacy ngrok URL | `https://xyz.ngrok-free.app` |

**Note:** All frontend env vars must start with `VITE_` to be accessible in the React app.

### Backend Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AI_API_URL` | Local AI API URL | `http://localhost:8000` |
| `AI_API_NGROK_URL` | ngrok tunnel URL (optional) | `https://xyz.ngrok-free.app` |
| `OLLAMA_MODEL` | LLM model name | `huihui_ai/llama3.2-abliterate:latest` |
| `EMBEDDING_MODEL` | Embedding model | `mixedbread-ai/mxbai-embed-large-v1` |
| `CHROMA_PERSIST_DIRECTORY` | Vector DB location | `./document_store` |
| `PORT` | Server port | `8000` |

---

## 🔍 Verifying Configuration

### Check Frontend Config
```powershell
cd frontend
npm run dev
```

Open browser console and check:
```javascript
console.log(import.meta.env.VITE_AI_API_URL)
// Should output: http://localhost:8000 or your ngrok URL
```

### Check Backend Config
```powershell
cd ChatBot
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(f'AI API URL: {os.getenv(\"AI_API_URL\", \"Not set\")}')"
```

---

## 🐛 Troubleshooting

### Problem: Frontend can't connect to AI API

**Symptoms:**
- "Network Error" in browser console
- AI features not working
- Checklist generation fails

**Solution:**
1. Check `VITE_AI_API_URL` in `frontend/.env`
2. Verify AI API is running: `curl http://localhost:8000/` (or your ngrok URL)
3. Check browser console for CORS errors
4. Restart frontend dev server after changing `.env`

### Problem: ngrok URL keeps changing

**Symptoms:**
- Works initially, then stops after ngrok restart
- Need to update config frequently

**Solutions:**
1. **Free ngrok:** Update `.env` each time ngrok restarts
2. **Paid ngrok:** Use a static domain (no updates needed)
3. **Alternative:** Use a VPS with fixed IP instead of ngrok

### Problem: Environment variables not loading

**Symptoms:**
- `undefined` when accessing env vars
- Features using default values

**Solutions:**
1. Ensure `.env` file exists in correct directory
2. Frontend vars must start with `VITE_`
3. Restart dev servers after changing `.env`
4. Check for typos in variable names

---

## 🔐 Security Best Practices

### For Development:
- ✅ Use `.env` files (already in `.gitignore`)
- ✅ Never commit `.env` to git
- ✅ Use `.env.example` for templates

### For Production:
- ✅ Use environment variables from hosting platform
- ✅ Enable HTTPS for all APIs
- ✅ Restrict CORS to specific domains
- ✅ Use API keys/authentication
- ✅ Rate limit API endpoints

---

## 📦 Deployment Checklist

### Pre-Deployment:
- [ ] Test all env vars locally
- [ ] Verify ngrok tunnel (if using)
- [ ] Check CORS configuration
- [ ] Test API connectivity

### Deployment:
- [ ] Set production env vars
- [ ] Update frontend API URLs
- [ ] Build frontend: `npm run build`
- [ ] Deploy services
- [ ] Test end-to-end

### Post-Deployment:
- [ ] Monitor logs for errors
- [ ] Test AI features
- [ ] Verify API response times
- [ ] Check error handling

---

## 🎯 Quick Reference Commands

### Start Everything Locally:
```powershell
# Terminal 1
cd ChatBot && uvicorn api:app --reload --port 8000

# Terminal 2
cd backend && npm start

# Terminal 3
cd frontend && npm run dev
```

### Start with ngrok:
```powershell
# Terminal 1
ngrok http 8000

# Terminal 2 (update .env with ngrok URL first!)
cd ChatBot && uvicorn api:app --reload --port 8000

# Terminal 3
cd backend && npm start

# Terminal 4
cd frontend && npm run dev
```

### Test AI API:
```powershell
# Local
curl http://localhost:8000/

# ngrok
curl https://your-ngrok-url.ngrok-free.app/
```

---

## 📞 Support

If you encounter configuration issues:
1. Check this guide first
2. Review error messages in console/logs
3. Verify all services are running
4. Check network connectivity
5. Contact: team@equinox.dev

---

**Remember:** After any `.env` change, always restart the affected service!
