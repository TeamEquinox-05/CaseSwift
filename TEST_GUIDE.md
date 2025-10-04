# 🚀 Quick Start - Test Conversational AI System

## Start All Servers

### Terminal 1: AI API (Python FastAPI)
```powershell
cd ChatBot
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```
**Wait for:** "Application startup complete"

### Terminal 2: Backend API (Node.js)
```powershell
cd backend
npm run dev
```
**Wait for:** "Server running on port 3001"

### Terminal 3: Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```
**Wait for:** "Local: http://localhost:5173"

---

## Test the System

### 1. Open Frontend
Open browser: http://localhost:5173

### 2. Create New Case
Click "New Case" and fill:
- **Case Title:** POCSO Case - Minor Victim
- **Case Description:** Incident reported by victim's mother. Suspect is a neighbor.
- **Victim Age:** 15
- **Victim Gender:** Female
- **Incident Date:** 2025-01-20
- **Incident Time:** 18:00

Click **Submit Case**

### 3. Conversational Interrogation Starts

**Expected:**
- ConversationalQuestioning component opens
- AI asks first question
- Progress bars show at top (all at 0%)

### 4. Answer Questions

**Example Conversation:**

**AI:** "What is the victim's full name?"  
**You:** "Priya Kumar, age 15 years"

**AI:** "Can you describe what happened during the incident?"  
**You:** "The victim reported that the accused touched her inappropriately when she was alone at home."

**AI:** "Has the victim undergone medical examination?" 🔴 URGENT  
**You:** "Yes, medical examination was completed at District Hospital on 20th January 2025."

**AI:** "Has the Child Welfare Committee been notified?" 🔴 URGENT  
**You:** "Yes, CWC was notified on the same day. Case registered under POCSO Act."

**AI:** "What evidence has been collected?"  
**You:** "Victim's statement recorded, medical report obtained, CCTV footage from building secured."

**AI:** "Are there any eyewitnesses?"  
**You:** "Yes, victim's younger brother who was in another room."

### 5. Watch Progress

As you answer:
- ✅ Progress bars increase
- ✅ Extracted data appears in right panel
- ✅ URGENT questions highlighted in red
- ✅ Legal basis shown (e.g., "POCSO Section 27")

### 6. Completion

After 6-8 questions, AI will say:
> "Case interrogation complete! 100% information gathered."

Then it automatically proceeds to **Case Analysis Report**.

---

## Expected Behavior

### ✅ Questions Come One-by-One
- Not all at once
- Wait for answer before next question

### ✅ Questions Adapt
- If you mention evidence → AI asks preservation details
- If you say "not done" → AI asks why + plan
- If you give vague answer → AI asks for clarification

### ✅ Priority Shown
- 🔴 URGENT: Medical exam, CWC notification
- 🟠 CRITICAL: Victim details, accused info
- 🟡 IMPORTANT: Evidence, witnesses

### ✅ Progress Updates
- Case Info: Increases with victim/accused details
- Evidence: Increases when evidence mentioned
- Compliance: Increases with medical exam, CWC
- Witnesses: Increases when witnesses mentioned

### ✅ Auto-Complete
- No "I'm done" button
- AI determines when enough info gathered

---

## Troubleshooting

### ConversationalQuestioning not showing?
- Check `useConversationalMode` is `true` in NewCaseForm.jsx (line 40)
- Check browser console for errors

### "Conversational chains not ready" error?
- Wait for AI API startup to complete
- Check terminal: Should see "Loading models and building all chains"
- Check all chains loaded: answer_analyzer, question_decider, completion_checker

### Questions not adapting?
- Check AI API logs for chain invocations
- Verify LLM (Ollama) is running: `ollama list`
- Test LLM: `ollama run huihui_ai/llama3.2-abliterate:latest "Hello"`

### Frontend not calling endpoints?
- Check `.env` file: `VITE_AI_API_URL=http://localhost:8000`
- Check browser network tab for failed requests
- Verify CORS enabled in api.py

---

## Test Different Scenarios

### Scenario 1: POCSO Case (Minor)
- Victim Age: 15
- Expected: URGENT medical exam + CWC questions

### Scenario 2: IPC Case (Adult)
- Victim Age: 25
- Expected: No POCSO-specific questions, focus on evidence

### Scenario 3: Vague Answers
- Answer: "Something happened"
- Expected: AI asks for specific details

### Scenario 4: Missing Compliance
- Say "Medical exam not done"
- Expected: AI marks as URGENT, asks reason + plan

---

## Success Indicators

✅ Chat interface appears after case submission  
✅ AI asks first question immediately  
✅ Progress bars visible  
✅ Answer submission works  
✅ Next question appears after answer  
✅ Extracted data updates in real-time  
✅ URGENT badges show for compliance questions  
✅ Completion detected automatically  
✅ Proceeds to analysis report  

---

## Next Steps After Testing

If everything works:
- ✅ Conversational AI interrogation is LIVE
- ✅ System matches dynamic_questions specification
- ✅ Ready for JusticeAI Hackathon demo

If issues found:
- Check terminal logs for errors
- Test individual endpoints with Postman
- Verify all chains loaded in api.py
- Check browser console for frontend errors

---

**🎉 You now have a fully functional conversational AI interrogation system!**
