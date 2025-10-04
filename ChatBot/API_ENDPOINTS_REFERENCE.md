# 🔗 CaseSwift AI API - Complete Endpoint Reference

**Base URL:** `http://localhost:8000` (or ngrok URL for remote access)

**Server:** FastAPI with Uvicorn  
**LLM:** Ollama (huihui_ai/llama3.2-abliterate:latest)  
**Vector DB:** ChromaDB with HuggingFace embeddings

---

## 📋 Table of Contents

1. [General Chat & Q&A](#1-general-chat--qa)
2. [Case Analysis Endpoints](#2-case-analysis-endpoints)
3. [Conversational Interrogation (NEW)](#3-conversational-interrogation-new)
4. [Legacy Question System](#4-legacy-question-system)
5. [Utility Endpoints](#5-utility-endpoints)

---

## 1. General Chat & Q&A

### **POST `/api/chat`**

General purpose chat for legal Q&A, form filling, and investigation guidance.

**Uses AI Chains:**
- Router Chain (determines intent)
- Q&A Chain (legal questions)
- Form Filler Chain (fills out forms)
- Guide Chain (procedural guidance)

**Request Body:**
```json
{
  "message": "What is the punishment for rape under POCSO?",
  "session_id": "uuid-here" // optional
}
```

**Response:**
```json
{
  "response": "Under POCSO Act 2012, Section 4...",
  "session_id": "uuid-here"
}
```

**Use Cases:**
- Legal questions: "What sections apply to this case?"
- Form filling: "Fill this FIR form with [case details]"
- Procedure guidance: "What steps for POCSO investigation?"

---

## 2. Case Analysis Endpoints

### **POST `/api/generate-checklist`**

Generates AI-powered investigation checklist based on case details.

**Uses AI Chains:**
- Checklist Generator Chain

**Request Body:**
```json
{
  "case_type": "POCSO",
  "victim_age": 15,
  "incident_details": "Sexual assault at school",
  "current_status": "FIR filed"
}
```

**Response:**
```json
{
  "case_type": "POCSO",
  "checklist": [
    {
      "step": "Medical examination within 24 hours",
      "priority": "URGENT",
      "status": "pending",
      "legal_basis": "POCSO Section 27"
    },
    {
      "step": "Notify Child Welfare Committee",
      "priority": "URGENT",
      "status": "pending",
      "legal_basis": "POCSO Section 19"
    }
  ],
  "generated_at": "2025-10-04T10:00:00Z"
}
```

**Use Cases:**
- Generate investigation checklist after case filing
- Get prioritized action items
- Ensure compliance with legal procedures

---

### **POST `/api/next-action`**

Recommends the immediate next action for an investigation.

**Uses AI Chains:**
- Next Action Recommender Chain

**Request Body:**
```json
{
  "case_id": "CASE_001",
  "case_type": "Sexual Assault",
  "current_stage": "Evidence collection",
  "completed_steps": ["FIR filed", "Medical exam done"],
  "pending_issues": ["CCTV footage not retrieved", "Witness statements pending"]
}
```

**Response:**
```json
{
  "case_id": "CASE_001",
  "next_action": "Secure CCTV footage from bus stand immediately",
  "priority": "HIGH",
  "reasoning": "Evidence may be overwritten after 7 days",
  "suggested_at": "2025-10-04T10:00:00Z"
}
```

---

### **POST `/api/analyze-evidence-gaps`**

Analyzes case to identify missing evidence and gaps.

**Uses AI Chains:**
- Evidence Gap Analyzer Chain

**Request Body:**
```json
{
  "case_id": "CASE_001",
  "case_type": "Rape",
  "evidence_collected": ["Victim statement", "Medical report"],
  "case_details": "Incident at bus stop, accused known"
}
```

**Response:**
```json
{
  "case_id": "CASE_001",
  "gaps_identified": [
    "No CCTV footage collected",
    "Accused statement not recorded",
    "Scene of crime photos missing",
    "Witness statements incomplete"
  ],
  "recommendations": [
    "Obtain CCTV from nearby shops",
    "Arrest and interrogate accused",
    "Document crime scene with photos"
  ],
  "analyzed_at": "2025-10-04T10:00:00Z"
}
```

---

### **POST `/api/review-document-quality`**

Reviews legal document quality and suggests improvements.

**Uses AI Chains:**
- Document Quality Reviewer Chain

**Request Body:**
```json
{
  "case_id": "CASE_001",
  "case_type": "POCSO",
  "document_type": "FIR",
  "document_content": "On 2nd Oct 2025, victim reported incident..."
}
```

**Response:**
```json
{
  "case_id": "CASE_001",
  "document_type": "FIR",
  "quality_review": "Document is complete but missing time of incident and specific location details. Add accused description.",
  "reviewed_at": "2025-10-04T10:00:00Z"
}
```

---

## 3. Conversational Interrogation (NEW)

### **POST `/api/conversational-question`**

Gets the next intelligent question in conversational interrogation flow.

**Uses AI Chains:**
- Completion Checker Chain (is case complete?)
- Question Decider Chain (what to ask next?)

**Request Body:**
```json
{
  "case_id": "CASE_001",
  "session_id": "uuid-here",
  "case_data": {
    "caseId": "CASE_001",
    "caseTitle": "Rape Case",
    "victimAge": "22",
    "incidentDate": "2025-10-02"
  },
  "conversation_history": [
    {"role": "ai", "content": "What is victim's name?"},
    {"role": "user", "content": "Aya Varsela"}
  ],
  "extracted_data": {
    "victim_name": "Aya Varsela",
    "accused_name": "Sammy Gonsalves"
  }
}
```

**Response (Not Complete):**
```json
{
  "complete": false,
  "question": "What exactly happened during the incident? Please describe what the accused did.",
  "question_type": "follow-up",
  "category": "INCIDENT_DETAILS",
  "priority": "CRITICAL",
  "is_urgent": false,
  "legal_basis": "General investigation procedure",
  "progress": {
    "case_info": 45,
    "evidence": 0,
    "compliance": 0,
    "witnesses": 0
  }
}
```

**Response (Complete):**
```json
{
  "complete": true,
  "summary": "Case interrogation complete! 100% information gathered.",
  "progress": {
    "case_info": 100,
    "evidence": 100,
    "compliance": 100,
    "witnesses": 100
  },
  "final_data": {
    "caseId": "CASE_001",
    "title": "Rape Case",
    "basicDetails": {...},
    "keyEvidence": [...],
    "suspectDetails": [...],
    "legalSections": [...],
    "investigationGuide": [...],
    "aiAnalysis": {...},
    "complianceChecklist": [...],
    "progress": {...},
    "conversationTranscript": [...],
    "extractedRawData": {...},
    "references": {...},
    "lastUpdated": "2025-10-04T10:00:00Z"
  }
}
```

**Use Cases:**
- Progressive case information gathering
- Intelligent follow-up questioning
- Adaptive interrogation based on answers
- Automatic completion detection

---

### **POST `/api/process-answer`**

Analyzes Investigation Officer's answer and extracts structured data.

**Uses AI Chains:**
- Answer Analyzer Chain

**Request Body:**
```json
{
  "case_id": "CASE_001",
  "session_id": "uuid-here",
  "question": "What exactly happened during the incident?",
  "answer": "The accused approached the victim at midnight when she was alone at the bus stop, touched her inappropriately, and threatened her not to report.",
  "case_data": {
    "caseTitle": "Sexual Assault",
    "victimAge": "22"
  },
  "conversation_history": [...],
  "extracted_data": {
    "victim_name": "Aya Varsela"
  }
}
```

**Response:**
```json
{
  "success": true,
  "extracted_data": {
    "incident_type": "sexual assault",
    "incident_time": "midnight",
    "victim_state": "alone",
    "accused_action": "touched inappropriately",
    "threat_made": "threatened not to report",
    "incident_description": "The accused approached the victim at midnight..."
  },
  "quality_assessment": "Complete and detailed answer with specific actions",
  "needs_clarification": false,
  "clarification_reason": null,
  "compliance_alerts": [],
  "confidence_score": 0.95
}
```

**Response (Needs Clarification):**
```json
{
  "success": true,
  "extracted_data": {
    "raw_answer": "Something happened"
  },
  "quality_assessment": "Vague answer, lacks specific details",
  "needs_clarification": true,
  "clarification_reason": "Could you please provide more specific details about what exactly happened?",
  "compliance_alerts": [],
  "confidence_score": 0.3
}
```

**Use Cases:**
- Extract structured data from natural language
- Assess answer quality
- Detect clarification needs
- Identify compliance issues

---

## 4. Legacy Question System

### **POST `/api/generate-questions`**

Generates form-based questions (all at once, not conversational).

**Uses AI Chains:**
- Question Generator Chain

**Request Body:**
```json
{
  "case_id": "CASE_001",
  "case_type": "POCSO",
  "case_description": "Sexual assault case",
  "victim_age": 15,
  "incident_date": "2025-10-02",
  "location": "School"
}
```

**Response:**
```json
{
  "case_id": "CASE_001",
  "questions": [
    {
      "question": "What is the victim's full name?",
      "type": "text",
      "required": true,
      "category": "VICTIM_DETAILS"
    },
    {
      "question": "Has medical examination been completed?",
      "type": "select",
      "required": true,
      "options": ["Yes", "No", "In Progress"],
      "category": "LEGAL_COMPLIANCE",
      "legal_basis": "POCSO Section 27"
    }
  ],
  "generated_at": "2025-10-04T10:00:00Z"
}
```

**Use Cases:**
- Generate all questions upfront (form-based approach)
- Get predefined question set for case type

**Note:** This is the **old approach**. Use `/api/conversational-question` for intelligent progressive questioning.

---

### **POST `/api/submit-answers`**

Submits batch answers from form-based questions.

**Request Body:**
```json
{
  "case_id": "CASE_001",
  "session_id": "uuid-here",
  "answers": {
    "0": "Aya Varsela",
    "1": "Yes - Completed at District Hospital",
    "2": "Sammy Gonsalves"
  }
}
```

**Response:**
```json
{
  "case_id": "CASE_001",
  "session_id": "uuid-here",
  "success": true,
  "enhanced_case_data": {
    "answers_submitted": 3,
    "structured_answers": {
      "answer_0": "Aya Varsela",
      "answer_1": "Yes - Completed at District Hospital",
      "answer_2": "Sammy Gonsalves"
    },
    "case_enhancement_complete": true
  }
}
```

**Note:** This is for **legacy form-based** approach.

---

## 5. Utility Endpoints

### **GET `/`**

Health check endpoint.

**Response:**
```json
{
  "message": "CaseSwift AI API is running",
  "status": "active"
}
```

---

## 🎯 Recommended Flow for New Cases

### **Option 1: Conversational Interrogation (RECOMMENDED)**

```
1. POST /api/conversational-question
   → Get first question
   
2. User answers
   
3. POST /api/process-answer
   → Extract data, assess quality
   
4. POST /api/conversational-question
   → Get next question (or completion)
   
5. Repeat 2-4 until complete=true
   
6. Use final_data for case report
```

### **Option 2: Traditional Analysis**

```
1. POST /api/generate-checklist
   → Get investigation checklist
   
2. POST /api/next-action
   → Get immediate next step
   
3. POST /api/analyze-evidence-gaps
   → Identify missing evidence
   
4. POST /api/review-document-quality
   → Review FIR/statements
```

### **Option 3: General Chat**

```
1. POST /api/chat
   → Ask legal questions
   → Get procedural guidance
   → Fill forms
```

---

## 🔐 CORS Configuration

The API allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative frontend)

**Methods Allowed:** GET, POST, PUT, DELETE  
**Headers Allowed:** Content-Type, Authorization

---

## 🚀 Server Startup

```bash
cd ChatBot
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

**Wait for:**
```
--- Loading models and building all chains ---
Application startup complete.
Uvicorn running on http://0.0.0.0:8000
```

---

## 📊 AI Chains Used

1. **Router Chain** - Determines user intent
2. **Q&A Chain** - Answers legal questions
3. **Form Filler Chain** - Fills out legal forms
4. **Guide Chain** - Provides procedural guidance
5. **Checklist Generator Chain** - Creates investigation checklists
6. **Next Action Chain** - Recommends immediate actions
7. **Evidence Gap Analyzer Chain** - Identifies missing evidence
8. **Document Quality Chain** - Reviews document quality
9. **Question Generator Chain** - Generates form questions
10. **Answer Analyzer Chain** - Extracts data from answers
11. **Question Decider Chain** - Decides next question intelligently
12. **Completion Checker Chain** - Determines case completeness

---

## 🐛 Common Errors

### **503 Service Unavailable**
```json
{"detail": "Chains are not ready"}
```
**Fix:** Wait for server startup to complete. Check terminal for "Application startup complete."

### **422 Unprocessable Entity**
```json
{"detail": [{"loc": ["body", "field"], "msg": "field required"}]}
```
**Fix:** Check request body has all required fields.

### **500 Internal Server Error**
```json
{"detail": "Failed to get next question: ..."}
```
**Fix:** Check server logs for LLM errors or chain issues.

---

## 📞 Support

**Server:** FastAPI + Uvicorn  
**Port:** 8000  
**LLM:** Ollama (Llama 3.2)  
**Vector DB:** ChromaDB  
**Embeddings:** HuggingFace (mixedbread-ai/mxbai-embed-large-v1)

---

**Total Endpoints:** 10 (9 POST + 1 GET)  
**Conversational System:** `/api/conversational-question` + `/api/process-answer`  
**Recommended for New Cases:** Conversational endpoints ✅
