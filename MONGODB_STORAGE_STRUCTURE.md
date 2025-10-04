# 🗄️ MongoDB Collection Storage Structure

## 📊 Database Architecture

### MongoDB Atlas Structure:
```
MongoDB Atlas (Cloud)
└── Cluster: cluster0.kbksf8p.mongodb.net
    └── Database: justiceai
        └── Collection: conversationalcases
            ├── Document 1 (Session 1)
            ├── Document 2 (Session 2)
            ├── Document 3 (Session 3)
            └── ...
```

---

## 📄 Single Document Structure

Each conversation session is stored as **ONE document** with this structure:

```javascript
{
  // Unique MongoDB ID
  "_id": ObjectId("67123abc456def789012345"),
  
  // Case & Session Identification
  "caseId": "CASE_001",
  "sessionId": "057f19d1-8fe7-4285-a77e-17dbbabf1fb3",
  
  // Initial Case Form Data
  "initialData": {
    "caseTitle": "Sexual Assault Case - Minor Victim",
    "caseType": "POCSO",
    "victimAge": "15",
    "incidentDate": "2025-10-02",
    "location": "School Premises",
    "initialDescription": "Incident reported by victim's mother"
  },
  
  // Complete Conversation Transcript (Array)
  "conversationHistory": [
    {
      "role": "ai",
      "content": "What is the victim's full name?",
      "timestamp": ISODate("2025-10-04T10:00:00.000Z")
    },
    {
      "role": "user",
      "content": "Priya Sharma",
      "timestamp": ISODate("2025-10-04T10:00:30.000Z")
    },
    {
      "role": "ai",
      "content": "What is the accused person's name?",
      "timestamp": ISODate("2025-10-04T10:00:45.000Z")
    },
    {
      "role": "user",
      "content": "Ram Verma, the school teacher",
      "timestamp": ISODate("2025-10-04T10:01:15.000Z")
    },
    {
      "role": "ai",
      "content": "What exactly happened during the incident?",
      "timestamp": ISODate("2025-10-04T10:01:30.000Z")
    },
    {
      "role": "user",
      "content": "The accused touched the victim inappropriately during class",
      "timestamp": ISODate("2025-10-04T10:02:00.000Z")
    }
    // ... more messages
  ],
  
  // AI-Extracted Structured Data (Built Progressively)
  "extractedData": {
    "victim_name": "Priya Sharma",
    "victim_age": "15",
    "accused_name": "Ram Verma",
    "accused_occupation": "School Teacher",
    "incident_type": "inappropriate touching",
    "incident_location": "School classroom",
    "incident_time": "During class hours",
    "witness_present": "Other students",
    "evidence_collected": ["Victim statement", "School CCTV footage"],
    "medical_exam_done": "Yes",
    "cwc_notified": "Yes",
    "pocso_applicable": true
  },
  
  // Progress Tracking (0-100%)
  "progress": {
    "case_info": 85,
    "evidence": 60,
    "compliance": 100,
    "witnesses": 40
  },
  
  // Final Structured Case (When Complete)
  "structuredCaseData": {
    "caseId": "CASE_001",
    "title": "POCSO Case - Sexual Assault at School",
    "basicDetails": {
      "victim": {
        "name": "Priya Sharma",
        "age": 15,
        "gender": "Female"
      },
      "accused": {
        "name": "Ram Verma",
        "age": 35,
        "occupation": "Teacher"
      },
      "incident": {
        "date": "2025-10-02",
        "location": "School classroom",
        "description": "Inappropriate touching during class"
      }
    },
    "keyEvidence": [
      {
        "type": "Statement",
        "description": "Victim's detailed statement",
        "status": "Recorded"
      },
      {
        "type": "Video",
        "description": "School CCTV footage",
        "status": "Collected"
      }
    ],
    "legalSections": [
      "POCSO Act Section 7 - Sexual Assault",
      "POCSO Act Section 27 - Medical Examination",
      "POCSO Act Section 19 - Mandatory Reporting"
    ],
    "complianceChecklist": [
      {
        "item": "Medical Examination",
        "status": "Completed",
        "deadline": "24 hours",
        "completed": true
      },
      {
        "item": "CWC Notification",
        "status": "Completed",
        "completed": true
      }
    ],
    "investigationGuide": [
      "Record statements from other students",
      "Obtain school records",
      "Interview school administration",
      "Send evidence for forensic analysis"
    ]
  },
  
  // Completion Status
  "isComplete": true,
  "completedAt": ISODate("2025-10-04T10:15:00.000Z"),
  
  // Metadata
  "officerName": "Inspector Kumar",
  "department": "Special Crime Unit",
  "createdBy": "officer_kumar",
  
  // Timestamps (Auto-generated)
  "createdAt": ISODate("2025-10-04T10:00:00.000Z"),
  "updatedAt": ISODate("2025-10-04T10:15:00.000Z")
}
```

