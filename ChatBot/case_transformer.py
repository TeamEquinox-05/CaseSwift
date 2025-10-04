"""
Transform conversational AI extracted data into structured case format
"""
from datetime import datetime
from typing import Dict, Any, List

def transform_to_case_structure(
    case_id: str,
    initial_case_data: Dict[str, Any],
    extracted_data: Dict[str, Any],
    conversation_history: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Transform conversational AI output into structured case format
    
    Args:
        case_id: Case identifier
        initial_case_data: Original form data from NewCaseForm
        extracted_data: Data extracted during AI conversation
        conversation_history: Full conversation transcript
    
    Returns:
        Structured case JSON matching your format
    """
    
    # Determine case category based on initial data
    case_title = initial_case_data.get('caseTitle', 'Untitled Case')
    victim_age = extracted_data.get('victim_age', initial_case_data.get('victimAge', 0))
    
    # Determine if POCSO case
    is_pocso = False
    category = "General"
    legal_sections = []
    
    try:
        age = int(victim_age)
        if age < 18:
            is_pocso = True
            category = "POCSO"
            legal_sections.append({
                "section": "POCSO Act 2012",
                "description": "Protection of Children from Sexual Offences"
            })
    except:
        pass
    
    # Build basic details
    basic_details = {
        "victimName": extracted_data.get('victim_name', 'Unknown'),
        "age": victim_age,
        "gender": initial_case_data.get('victimGender', extracted_data.get('victim_gender', 'Unknown')),
        "location": extracted_data.get('location', initial_case_data.get('victimLocation', 'Unknown')),
        "incidentDate": extracted_data.get('incident_date', initial_case_data.get('incidentDate', '')),
        "incidentTime": extracted_data.get('incident_time', initial_case_data.get('incidentTime', '')),
        "reportedBy": "Victim",
        "category": category
    }
    
    # Build description from extracted data
    description = extracted_data.get(
        'incident_description',
        initial_case_data.get('caseDescription', 'No description provided')
    )
    
    # Build evidence list
    key_evidence = []
    evidence_items = extracted_data.get('evidence_items', [])
    if isinstance(evidence_items, list):
        for item in evidence_items:
            if isinstance(item, dict):
                key_evidence.append(item)
            else:
                key_evidence.append({
                    "type": "Physical Evidence",
                    "details": str(item),
                    "status": "pending"
                })
    
    # Add medical exam as evidence if mentioned
    medical_status = extracted_data.get('medical_exam_status', '')
    if medical_status:
        key_evidence.append({
            "type": "Medical Report",
            "details": f"Medical examination: {medical_status}",
            "status": "collected" if "completed" in medical_status.lower() else "pending"
        })
    
    # Build suspect details
    suspect_details = []
    accused_name = extracted_data.get('accused_name', '')
    accused_description = extracted_data.get('accused_description', '')
    
    if accused_name or accused_description:
        suspect_details.append({
            "name": accused_name or "Unknown",
            "description": accused_description or "No description",
            "lastSeen": extracted_data.get('accused_last_seen', 'Unknown')
        })
    
    # Add IPC/BNS sections based on case type
    if "rape" in case_title.lower() or "sexual" in case_title.lower():
        legal_sections.append({
            "section": "BNS 63 (IPC 376)",
            "description": "Punishment for rape"
        })
    elif "assault" in case_title.lower():
        legal_sections.append({
            "section": "BNS 115 (IPC 323)",
            "description": "Punishment for voluntarily causing hurt"
        })
    elif "theft" in case_title.lower():
        legal_sections.append({
            "section": "BNS 303 (IPC 379)",
            "description": "Punishment for theft"
        })
    
    # Build investigation guide from extracted data
    investigation_guide = []
    
    # Add standard steps
    investigation_guide.append("Review all collected evidence and witness statements")
    
    if extracted_data.get('cctv_available'):
        investigation_guide.append("Secure and review CCTV footage from incident location")
    
    if extracted_data.get('witnesses'):
        investigation_guide.append("Record detailed statements from all identified witnesses")
    
    if medical_status and "pending" in medical_status.lower():
        investigation_guide.append("Arrange medical examination urgently")
    
    if is_pocso:
        investigation_guide.append("Notify Child Welfare Committee within 24 hours")
        investigation_guide.append("Ensure support person/NGO is arranged for victim")
        investigation_guide.append("Record statement with female officer present")
    
    # Build compliance checklist
    compliance_checklist = []
    procedures_completed = extracted_data.get('procedures_completed', [])
    procedures_pending = extracted_data.get('procedures_pending', [])
    
    # Standard compliance items
    compliance_items = [
        "FIR filed within 24 hours",
        "Medical examination conducted",
        "Witness statements recorded",
        "Evidence preserved and logged",
        "Scene of crime documented"
    ]
    
    if is_pocso:
        compliance_items.extend([
            "CWC notified within 24 hours",
            "Support person arranged",
            "Statement recorded by female officer"
        ])
    
    for item in compliance_items:
        is_completed = any(item.lower() in str(proc).lower() for proc in procedures_completed)
        compliance_checklist.append({
            "task": item,
            "status": is_completed
        })
    
    # Calculate progress
    completed_count = sum(1 for item in compliance_checklist if item['status'])
    total_count = len(compliance_checklist)
    completion_percentage = int((completed_count / total_count * 100)) if total_count > 0 else 0
    
    # AI Analysis
    ai_analysis = {
        "riskLevel": "High" if is_pocso else "Medium",
        "suggestedNextStep": investigation_guide[0] if investigation_guide else "Begin investigation",
        "relatedCases": [],
        "urgentActions": []
    }
    
    # Add urgent actions for POCSO
    if is_pocso:
        if "medical" in str(procedures_pending).lower():
            ai_analysis["urgentActions"].append("Medical exam within 24 hours (POCSO Section 27)")
        if "cwc" in str(procedures_pending).lower():
            ai_analysis["urgentActions"].append("CWC notification immediate")
    
    # Build final structure
    case_structure = {
        "caseId": case_id,
        "title": case_title,
        "basicDetails": basic_details,
        "description": description,
        "keyEvidence": key_evidence,
        "suspectDetails": suspect_details,
        "legalSections": legal_sections,
        "investigationGuide": investigation_guide,
        "aiAnalysis": ai_analysis,
        "complianceChecklist": compliance_checklist,
        "progress": {
            "checklistCompleted": completed_count,
            "totalChecklist": total_count,
            "completionPercentage": completion_percentage
        },
        "conversationTranscript": conversation_history,
        "extractedRawData": extracted_data,
        "references": {
            "relatedReports": [],
            "uploadedDocuments": initial_case_data.get('evidenceFiles', []),
            "externalLinks": []
        },
        "lastUpdated": datetime.now().isoformat()
    }
    
    return case_structure


# ============================================================================
# EXAMPLE/TEST CODE BELOW - NOT USED IN PRODUCTION
# This is only for testing the transformer function manually
# In production, the AI extracts real data from officer's conversation
# ============================================================================

if __name__ == "__main__":
    import json
    
    print("=" * 60)
    print("TESTING case_transformer.py with EXAMPLE data")
    print("(This is NOT real case data - just for testing)")
    print("=" * 60)
    
    # Example test data - replace with any case for testing
    initial_data = {
        "caseId": "TEST_CASE_001",
        "caseTitle": "Example Sexual Assault Case",
        "caseDescription": "Test incident for transformer",
        "victimAge": "22",
        "victimGender": "Female",
        "victimLocation": "Test Location",
        "incidentDate": "2025-10-02",
        "incidentTime": "00:00"
    }
    
    # Example extracted data - in production, this comes from AI conversation
    extracted = {
        "victim_name": "Example Victim Name",  # ← Replace with any name
        "accused_name": "Example Accused Name",  # ← Replace with any name
        "incident_date": "2nd October 2025",
        "location": "test location",
        "incident_time": "midnight",
        "incident_description": "Example incident description...",
        "evidence_items": ["Example evidence 1", "Example evidence 2"],
        "medical_exam_status": "Example status",
        "witnesses": ["Example witness"],
        "procedures_completed": ["Example procedure"],
        "procedures_pending": ["Example pending"]
    }
    
    conversation = [
        {"role": "ai", "content": "Example question?"},
        {"role": "user", "content": "Example answer"}
    ]
    
    print("\n📥 Input (Example):")
    print(f"Victim: {extracted['victim_name']}")
    print(f"Accused: {extracted['accused_name']}")
    
    result = transform_to_case_structure("TEST_CASE_001", initial_data, extracted, conversation)
    
    print("\n📤 Output (Structured):")
    print(json.dumps(result, indent=2))
    
    print("\n✅ Transformation successful!")
    print("Note: In production, names come from real AI conversation, not hardcoded!")
