# 🧪 Quick Test Guide - AI Improvements

## 🚀 Quick Start

### 1. Restart API Server
```powershell
# In ChatBot directory
cd ChatBot
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

**Look for:** `Loaded 12 chains successfully` ✅

---

### 2. Start Frontend
```powershell
# In frontend directory  
cd frontend
npm run dev
```

**Access:** http://localhost:5173

---

### 3. Create Test Case

**Case Title:** Molestation at Panjim Bus Stand
**Description:** Incident at bus stand, victim harassed
**Victim Age:** 22
**Gender:** Female
**Date:** 2025-10-03

**Enable:** ✅ Use Conversational Mode

---

## 📝 Test Scenarios

### Scenario A: Rich Answer (Tests Extraction)

**Question:** "Can you describe what happened during the incident?"

**Your Answer (copy-paste this):**
```
The victim, Priya Sharma aged 22, was sitting on a bench at Panjim bus stand 
around 11:30 PM. A man approximately 32 years old approached her and touched 
her inappropriately on her shoulder and back. The bus stand was empty at the 
time. We have collected CCTV footage from the scene and the victim's clothing 
as evidence. The accused fled before security arrived.
```

**Expected in Console:**
```
[DEBUG] ✅ Extracted data from answer:
  - victim_name: Priya Sharma
  - victim_age: 22
  - accused_age: 32
  - incident_description: Man touched victim inappropriately...
  - incident_time: 11:30 PM
  - location: Panjim bus stand
  - evidence_items: ['CCTV footage', "victim's clothing"]
  - accused_status: fled/absconding
```

**Next Question Should Be:** (Should NOT repeat incident question)
- ✅ "Has the victim undergone medical examination?"
- ✅ "Do you have details about the accused's identity?"
- ✅ "Were there any witnesses present?"
- ❌ NOT: "Can you describe what happened?" (FAIL if this appears!)

---

### Scenario B: Partial Answer (Tests Follow-up)

**Question:** "Can you describe what happened?"

**Your Answer:**
```
The girl was approached by a man
```

**Expected Behavior:**
- AI should detect **vague/insufficient** answer
- Next question should **probe deeper**:
  - "You mentioned the girl was approached. Can you describe exactly what happened next? What actions did the man take?"
  - NOT just repeat the same question

---

### Scenario C: Complete Information (Tests Progression)

**Turn 1:**
```
Q: Describe incident
A: [Detailed description with names, ages, evidence]
→ Extracts: victim_name, accused_age, evidence_items, incident_description
```

**Turn 2:**
```
Q: Medical examination status?
A: Yes, done at District Hospital on 3rd Oct
→ Extracts: medical_exam_status, medical_exam_location, medical_exam_date
```

**Turn 3:**
```
Q: Were there witnesses?
A: Yes, security guard Ram Verma and bus conductor
→ Extracts: witnesses: ["Ram Verma", "bus conductor"]
```

**Expected:** Each question should be **DIFFERENT**, progressively filling gaps

---

## 🔍 What to Check in Console

### After Each Answer, Look For:

**1. Extraction Success:**
```
[DEBUG] ✅ Extracted data from answer:
  - victim_name: [should show name if mentioned]
  - incident_description: [should capture description]
  - evidence_items: [should list evidence]
```

**2. Quality Assessment:**
```
[DEBUG] Answer quality: complete
```
or
```
[DEBUG] Answer quality: partial
[DEBUG] ⚠️ Needs clarification: Answer was too vague, need more details
```

**3. Next Question Logic:**
```
[DEBUG] ===== GET NEXT QUESTION =====
[DEBUG] Current extracted data fields:
  ✓ incident_description: Girl approached by man...
  ✓ evidence_items: ['CCTV footage']
  ✗ victim_name: (empty/null)
  ✗ medical_exam_status: (empty/null)
```

This shows **what AI knows** and **what it's missing** → guides next question

---

## ✅ Success Criteria

| Test | Pass Condition |
|------|----------------|
| **No Repetition** | Same question never asked twice |
| **Extraction Works** | Rich answers show multiple extracted fields |
| **Logical Flow** | Questions progress through priorities (incident → evidence → medical → witnesses) |
| **Context Awareness** | Questions reference previous answers ("You mentioned...") |
| **Vague Detection** | Partial answers trigger follow-up probes |
| **Completion** | After 8-12 turns, conversation marked complete |

---

## 🐛 If Still Seeing Repetition

### Check Console for:

**1. Is extraction working?**
```
[DEBUG] ✅ Extracted data from answer:
  - incident_description: [Should NOT be empty!]
```

If empty → Answer Analyzer not working

**2. Is data being passed to next question?**
```
[DEBUG] Current extracted data fields:
  ✓ incident_description: [Should show up here!]
```

If missing → Frontend not merging data correctly

**3. Raw LLM output:**
If you see:
```
[ERROR] parsing answer analysis: ...
[ERROR] Raw LLM output: ...
```
→ LLM returning invalid JSON, check Ollama model

---

## 🔄 Quick Restart If Issues

```powershell
# Stop API (Ctrl+C)
# Restart with fresh state
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000

# In frontend, refresh page (Ctrl+Shift+R)
# Start NEW case (don't reuse old session)
```

---

## 📊 Sample Complete Conversation (Expected)

```
Turn 1:
Q: "Can you describe what happened during the incident?"
A: "Girl approached by 32-year-old man, CCTV collected"
   → Extracts: incident_description, accused_age, evidence_items

Turn 2:
Q: "What is the name of the victim?" (NOT repeat incident!)
A: "Priya Sharma, age 22"
   → Extracts: victim_name, victim_age

Turn 3:
Q: "Has the victim undergone medical examination?"
A: "Yes, at District Hospital on 3rd Oct"
   → Extracts: medical_exam_status, medical_exam_location

Turn 4:
Q: "Do you have information about the accused's identity?"
A: "Name unknown, but caught on CCTV"
   → Extracts: accused_status, additional evidence

Turn 5:
Q: "Were there any witnesses?"
A: "Security guard Ram Verma"
   → Extracts: witnesses

Turn 6:
Q: "Has FIR been filed? If yes, provide FIR number"
A: "Yes, FIR 123/2025"
   → Extracts: procedures_completed, fir_number

...

Turn 8-10: Complete!
```

**Each turn asks something DIFFERENT!** ✅

---

## 💡 Pro Tips

1. **Be detailed in first answer** - AI extracts more, asks fewer questions
2. **Watch console logs** - tells you exactly what AI is thinking
3. **Use fresh sessions** - Old corrupted state can cause issues
4. **Answer naturally** - AI understands conversational language
5. **Check MongoDB** - Verify data is being saved: http://localhost:3001/api/conversation/recent/5

---

## 📞 If Still Broken

**Share these logs:**
1. Full console output from API after answering question
2. The exact question that was repeated
3. Your answer that should have filled the field
4. Screenshot of frontend showing repetition

**Expected time to fix:** 5-10 minutes once we see what's not working

---

**Good luck! The AI should be much smarter now! 🧠✨**
