# 📋 JSON Format Guide - CaseSwift Conversational AI

## ✅ Your Format is BETTER!

The structured JSON format you showed is **exactly** what we should generate at the end. I've now integrated it into the system!

---

## 🔄 How It Works Now

### **Phase 1: During Conversation (Simple)**
While AI is asking questions, we collect simple key-value pairs:

```json
{
  "victim_name": "Aya Varsela",
  "accused_name": "Sammy Gonsalves",
  "incident_date": "2nd October 2025",
  "location": "margao bus stop",
  "incident_time": "midnight",
  "evidence_items": ["Victim's clothing", "CCTV footage"],
  "medical_exam_status": "Completed"
}
```

**Why:** Easy to update incrementally as AI extracts each piece of information.

---

### **Phase 2: After Completion (Structured)**
When conversation completes, we **transform** to your structured format:

```json
{
  "caseId": "CASE_001",
  "title": "Sexual Assault at Bus Stop",
  "basicDetails": {
    "victimName": "Aya Varsela",
    "age": 22,
    "gender": "Female",
    "location": "margao bus stop",
    "incidentDate": "2025-10-02",
    "incidentTime": "00:00",
    "reportedBy": "Victim",
    "category": "Sexual Assault"
  },
  "description": "The accused approached victim at midnight when she was alone...",
  "keyEvidence": [
    {
      "type": "Physical Evidence",
      "details": "Victim's clothing",
      "status": "collected"
    },
    {
      "type": "CCTV Footage",
      "details": "Bus stand camera",
      "status": "pending"
    },
    {
      "type": "Medical Report",
      "details": "Medical examination: Completed at District Hospital",
      "status": "collected"
    }
  ],
  "suspectDetails": [
    {
      "name": "Sammy Gonsalves",
      "description": "30 year old man",
      "lastSeen": "margao bus stop"
    }
  ],
  "legalSections": [
    {
      "section": "BNS 63 (IPC 376)",
      "description": "Punishment for rape"
    }
  ],
  "investigationGuide": [
    "Review all collected evidence and witness statements",
    "Secure and review CCTV footage from incident location",
    "Record detailed statements from all identified witnesses"
  ],
  "aiAnalysis": {
    "riskLevel": "Medium",
    "suggestedNextStep": "Review all collected evidence and witness statements",
    "relatedCases": [],
    "urgentActions": []
  },
  "complianceChecklist": [
    {
      "task": "FIR filed within 24 hours",
      "status": false
    },
    {
      "task": "Medical examination conducted",
      "status": true
    },
    {
      "task": "Witness statements recorded",
      "status": false
    },
    {
      "task": "Evidence preserved and logged",
      "status": false
    },
    {
      "task": "Scene of crime documented",
      "status": false
    }
  ],
  "progress": {
    "checklistCompleted": 1,
    "totalChecklist": 5,
    "completionPercentage": 20
  },
  "conversationTranscript": [
    {"role": "ai", "content": "What is victim's name?"},
    {"role": "user", "content": "Aya Varsela"},
    ...
  ],
  "extractedRawData": {
    "victim_name": "Aya Varsela",
    ...
  },
  "references": {
    "relatedReports": [],
    "uploadedDocuments": [],
    "externalLinks": []
  },
  "lastUpdated": "2025-10-04T10:00:00Z"
}
```

---

## 📁 Files Created/Modified

### **1. `ChatBot/case_transformer.py` (NEW)**
- Function: `transform_to_case_structure()`
- Converts simple extracted data → structured case format
- Automatically:
  - Detects POCSO cases (age < 18)
  - Adds appropriate legal sections
  - Generates investigation guide
  - Creates compliance checklist
  - Calculates progress
  - Determines risk level

### **2. `ChatBot/api.py` (MODIFIED)**
- Added import: `from case_transformer import transform_to_case_structure`
- Modified `/api/conversational-question` endpoint
- When `complete=true`, automatically transforms data
- Returns structured case in `final_data` field

---

## 🎯 Benefits of Your Format

### ✅ **Better Structure**
- Clear sections for different data types
- Nested objects for related information
- Arrays for multiple items (evidence, suspects, etc.)

### ✅ **Ready for Database**
- Can be stored directly in MongoDB
- Or normalized into PostgreSQL tables
- Easy to query and filter

### ✅ **Ready for UI**
- Frontend can directly display sections
- Progress tracking built-in
- Compliance checklist ready to render

### ✅ **Investigation-Ready**
- Clear investigation guide
- Checklist for officers
- Legal sections pre-identified
- Risk assessment included

### ✅ **Audit Trail**
- Includes full conversation transcript
- Raw extracted data preserved
- Timestamps for accountability

---

## 🔄 Complete Flow

```
1. User fills NewCaseForm
   ↓
2. Conversational AI starts
   ↓
3. AI asks questions one-by-one
   ↓
4. Simple key-value extraction:
   {victim_name: "...", accused_name: "...", ...}
   ↓
5. Completion detector: is_complete = true
   ↓
6. Transform to structured format (Your JSON)
   ↓
7. Return to frontend in final_data field
   ↓
8. Frontend saves to database
   ↓
9. Generate case report PDF/dashboard
```

---

## 📊 API Response (When Complete)

**GET** `/api/conversational-question` returns:

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
    "title": "...",
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

---

## 🚀 Next Steps

### **1. Test the Transformation**
Run a complete conversational flow and verify the structured output:
```bash
cd ChatBot
python case_transformer.py  # Test transformation function
```

### **2. Save to Database**
In `NewCaseForm.jsx` `handleConversationalComplete()`:
```javascript
const handleConversationalComplete = async (finalData) => {
  // finalData now has your structured format!
  
  // Save to backend database
  await axios.post(`${NODE_API_URL}/api/cases/${caseId}/complete`, {
    structuredCase: finalData
  });
  
  // Or use the data to generate report
  setAnalysisData(finalData);
  setShowAnalysisReport(true);
}
```

### **3. Display Structured Data**
Create UI components for each section:
- `<BasicDetailsCard data={finalData.basicDetails} />`
- `<EvidenceList items={finalData.keyEvidence} />`
- `<ComplianceChecklist items={finalData.complianceChecklist} />`
- `<InvestigationGuide steps={finalData.investigationGuide} />`

---

## ✅ Summary

**Your JSON format is MUCH better than simple key-value pairs!**

✅ Implemented transformation function  
✅ Integrated into completion flow  
✅ Automatically generates on conversation end  
✅ Includes all sections you specified  
✅ Ready for database storage  
✅ Ready for UI display  

**The system now produces professional, structured case files! 🎉**
