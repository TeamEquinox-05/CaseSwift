# 🚀 Pre-Demo Action Plan - CaseSwift

**Goal:** Ensure smooth, error-free demo presentation  
**Time Budget:** 30 minutes (quick fixes) or 3 hours (comprehensive)

---

## ⚡ QUICK WINS (30 Minutes) - DO THIS NOW

### Step 1: Clean Up Orphaned Code (5 min)
```powershell
# Navigate to ChatBot directory
cd ChatBot

# Delete the broken file
Remove-Item "api_endpoints_addition.py" -Force

# Verify it's gone
Get-ChildItem "api_endpoints_addition.py"  # Should error "Cannot find path"
```

**Why:** Removes 5 compilation errors from codebase, prevents confusion

---

### Step 2: Test Service Failure Scenarios (15 min)

#### Test 1: Ollama Crash
```powershell
# Terminal 1: Start backend
cd ChatBot
python api.py

# Terminal 2: Start frontend  
cd frontend
npm run dev

# Browser: Start a conversation, answer 2 questions
# Then in Terminal 3:
Stop-Process -Name "ollama" -Force

# Browser: Try to answer another question
# ✅ Expected: User-friendly error message
# ❌ If you see: Generic error or app crash
```

#### Test 2: MongoDB Connection
```powershell
# Check current MongoDB connection
cd ChatBot
python -c "from api import MONGODB_URI; print(MONGODB_URI)"

# ✅ Expected: Your connection string
# ❌ If blank: MongoDB not configured
```

#### Test 3: Data Persistence
```powershell
# Browser: 
# 1. Create new case
# 2. Answer 3 questions
# 3. Refresh browser (F5)
# 4. Go back to same case

# ✅ Expected: All 3 Q&As still there
# ❌ If gone: MongoDB save not working
```

---

### Step 3: Run Smoke Tests (10 min)

**Test Checklist:**
```
✅ [ ] Backend starts without errors
✅ [ ] Frontend starts without errors  
✅ [ ] Can create new case
✅ [ ] Conversational flow starts
✅ [ ] AI asks relevant questions
✅ [ ] Answers are processed (4 seconds)
✅ [ ] Extracted data appears below
✅ [ ] Data accumulates (no loss)
✅ [ ] Progress bar updates
✅ [ ] Can refresh without losing data
```

**If ANY test fails, STOP and investigate!**

---

## 🎯 ESSENTIAL FIXES (1 Hour) - DO BEFORE DEMO

### Fix 1: Improve MongoDB Error Handling (15 min)

**File:** `ChatBot/api.py` lines 40-68

**Change from:**
```python
try:
    db = client[MONGODB_DB]
    collection = db[MONGODB_COLLECTION]
except:
    pass  # ❌ Silent failure
```

**Change to:**
```python
try:
    db = client[MONGODB_DB]
    collection = db[MONGODB_COLLECTION]
    print(f"✅ MongoDB connected: {MONGODB_DB}.{MONGODB_COLLECTION}")
except Exception as e:
    print(f"⚠️  MongoDB connection failed: {e}")
    print(f"⚠️  Conversation persistence will NOT work!")
    print(f"⚠️  Please check your MONGODB_URI in .env")
    db = None
    collection = None
```

**Why:** Know immediately if MongoDB breaks, instead of discovering during demo

---

### Fix 2: Better Frontend Error Messages (30 min)

**File:** `frontend/src/components/ConversationalQuestioning.jsx` line ~279

**Replace the catch block:**
```javascript
} catch (error) {
  console.error('Error processing answer:', error);
  
  // Determine specific error type
  let errorMsg = '❌ ';
  let canRetry = false;
  
  if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
    errorMsg += 'Network connection lost. Please check your internet.';
    canRetry = true;
  } else if (error.response?.status === 503) {
    errorMsg += 'AI service unavailable. Please ensure Ollama is running: ollama serve';
  } else if (error.response?.status === 504) {
    errorMsg += 'AI response timeout. This may happen with complex questions. Try again.';
    canRetry = true;
  } else if (error.response?.status === 500) {
    errorMsg += `Server error: ${error.response?.data?.detail || 'Please contact support'}`;
  } else {
    errorMsg += `Error: ${error.message || 'Unknown error'}. Please try again.`;
    canRetry = true;
  }
  
  const errorMessage = {
    role: 'system',
    content: errorMsg,
    timestamp: new Date().toISOString(),
    isError: true  // Add flag for red styling
  };
  
  setMessages(prev => [...prev, errorMessage]);
  setIsProcessing(false);
  setProcessingStatus('');
  
  // Optional: Show retry button for recoverable errors
  if (canRetry) {
    // Add retry button to UI
  }
}
```

