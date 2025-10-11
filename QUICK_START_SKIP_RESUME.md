# 🚀 Quick Start: Skip & Resume Feature

## ⚡ How to Test Right Now

### 1️⃣ **Restart Backend** (Load new endpoints)
```powershell
cd backend
node server.js
```

**Look for:**
```
✅ MongoDB connected successfully
Server running on port 3001
```

### 2️⃣ **Restart Frontend** (Load new components)
```powershell
cd frontend
npm run dev
```

**Look for:**
```
VITE ready in X ms
➜ Local: http://localhost:5173/
```

### 3️⃣ **Start ChatBot** (Keep running)
```powershell
cd ChatBot
conda activate justice
python api.py
```

### 4️⃣ **Test the Feature**

#### **Step 1: Start a Case**
1. Login → Dashboard
2. Click **"New Case"**
3. Fill form:
   - Case ID: `TEST-SKIP-001`
   - Title: `Test Skip Feature`
   - Description: `Testing skip and resume`
   - Victim Age: `25`
   - Submit

#### **Step 2: Skip the Questionnaire**
1. AI starts asking questions
2. Answer **2-3 questions** (watch progress increase)
3. Click **"Skip for Now"** (yellow button, top right)
4. Modal appears → Click **"Yes, Skip for Now"**
5. You're back at dashboard ✅

#### **Step 3: See the Sidebar**
1. Look at **RIGHT EDGE** of screen
2. You'll see a **blue/purple button** with badge showing "1"
3. Click it → Sidebar slides open
4. You see your paused conversation card with:
   - Case title
   - Progress bars
   - Message count
   - "Resume →" button

#### **Step 4: Resume**
1. Click **"Resume →"** button
2. Conversation loads with all previous messages
3. AI continues asking questions
4. Progress restored ✅

---

## 🎥 Visual Guide

### **Skip Button Location**
```
┌─────────────────────────────────────────────────────┐
│  AI Case Investigation Assistant                   │
│  Case ID: TEST-001 | Session: abcd1234...          │
│                                 [Skip] [← Back]     │  ← HERE
├─────────────────────────────────────────────────────┤
│  Progress Bars: Case Info | Evidence | etc.        │
└─────────────────────────────────────────────────────┘
```

### **Sidebar Button Location**
```
┌────────────────────────────────────────────┐
│  Dashboard Content                         │  [🔵]  ← Fixed on
│                                            │        right edge
│  - New Case                                │
│  - Existing Cases                          │
│                                            │
└────────────────────────────────────────────┘
```

### **Sidebar Open**
```
┌──────────────────────────┬──────────────────────┐
│  Dashboard Content       │ Resume Conversations │
│                          │ ┌──────────────────┐ │
│  - New Case              │ │ Panjim Case      │ │
│  - Existing Cases        │ │ Progress: 35%    │ │
│                          │ │ [Resume →]       │ │
│                          │ └──────────────────┘ │
│                          │                      │
└──────────────────────────┴──────────────────────┘
```

---

## 🔍 Troubleshooting

### **Problem: Sidebar button not showing**
**Solution:**
- Make sure you're logged in
- Refresh page (Ctrl+R)
- Check browser console for errors

### **Problem: "Skip for Now" button disabled**
**Reason:** AI is processing
**Wait for:** Processing to complete, then button enables

### **Problem: Sidebar shows "No paused conversations"**
**Check:**
1. Did you actually skip a conversation?
2. Backend running? Check console for pause logs
3. MongoDB connected? Check backend console

### **Problem: Resume doesn't work**
**Debug:**
1. Open browser DevTools (F12)
2. Network tab
3. Click Resume
4. Check for:
   - `POST /api/conversation/resume` (200 OK)
   - Response shows `success: true`
5. If 404/500, backend might not have new routes

---

## 📊 Backend Console Output (What to Expect)

### **When Skipping:**
```
⏸️ Pausing conversation: session_1728648234_abc123
✅ Conversation session_1728648234_abc123 paused in conversations collection
✅ ConversationalCase session_1728648234_abc123 marked as paused
```

### **When Fetching Paused List:**
```
GET /api/conversation/paused-conversations 200 45ms
```

### **When Resuming:**
```
▶️ Resuming conversation: session_1728648234_abc123
✅ Conversation session_1728648234_abc123 resumed
```

---

## 🎯 Feature Checklist

After testing, verify:

- [ ] Skip button visible during questionnaire
- [ ] Modal shows current progress percentages
- [ ] Returns to dashboard after confirming skip
- [ ] Sidebar button appears on right edge
- [ ] Badge shows number "1" on sidebar button
- [ ] Sidebar opens/closes smoothly
- [ ] Conversation card displays case info
- [ ] Progress bars show correct percentages
- [ ] "Resume →" button works
- [ ] Conversation loads with previous messages
- [ ] Progress restored correctly
- [ ] Can continue answering questions

---

## 💡 Pro Tips

1. **Create Multiple Cases**: Skip 2-3 cases to see sidebar with multiple cards
2. **Check Progress**: Watch progress bars update in real-time
3. **Time Tracking**: Wait a few minutes, reopen sidebar to see "5m ago"
4. **Refresh**: Click refresh button in sidebar footer to update list
5. **Mobile**: Try on mobile - sidebar should work smoothly

---

## 🆘 Need Help?

### **Check These First:**
1. All 3 servers running (Backend, Frontend, ChatBot)
2. MongoDB Atlas connection working
3. Browser console for JavaScript errors
4. Backend console for API errors

### **Common Issues:**

**"Cannot read property 'conversationState'"**
→ Conversation model schema issue
→ Restart backend

**"Network Error"**
→ Backend not running
→ Check port 3001

**"Modal won't close"**
→ Intentional! Must choose option
→ Click "Continue" to keep going

---

## 🎉 Success Criteria

You know it's working when:
1. ✅ Can skip questionnaire anytime
2. ✅ Sidebar shows paused conversations
3. ✅ Can resume and continue from exact point
4. ✅ Progress persists across sessions
5. ✅ No data loss when skipping

**Ready to test!** 🚀
