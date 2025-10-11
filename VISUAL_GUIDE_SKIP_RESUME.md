# 🎨 Skip & Resume Feature - Visual Guide

## 📱 UI Components

### **1. Skip Button (in ConversationalQuestioning)**

```
┌──────────────────────────────────────────────────────────────┐
│ AI Case Investigation Assistant                             │
│ Case ID: CASE-001 | Session: session_abc123...              │
│                                                              │
│        [⏭ Skip for Now]  [← Back]  ← Yellow button         │
├──────────────────────────────────────────────────────────────┤
│ Progress:  [████████░░] 80%  [██████░░░░] 60%               │
│           Case Info         Evidence                         │
└──────────────────────────────────────────────────────────────┘
```

---

### **2. Skip Confirmation Modal**

```
        ┌─────────────────────────────────────────┐
        │                                         │
        │  ⚠️  Skip Questionnaire?               │
        │                                         │
        │  You can resume this conversation      │
        │  anytime from the sidebar. Your        │
        │  progress will be saved automatically. │
        │                                         │
        │  ┌───────────────────────────────────┐ │
        │  │ Current Progress:                 │ │
        │  │ • Case Info: 60%                  │ │
        │  │ • Evidence: 40%                   │ │
        │  │ • Compliance: 20%                 │ │
        │  │ • Witnesses: 10%                  │ │
        │  └───────────────────────────────────┘ │
        │                                         │
        │  [Yes, Skip for Now]  [Continue]       │
        │                                         │
        └─────────────────────────────────────────┘
```

---

### **3. Sidebar Toggle Button (Fixed Position)**

**Closed State:**
```
                                      Screen Edge
                                           │
┌──────────────────────────────────────┐  │
│                                      │  │
│  Dashboard Content                   │  ├──┐
│                                      │  │🔵│ ← Button with badge "1"
│  • New Case                          │  ├──┘
│  • Cases                             │  │
│  • Legal References                  │  │
│                                      │  │
└──────────────────────────────────────┘  │
```

**Open State:**
```
                           Screen Edge
                                │
┌──────────────────────┬────────┴──────────────────┐
│                      │                            │
│  Dashboard Content   │  Resume Conversations     │
│                      │  ┌──────────────────────┐ │
│  • New Case          │  │ 📊 Panjim Case       │ │
│  • Cases             │  │ Progress: 35%        │ │
│                      │  │ [Resume →]           │ │
│                      │  └──────────────────────┘ │
│                      │                            │
│                      │  ┌──────────────────────┐ │
│                      │  │ 📊 Mumbai Case       │ │
├──┐                   │  │ Progress: 75%        │ │
│🔵│ ← Button moved    │  │ [Resume →]           │ │
├──┘  left             │  └──────────────────────┘ │
│                      │                            │
└──────────────────────┴────────────────────────────┘
```

---

### **4. Conversation Card (in Sidebar)**

```
┌───────────────────────────────────────────────────┐
│  📊 Panjim Assault Case              2h ago       │  ← Title + Time
│  CASE-2024-001                    [paused]        │  ← ID + Status Badge
├───────────────────────────────────────────────────┤
│  Overall Progress                            35%  │
│  [████████████░░░░░░░░░░░░░░░░░░░░░░░]           │  ← Progress Bar
├───────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐                  │
│  │ Case Info  │  │ Evidence   │                  │  ← 4 Section
│  │    60%     │  │    40%     │                  │    Progress Boxes
│  └────────────┘  └────────────┘                  │
│  ┌────────────┐  ┌────────────┐                  │
│  │ Compliance │  │ Witnesses  │                  │
│  │    20%     │  │    10%     │                  │
│  └────────────┘  └────────────┘                  │
├───────────────────────────────────────────────────┤
│  💬 12 messages                   [Resume →]      │  ← Footer
└───────────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### **Progress Bar Colors**
```
0-24%:   █████░░░░░  Red      (bg-red-500)
25-49%:  ████████░░  Yellow   (bg-yellow-500)
50-74%:  ████████░░  Blue     (bg-blue-500)
75-100%: ██████████  Green    (bg-green-500)
```

### **Status Badge Colors**
```
Active:     [active]     Green  (bg-green-100 text-green-800)
Paused:     [paused]     Yellow (bg-yellow-100 text-yellow-800)
Completed:  [completed]  Blue   (bg-blue-100 text-blue-800)
```

### **Button Colors**
```
Skip:      Yellow      (bg-yellow-100 hover:bg-yellow-200)
Back:      Gray        (bg-gray-100 hover:bg-gray-200)
Resume:    Blue→Purple (gradient from-blue-500 to-purple-600)
```

---

## 📐 Responsive Design

### **Desktop (≥1024px)**
```
┌────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Main Content                      [○]  │
│             │                                           │
│  Dashboard  │  ConversationalQuestioning               │
│  Cases      │  • Chat messages                         │
│  Legal      │  • Input field                           │
│  ...        │  • Progress bars                         │
│             │                                           │
└────────────────────────────────────────────────────────┘
         ↑                                          ↑
    Main Sidebar                          Resume Sidebar
    (always visible)                      (collapsible)