**Why:** User knows exactly what went wrong and how to fix it

---

### Fix 3: Add Service Health Check (15 min)

**File:** `ChatBot/api.py` (add new endpoint)

```python
@app.get("/api/health")
async def health_check():
    """Check if all required services are running"""
    health = {
        "status": "healthy",
        "services": {},
        "timestamp": datetime.now().isoformat()
    }
    
    # Check Ollama
    try:
        await ml_models["question_decider"].ainvoke({"test": "ping"})
        health["services"]["ollama"] = "✅ Running"
    except:
        health["services"]["ollama"] = "❌ Not responding"
        health["status"] = "degraded"
    
    # Check MongoDB
    if db is not None:
        try:
            db.command('ping')
            health["services"]["mongodb"] = "✅ Connected"
        except:
            health["services"]["mongodb"] = "❌ Connection failed"
            health["status"] = "degraded"
    else:
        health["services"]["mongodb"] = "❌ Not configured"
        health["status"] = "degraded"
    
    # Check Chroma
    if rag_ready:
        health["services"]["chroma"] = "✅ Ready"
    else:
        health["services"]["chroma"] = "⚠️  Not initialized"
    
    return health
```

**Test it:**
```powershell
# With all services running:
curl http://localhost:8000/api/health

# Should return:
# {
#   "status": "healthy",
#   "services": {
#     "ollama": "✅ Running",
#     "mongodb": "✅ Connected",
#     "chroma": "✅ Ready"
#   }
# }
```

**Why:** Quick way to verify everything is working before demo starts

---

## 🔍 COMPREHENSIVE ROBUSTNESS (3 Hours) - POST-DEMO

### Enhancement 1: MongoDB Retry Logic (45 min)

**File:** `frontend/src/components/ConversationalQuestioning.jsx`

Add retry mechanism for MongoDB saves:
```javascript
const saveWithRetry = async (url, data, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(url, data, { timeout: 5000 });
      console.log(`✅ Save successful (attempt ${attempt})`);
      return response;
    } catch (error) {
      console.warn(`⚠️  Save attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        // Last attempt failed - save to localStorage backup
        const backupKey = `case_backup_${caseId}_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(data));
        console.log(`💾 Saved backup to localStorage: ${backupKey}`);
        
        // Show user-friendly warning
        setMessages(prev => [...prev, {
          role: 'system',
          content: '⚠️  Unable to save to database. Your data is backed up locally. Please check your connection.',
          timestamp: new Date().toISOString(),
          isWarning: true
        }]);
        
        throw error;  // Re-throw so caller knows save failed
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Use in your MongoDB save calls:
await saveWithRetry(
  `${MONGODB_API_URL}/api/cases/${caseId}/conversation/save`,
  { session_id: sessionId, conversation: messages, extracted_data: updatedExtractedData }
);
```

---

### Enhancement 2: Browser Tab Close Warning (10 min)

```javascript
// Add to ConversationalQuestioning.jsx
useEffect(() => {
  const handleBeforeUnload = (e) => {
    // Only warn if there's unsaved conversation data
    if (messages.length > 1 && !isComplete) {
      e.preventDefault();
      e.returnValue = 'You have an ongoing conversation. Closing this tab may lose unsaved data. Are you sure?';
      return e.returnValue;
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [messages, isComplete]);
```

---

### Enhancement 3: Rate Limiting & Spam Protection (30 min)

```javascript
// Add debouncing to prevent rapid submissions
const [lastSubmitTime, setLastSubmitTime] = useState(0);
const MIN_SUBMIT_INTERVAL = 2000; // 2 seconds between submissions

const handleSubmitAnswer = async () => {
  const now = Date.now();
  if (now - lastSubmitTime < MIN_SUBMIT_INTERVAL) {
    console.warn('⚠️  Please wait before submitting another answer');
    return;
  }
  
  setLastSubmitTime(now);
  
  // ... rest of submission logic ...
};
```

---

### Enhancement 4: Long Answer Handling (15 min)

```javascript
const MAX_ANSWER_LENGTH = 5000;  // ~1000 words
const WARN_ANSWER_LENGTH = 3000; // Warning threshold

// Add validation before submit
if (currentAnswer.length > MAX_ANSWER_LENGTH) {
  setMessages(prev => [...prev, {
    role: 'system',
    content: `❌ Answer too long (${currentAnswer.length} characters). Please break into smaller responses. Maximum: ${MAX_ANSWER_LENGTH} characters.`,
    timestamp: new Date().toISOString(),
    isError: true
  }]);
  return;
}

// Show warning for long answers
if (currentAnswer.length > WARN_ANSWER_LENGTH) {
  // Show yellow warning indicator
  setShowLengthWarning(true);
}
```