---

## 🔄 How Data Flows Into Collection

### Phase 1: Conversation Start
```javascript
// First save when conversation starts
{
  "caseId": "CASE_001",
  "sessionId": "uuid-123",
  "initialData": { /* form data */ },
  "conversationHistory": [],
  "extractedData": {},
  "progress": { case_info: 0, evidence: 0, compliance: 0, witnesses: 0 },
  "isComplete": false
}
```

### Phase 2: After Question 1
```javascript
// Updated after first Q&A
{
  "conversationHistory": [
    { role: "ai", content: "What is victim's name?" },
    { role: "user", content: "Priya Sharma" }
  ],
  "extractedData": {
    "victim_name": "Priya Sharma"
  },
  "progress": { case_info: 20, evidence: 0, compliance: 0, witnesses: 0 }
}
```

### Phase 3: After Question 2
```javascript
// Updated after second Q&A
{
  "conversationHistory": [
    { role: "ai", content: "What is victim's name?" },
    { role: "user", content: "Priya Sharma" },
    { role: "ai", content: "What is accused's name?" },
    { role: "user", content: "Ram Verma" }
  ],
  "extractedData": {
    "victim_name": "Priya Sharma",
    "accused_name": "Ram Verma"
  },
  "progress": { case_info: 40, evidence: 0, compliance: 0, witnesses: 0 }
}
```

### Phase 4: Completion
```javascript
// Final update when complete
{
  "conversationHistory": [ /* all 10-15 messages */ ],
  "extractedData": { /* all extracted fields */ },
  "structuredCaseData": { /* complete case structure */ },
  "progress": { case_info: 100, evidence: 100, compliance: 100, witnesses: 100 },
  "isComplete": true,
  "completedAt": "2025-10-04T10:15:00.000Z"
}
```

---

## 📈 Multiple Cases Storage

### Collection View:
```javascript
// conversationalcases collection contains multiple documents

Document 1:
{
  "caseId": "CASE_001",
  "sessionId": "session-uuid-1",
  "initialData": { "caseTitle": "POCSO Case" },
  "isComplete": true,
  "createdAt": "2025-10-04T10:00:00Z"
}

Document 2:
{
  "caseId": "CASE_002",
  "sessionId": "session-uuid-2",
  "initialData": { "caseTitle": "Rape Case" },
  "isComplete": false,
  "createdAt": "2025-10-04T11:00:00Z"
}

Document 3:
{
  "caseId": "CASE_001",  // Same case, different session
  "sessionId": "session-uuid-3",
  "initialData": { "caseTitle": "POCSO Case - Follow-up" },
  "isComplete": true,
  "createdAt": "2025-10-05T09:00:00Z"
}
```

**Note:** One case can have multiple sessions (if officer restarts or does follow-up)

---

## 🔍 Indexes for Fast Queries

### Created Indexes:
```javascript
1. { "sessionId": 1 }              // Unique, find by session
2. { "caseId": 1 }                 // Find all sessions for a case
3. { "caseId": 1, "createdAt": -1 } // Case + sorted by date
4. { "isComplete": 1 }             // Filter complete/incomplete
5. { "createdAt": -1 }             // Sort by recent
```

### Query Examples:
```javascript
// Get specific session
db.conversationalcases.findOne({ sessionId: "uuid-123" })

// Get all sessions for a case
db.conversationalcases.find({ caseId: "CASE_001" }).sort({ createdAt: -1 })

// Get incomplete conversations
db.conversationalcases.find({ isComplete: false })

// Get recent 10 conversations
db.conversationalcases.find().sort({ createdAt: -1 }).limit(10)
```

---

## 💾 Storage Size Estimates

### Per Document:
```
Basic fields:               ~1 KB
Conversation (10 messages): ~3 KB
Extracted data:            ~2 KB
Structured case data:      ~5 KB
Total per document:        ~11 KB
```

### Scale:
```
100 conversations   = ~1.1 MB
1,000 conversations = ~11 MB
10,000 conversations = ~110 MB
```

**MongoDB Atlas Free Tier:** 512 MB  
**Can store:** ~46,000 conversations