```

### **Mobile (<768px)**
```
┌──────────────────────────────┐
│  [☰]  CaseSwift              │  ← Hamburger menu
├──────────────────────────────┤
│                              │
│  Main Content                │  [○]  ← Resume sidebar button
│                              │       (smaller, bottom-right)
│  • Conversational Q&A        │
│  • Full width                │
│  • Touch optimized           │
│                              │
└──────────────────────────────┘
```

---

## 🔄 Animation Flow

### **Skip Flow**
```
1. User in conversation
   ↓
2. Clicks "Skip for Now"
   ↓ (Modal fades in - 200ms)
3. Confirmation modal appears
   ↓
4. User clicks "Yes, Skip"
   ↓ (Modal fades out - 200ms)
5. API call: POST /pause
   ↓ (300ms transition)
6. Navigate to Dashboard
   ↓
7. Sidebar badge updates (+1)
```

### **Resume Flow**
```
1. User on Dashboard
   ↓
2. Clicks sidebar button (right edge)
   ↓ (Slide animation - 300ms)
3. Sidebar opens from right
   ↓
4. Shows paused conversations
   ↓
5. User clicks "Resume →"
   ↓ (API call: POST /resume)
6. Sidebar closes (300ms)
   ↓
7. Navigate to ConversationalQuestioning
   ↓ (Fade in - 200ms)
8. Messages load
   ↓
9. Conversation continues
```

---

## 🎬 State Transitions

### **Conversation States**
```
     [Create Case]
           ↓
      ┌────────┐
      │ Active │ ← User answering questions
      └────┬───┘
           │
    ┌──────┴──────┐
    │             │
    │ [Skip]      │ [Complete]
    ↓             ↓
┌────────┐    ┌──────────┐
│ Paused │    │Completed │
└───┬────┘    └──────────┘
    │
    │ [Resume]
    ↓
┌────────┐
│ Active │
└────────┘
```

### **Badge Count Logic**
```
Badge Count = Number of conversations where:
  conversationState IN ('paused', 'active')
  AND NOT isComplete

Updates:
• When conversation paused: +1
• When conversation completed: -1
• When conversation resumed: (no change)
```

---

## 🖼️ Empty States

### **No Paused Conversations**
```
┌────────────────────────────────────┐
│                                    │
│           💬                       │
│                                    │
│     No paused conversations        │
│                                    │
│   Start a new case to begin        │
│                                    │
└────────────────────────────────────┘
```

### **Loading State**
```
┌────────────────────────────────────┐
│                                    │
│          ⟳                         │
│                                    │
│   Loading conversations...         │
│                                    │
└────────────────────────────────────┘
```

---

## 🎯 Interaction States

### **Button States**

**Skip Button:**
```
Normal:    [⏭ Skip for Now]          Yellow bg
Hover:     [⏭ Skip for Now]          Darker yellow
Disabled:  [⏭ Skip for Now]          Gray, cursor-not-allowed
```

**Resume Button:**
```
Normal:    [Resume →]                Blue gradient
Hover:     [Resume →]                Darker gradient + shadow
Active:    [Resume →]                Scale 95%
```

**Sidebar Toggle:**
```
Closed:    [◄]                       Blue gradient + badge
Open:      [►]                       Blue gradient (rotated icon)
Hover:     [◄/►]                     Shadow expands
```

---

## 📱 Touch Targets (Mobile)

**Minimum sizes:**
- Skip button: 48px × 48px
- Resume button: 48px × 48px
- Sidebar toggle: 56px × 56px
- Conversation card: Full width, min 80px height
- Modal buttons: 48px height, full width

**Spacing:**
- Between buttons: 12px
- Card padding: 16px
- Sidebar padding: 16px

---

## 🎨 Accessibility

### **ARIA Labels**
```jsx
<button aria-label="Skip questionnaire for now">
  Skip for Now
</button>

<button aria-label="Resume paused conversation">
  Resume →
</button>

<div role="dialog" aria-modal="true">
  {/* Confirmation modal */}
</div>
```

### **Keyboard Navigation**
- `Tab`: Focus next element
- `Shift+Tab`: Focus previous
- `Enter`: Activate button
- `Esc`: Close sidebar/modal
- `Space`: Activate button

### **Screen Reader Announcements**
```
"Conversation paused. You can resume anytime from the sidebar."
"Loading paused conversations..."
"1 paused conversation available"
"Resuming conversation for Case ID CASE-001"
```

---

## 🎉 Visual Summary

```
┌─────────────────────────────────────────────────────────┐
│  BEFORE: Simple Questionnaire                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Q: What is victim's name?                        │  │
│  │  A: [_______________________]                     │  │
│  │                                    [Submit]       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  AFTER: Skip & Resume System                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Q: What is victim's name?                        │  │
│  │  A: [_______________________]                     │  │
│  │                                                    │  │
│  │  [Skip for Now] [Submit]         [Resume ○]       │  │
│  │                                       ↑            │  │
│  │                              Sidebar toggle        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ✅ Can pause anytime                                   │
│  ✅ Resume from sidebar                                 │
│  ✅ Track multiple cases                                │
│  ✅ No data loss                                        │
└─────────────────────────────────────────────────────────┘
```

**Feature Complete!** 🎨✨