---

### Enhancement 5: Remove Debug Code (20 min)

**Files to clean:**
1. `frontend/src/App.jsx` - Remove DebugInfo component
2. `frontend/src/components/ConversationalQuestioning.jsx` - Remove console.log statements
3. `frontend/src/components/LoginForm.jsx` - Remove credential logging
4. `frontend/src/components/CaseAnalysisWithForms.jsx` - Remove debug logging

**Replace with environment-based logging:**
```javascript
const isDev = import.meta.env.DEV;

// Instead of: console.log('Debug info', data);
if (isDev) console.log('Debug info', data);

// Or create a logger utility:
const logger = {
  debug: (...args) => isDev && console.log('[DEBUG]', ...args),
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

// Usage:
logger.debug('Extracted data:', response.data);  // Only in dev
logger.info('Case created successfully');        // Always logged
```

---

## 📋 DEMO DAY CHECKLIST

### Morning of Demo (30 min before):

```powershell
# 1. Check Ollama is running
ollama list  # Should show llama3.2-abliterate

# 2. Start Ollama if not running
ollama serve

# 3. Test health endpoint
curl http://localhost:8000/api/health
# Should return all green ✅

# 4. Start backend
cd ChatBot
python api.py
# Should see "✅ MongoDB connected"

# 5. Start frontend
cd frontend
npm run dev
# Should start on http://localhost:5173

# 6. Quick smoke test
# - Create case
# - Answer 2 questions
# - Verify data appears
# - Verify speed (~4 seconds)

# 7. Prepare backup plan
# - Have MongoDB URI ready to reconfigure
# - Have Ollama model downloaded
# - Have backup demo video if all fails
```

---

### During Demo:

**If Ollama Crashes:**
```powershell
# Quick recovery (30 seconds)
ollama serve
# Wait for "Ollama is running"
# Continue demo - explain it's a local AI service dependency
```

**If MongoDB Disconnects:**
```
# User will see: "⚠️ Unable to save to database. Your data is backed up locally."
# Continue demo - data is still in browser memory
# Explain: "In production, we'd use redundant MongoDB clusters"
```

**If Browser Crashes:**
```
# Open new tab to http://localhost:5173
# Log in
# Go to same case - conversation should be restored from MongoDB
# Explain: "This demonstrates our auto-save feature"
```

---

## 🎯 PRIORITY RECOMMENDATIONS

### Must Do Before Demo:
1. ✅ Delete `api_endpoints_addition.py` (5 min)
2. ✅ Run smoke tests (10 min)
3. ✅ Test Ollama crash scenario (5 min)
4. ✅ Improve MongoDB error messages (15 min)

**Total: 35 minutes**

### Should Do Before Demo:
5. ✅ Better frontend error messages (30 min)
6. ✅ Add health check endpoint (15 min)
7. ✅ Test all failure scenarios (15 min)

**Total: 1 hour additional**

### Can Do After Demo:
8. ⏳ MongoDB retry logic (45 min)
9. ⏳ Tab close warning (10 min)
10. ⏳ Rate limiting (30 min)
11. ⏳ Remove debug code (20 min)

**Total: 1 hour 45 min additional**

---

## 🎉 CURRENT STATUS SUMMARY

**✅ Working Well:**
- Conversational AI questioning
- Smart data merging (no data loss)
- Parallel execution (4 second responses)
- MongoDB persistence
- Real-time progress tracking

**⚠️ Needs Attention:**
- Error handling when services crash
- User-friendly error messages
- Service health monitoring

**🎯 Demo Safety Level:**
- **Current:** 7/10 (works great in happy path, weak on failures)
- **After 30-min fixes:** 8/10 (handles failures gracefully)
- **After 1-hour fixes:** 9/10 (production-ready error handling)
- **After 3-hour fixes:** 10/10 (enterprise-grade robustness)

---

**Your Decision:** Which path do you want to take?
- 🏃 **Quick (30 min):** Just the essentials to prevent demo disasters
- 🚶 **Balanced (1 hour):** Good error handling and health checks
- 🧘 **Thorough (3 hours):** Production-ready robustness

I recommend **Balanced (1 hour)** - gives you confidence without taking too much time.