---

## 🔐 Data Access Patterns

### 1. Save After Each Q&A (Most Frequent)
```javascript
POST /api/conversation/save
// Updates existing document or creates new one
// Uses: upsert option
```

### 2. Get Conversation to Resume
```javascript
GET /api/conversation/:sessionId
// Retrieves complete document
// Frontend reloads messages and continues
```

### 3. Get Case History
```javascript
GET /api/conversation/case/:caseId
// Returns all documents for that case
// Sorted by date (newest first)
```

### 4. Statistics Dashboard
```javascript
GET /api/conversation/stats/overview
// Aggregates across all documents
// Counts total, completed, active
```

---

## 📊 MongoDB Atlas Dashboard View

When you open MongoDB Atlas, you'll see:

```
Database: justiceai
└── Collections
    └── conversationalcases (15 documents)
        ├── Filters: { isComplete: true }
        ├── Search: { caseId: "CASE_001" }
        └── Documents:
            ┌─────────────────────────────────────────┐
            │ _id: ObjectId("67123...")               │
            │ caseId: "CASE_001"                      │
            │ sessionId: "057f19d1..."                │
            │ conversationHistory: Array(12)          │
            │ extractedData: Object                   │
            │ isComplete: true                        │
            │ createdAt: 2025-10-04T10:00:00Z         │
            └─────────────────────────────────────────┘
```

---

## 🎯 Key Benefits of This Structure

### 1. **Complete Audit Trail**
- Every question and answer stored
- Timestamps for each message
- Can replay entire conversation

### 2. **Progressive Updates**
- Document updated after each Q&A
- No data loss if browser closes
- Resume from exact point

### 3. **Flexible Schema**
- `extractedData` is flexible (Mixed type)
- Can store any AI-extracted fields
- Adapts to different case types

### 4. **Fast Queries**
- Indexes on sessionId, caseId
- Quick lookups
- Efficient filtering

### 5. **Scalability**
- MongoDB Atlas auto-scales
- Handles thousands of concurrent writes
- Sharding available if needed

---

## 🔄 Data Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. Conversation Starts                              │
│    → Document created with initial data             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 2. Each Q&A Exchange                                │
│    → Document updated with:                         │
│      - New messages in conversationHistory          │
│      - Updated extractedData                        │
│      - Updated progress                             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 3. Conversation Completes                           │
│    → Document updated with:                         │
│      - isComplete: true                             │
│      - completedAt: timestamp                       │
│      - structuredCaseData: final case structure     │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 4. Forever Stored in MongoDB                        │
│    → Can be retrieved anytime                       │
│    → Used for analytics                             │
│    → Audit trail preserved                          │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Representation

```
MongoDB Atlas (Cloud)
    ↓
Database: justiceai
    ↓
Collection: conversationalcases
    ↓
    ┌─────────────────────────────────────┐
    │  Document (Session 1)               │
    │  ┌───────────────────────────────┐  │
    │  │ caseId: "CASE_001"            │  │
    │  │ sessionId: "uuid-1"           │  │
    │  │                               │  │
    │  │ conversationHistory: [        │  │
    │  │   {ai: "Q1", user: "A1"},    │  │
    │  │   {ai: "Q2", user: "A2"}     │  │
    │  │ ]                             │  │
    │  │                               │  │
    │  │ extractedData: {              │  │
    │  │   victim_name: "...",         │  │
    │  │   accused_name: "..."         │  │
    │  │ }                             │  │
    │  │                               │  │
    │  │ progress: {60%, 40%, 80%}     │  │
    │  └───────────────────────────────┘  │
    └─────────────────────────────────────┘
    
    ┌─────────────────────────────────────┐
    │  Document (Session 2)               │
    │  ┌───────────────────────────────┐  │
    │  │ caseId: "CASE_002"            │  │
    │  │ sessionId: "uuid-2"           │  │
    │  │ ...                           │  │
    │  └───────────────────────────────┘  │
    └─────────────────────────────────────┘
```

---

## 🎯 Summary

**Where:** MongoDB Atlas Cloud → Database: `justiceai` → Collection: `conversationalcases`

**What:** Each conversation = 1 document with complete history

**How:** Updated after every Q&A exchange via `POST /api/conversation/save`

**Size:** ~11 KB per conversation, can store 46,000+ on free tier

**Access:** Query by sessionId, caseId, or get recent/stats

**Benefit:** Complete audit trail, resume capability, analytics-ready

