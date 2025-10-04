# 🚀 Quick Start Guide - CaseSwift AI Features

## Prerequisites Checklist
- [ ] Python 3.9 or higher installed
- [ ] Node.js 16 or higher installed  
- [ ] Ollama installed and running
- [ ] Git installed

---

## Step 1: Install Ollama & Download Model

### Install Ollama
**Windows:**
```powershell
# Download from: https://ollama.ai/download
# Run the installer
```

**Verify Installation:**
```powershell
ollama --version
```

### Download Required Model
```powershell
ollama pull huihui_ai/llama3.2-abliterate:latest
```

**Verify Model:**
```powershell
ollama list
```

---

## Step 2: Setup Backend (Python AI Server)

### Navigate to ChatBot directory
```powershell
cd ChatBot
```

### Configure Environment Variables
```powershell
# Copy the example .env file
cp .env.example .env

# Edit .env if needed (optional - defaults work for local setup)
# If using ngrok, set AI_API_NGROK_URL in .env
```

### Install Python Dependencies
```powershell
pip install fastapi uvicorn langchain langchain-chroma langchain-huggingface langchain-community pydantic python-dotenv
```

**Or use requirements file (if available):**
```powershell
pip install -r requirements.txt
```

### Start the FastAPI Server
```powershell
uvicorn api:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
--- Loading models and building all chains ---
--- Models loaded and all chains are ready ---
```

### Test Backend
Open browser: `http://localhost:8000/docs`

You should see the FastAPI Swagger documentation.

---

## Step 3: Setup Node.js Backend

### Navigate to backend directory
```powershell
cd ..\backend
```

### Install Node Dependencies
```powershell
npm install
```

### Start Node Server
```powershell
npm start
```

**Expected Output:**
```
🚀 CaseSwift Backend server running on port 3001
📁 Responses file: ...
📊 Health check: http://localhost:3001/api/health
```

---

## Step 4: Setup Frontend (React)

### Navigate to frontend directory
```powershell
cd ..\frontend
```

### Configure Environment Variables
```powershell
# The .env file should already exist
# Update it if you're using ngrok for AI API:

# Open .env and set:
# VITE_AI_API_URL=https://your-ngrok-url.ngrok-free.app
# (if AI is running on ngrok)
```

### Install Dependencies
```powershell
npm install
```

### Start Development Server
```powershell
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 5: Test the Application

### 1. Open Application
Navigate to: `http://localhost:5173`

### 2. Login (if required)
- Username: `admin`
- Password: `admin123`

### 3. Create a Test Case
1. Click "New Case"
2. Fill in details:
   - **Case ID:** TEST-001
   - **Victim Age:** 15 (for POCSO case) or 20 (for IPC case)
   - **Incident Details:** "Test incident description"
3. Submit

### 4. View AI Features
1. Go to Cases page
2. Click on your test case
3. Navigate through AI tabs:
   - **AI Checklist** - See generated investigation checklist
   - **Evidence Analysis** - Add evidence and analyze gaps
   - **Document Review** - Paste document content for quality check

---

## 🧪 Quick API Tests

### Test Checklist Generation
```powershell
curl -X POST http://localhost:8000/api/generate-checklist `
  -H "Content-Type: application/json" `
  -d '{\"case_id\":\"TEST-001\",\"case_type\":\"POCSO Case\",\"victim_age\":15,\"incident_details\":\"Test\",\"current_status\":\"Initial\"}'
```

### Test Next Action
```powershell
curl -X POST http://localhost:8000/api/next-action `
  -H "Content-Type: application/json" `
  -d '{\"case_id\":\"TEST-001\",\"case_type\":\"POCSO Case\",\"completed_steps\":[\"FIR\"],\"pending_steps\":[\"Medical\"]}'
```

### Test Evidence Gap Analysis
```powershell
curl -X POST http://localhost:8000/api/analyze-evidence-gaps `
  -H "Content-Type: application/json" `
  -d '{\"case_id\":\"TEST-001\",\"case_type\":\"POCSO Case\",\"evidence_list\":[\"Medical report\",\"Victim statement\"]}'
```

---

## 🐛 Common Issues & Solutions

### Issue: Ollama not found
**Solution:**
```powershell
# Check if Ollama is in PATH
ollama --version

# If not, add to PATH or use full path
# C:\Users\<YourName>\AppData\Local\Programs\Ollama\ollama.exe
```

### Issue: Port already in use
**Solution:**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue: AI chains not ready
**Solution:**
1. Wait 10-15 seconds after starting FastAPI server
2. Check Ollama is running: `ollama list`
3. Restart FastAPI server

### Issue: CORS errors in browser
**Solution:**
Check that `api.py` has:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Module not found errors
**Solution:**
```powershell
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

---

## 📊 System Requirements

### Minimum
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 10 GB free space
- **OS:** Windows 10/11, Linux, macOS

### Recommended
- **CPU:** 8 cores
- **RAM:** 16 GB
- **Storage:** 20 GB free space
- **GPU:** Optional (speeds up inference)

---

## 🎯 Quick Demo Script

### Scenario: POCSO Case Investigation

1. **Create Case**
   - Case ID: DEMO-POCSO-001
   - Victim Age: 14
   - Description: "Minor victim case requiring age determination"

2. **View AI Checklist**
   - Notice HIGH PRIORITY items:
     - Age determination
     - CWC notification
     - Medical exam within 24 hours

3. **Check Next Action**
   - AI recommends: "Obtain birth certificate for age proof"
   - Shows legal basis: POCSO Act Section 34

4. **Add Evidence**
   - Add items: "Medical report", "Victim statement"
   - Click "Analyze Evidence Gaps"
   - AI identifies: "Age proof missing - critical"

5. **Review Document**
   - Select "FIR" as document type
   - Paste sample FIR text
   - Click "AI Quality Check"
   - Review completeness and accuracy feedback

---

## ✅ Verification Checklist

- [ ] Ollama running and model downloaded
- [ ] FastAPI server running on port 8000
- [ ] Node.js backend running on port 3001
- [ ] React frontend running on port 5173
- [ ] Can create new case
- [ ] AI checklist generates successfully
- [ ] Next action recommendation works
- [ ] Evidence gap analysis works
- [ ] Document quality check works
- [ ] Chat modal opens and responds

---

## 📚 Next Steps

1. **Explore Features:**
   - Try different case types (POCSO vs IPC)
   - Test with various victim ages
   - Upload different document types

2. **Customize:**
   - Modify AI prompts in `api.py`
   - Adjust UI styling in CSS files
   - Add new document types

3. **Integrate:**
   - Connect to real case database
   - Add user authentication
   - Implement file uploads

---

## 🆘 Need Help?

**Check logs:**
```powershell
# FastAPI logs (in terminal where uvicorn is running)
# Node.js logs (in terminal where npm start is running)
# Browser console (F12 Developer Tools)
```

**Test individual components:**
1. API docs: `http://localhost:8000/docs`
2. Backend health: `http://localhost:3001/api/health`
3. Frontend: `http://localhost:5173`

---

## 🎉 Success!

If all steps completed successfully, you now have:
- ✅ AI-powered investigation checklists
- ✅ Smart next action recommendations
- ✅ Evidence gap analysis
- ✅ Document quality review
- ✅ Conversational AI assistant

**Start investigating smarter, not harder! 🚀**
