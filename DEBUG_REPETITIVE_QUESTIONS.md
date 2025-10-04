# 🔍 Debug Guide - Repetitive Questions Issue

## Problem
AI keeps asking the same question about incident details despite receiving detailed answers 3 times.

## Diagnostic Steps

### Step 1: Check Backend Logs
```powershell
# Stop current backend
# Press Ctrl+C in ChatBot terminal

# Restart with clean logs
cd ChatBot
conda activate justice
python api.py
```

**Look for these logs after submitting an answer:**

1. **Process Answer Endpoint:**
```
[DEBUG] 🔍 EXTRACTED DATA RECEIVED:
[DEBUG]   - incident_description: [VALUE HERE]
[DEBUG]   - All keys: [LIST OF KEYS]
```

2. **Answer Analyzer Output:**
```
[DEBUG] ✅ Extracted data from answer:
[DEBUG]    ✅ incident_description: [NEW VALUE]
[DEBUG]    ✅ victim_name: [VALUE]
```

3. **Get Next Question Endpoint:**
```
[DEBUG] 📤 SENDING TO QUESTION DECIDER:
[DEBUG]   - incident_description in data: True/False
[DEBUG]   - incident_description value: [ACCUMULATED VALUE]
```

4. **Question Decider Output:**
```
[DEBUG] Question Decider raw output: {...}
```

### Step 2: Check Browser Console
Open browser DevTools (F12), look for:

```javascript
🔍 [DEBUG] Extracted data from backend: {
  incident_description: "..."
}

🔍 [DEBUG] Current extractedData state: {
  incident_description: "..."
}

🔍 [DEBUG] Smart-merged extractedData: {
  incident_description: "... (should be longer)"
}
```

### Step 3: Test Sequence
1. Create NEW case (old sessions won't have the fix)
2. Answer first question with: "Incident at bus stand"
3. **CHECK LOGS:** Does `incident_description` appear in backend logs?
4. Answer second question with: "Accused wore black"
5. **CHECK LOGS:** Does `incident_description` now contain BOTH parts?
6. **CHECK QUESTION:** Does AI move to different topic, or repeat incident question?

## Expected Behavior

### ✅ CORRECT Flow:
```
Q1: "Can you describe the incident?"
A1: "Incident at bus stand"
   → Backend extracts: incident_description = "Incident at bus stand"
   → Frontend merges: incident_description = "Incident at bus stand"
   → MongoDB saves: incident_description = "Incident at bus stand"

Q2: "Can you provide more details?"
A2: "Accused wore black"
   → Backend extracts: incident_description = "Accused wore black"
   → Frontend merges: incident_description = "Incident at bus stand. Accused wore black"
   → MongoDB saves: incident_description = "Incident at bus stand. Accused wore black"

Q3: Should ask about DIFFERENT topic (evidence, witnesses, medical exam)
   NOT about incident again!
```

### ❌ BROKEN Flow (Current Issue):
```
Q1: "Can you describe the incident?"
A1: "Detailed answer..."
   → Extracted data: ??? (check logs)

Q2: "Can you describe the incident?" (REPEATS!)
A2: "Even more detailed answer..."
   → Extracted data: ??? (check logs)

Q3: "Can you describe the incident?" (STILL REPEATING!)
```

## Possible Root Causes

### Cause 1: Answer Analyzer Not Extracting
**Symptom:** Backend logs show "Extracted data from answer: []" (empty)
**Fix:** Answer Analyzer prompt needs adjustment

### Cause 2: Frontend Not Merging
**Symptom:** Browser console shows new data but not merged with old
**Fix:** Check smartMerge() function in ConversationalQuestioning.jsx

### Cause 3: MongoDB Not Persisting
**Symptom:** Refresh page, data is gone
**Fix:** Check MongoDB save endpoint

### Cause 4: Question Decider Not Receiving Data
**Symptom:** Backend logs show incident_description exists, but AI still asks
**Fix:** Question Decider prompt needs stronger instructions

### Cause 5: Question Decider Ignoring Data
**Symptom:** Backend logs show data sent to AI, but AI ignores it
**Fix:** LLM not following instructions - need to strengthen prompt

## Quick Tests

### Test 1: Backend Extraction
```powershell
# Check if Answer Analyzer is working
cd ChatBot
conda activate justice
python -c "
from api import ml_models
import asyncio

async def test():
    result = await ml_models['answer_analyzer'].ainvoke({
        'question_asked': 'What happened?',
        'officer_answer': 'The accused touched the victim at 6pm.',
        'case_context': 'Test case'
    })
    print('Result:', result)

asyncio.run(test())
"
```

**Expected:** Should return JSON with `incident_description` field

### Test 2: Frontend Merge
Open browser console and run:
```javascript
const oldData = { incident_description: "First part" };
const newData = { incident_description: "Second part" };

// Test smart merge logic
const appendFields = ['incident_description'];
let merged = { ...oldData };

if (appendFields.includes('incident_description')) {
  if (oldData.incident_description && newData.incident_description) {
    merged.incident_description = `${oldData.incident_description}. ${newData.incident_description}`;
  }
}

console.log('Merged:', merged.incident_description);
// Should output: "First part. Second part"
```

### Test 3: MongoDB Persistence
```powershell
# Check what's in MongoDB
# (Requires MongoDB connection string)
```

## Manual Fix If AI Stuck

If AI is stuck in loop, you can manually:

1. **Skip the stuck question:**
   - Answer: "I already provided full incident details. Please move to next topic."
   - AI should recognize and move on

2. **Restart conversation:**
   - Go back to case list
   - Create NEW case (don't continue old one)
   - Answer with combined details in first answer

3. **Force completion:**
   - If case is mostly complete, mark as complete manually

## Enhanced Logging Added

The following debug logs have been added to `api.py`:

1. **Line ~1470:** Logs what extracted_data is received by process-answer
2. **Line ~1330:** Logs what data is sent to Question Decider
3. **Line ~1520:** Logs what extracted fields are being returned to frontend
4. **Line ~1408:** Logs Question Decider's raw output

## Next Steps

1. ✅ Restart backend with enhanced logging
2. ✅ Create NEW case in browser
3. ✅ Answer 2-3 questions
4. ✅ **Share backend terminal logs** - This will show exactly where the issue is
5. ⏳ Based on logs, apply targeted fix

---

**Action Required:** Please restart the backend and share the terminal output after answering 2 questions. The logs will tell us exactly where the data flow is breaking.
