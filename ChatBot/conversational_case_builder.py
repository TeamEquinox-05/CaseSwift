"""
Conversational Case Builder
Professional AI system for building legal cases through intelligent questioning
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class ConversationalCaseBuilder:
    """Manages intelligent conversational case building with structured data extraction"""
    
    # Define the 4 main sections and their required fields
    SECTIONS = {
        "case_info": {
            "name": "Case Information",
            "fields": [
                "case_type", "incident_description", "incident_location",
                "incident_time", "victim_statement", "accused_description"
            ],
            "questions": {
                "case_type": "What type of case is this? (e.g., Sexual Assault, Domestic Violence, Theft)",
                "incident_description": "Can you describe what happened in detail?",
                "incident_location": "Where exactly did the incident occur?",
                "incident_time": "When did this incident take place? (Date and time)",
                "victim_statement": "What did the victim say happened?",
                "accused_description": "Can you describe the accused person(s)?"
            }
        },
        "evidence": {
            "name": "Evidence Collection",
            "fields": [
                "physical_evidence", "digital_evidence", "medical_evidence",
                "witness_statements", "forensic_reports", "cctv_footage"
            ],
            "questions": {
                "physical_evidence": "What physical evidence has been collected? (e.g., clothing, weapons, objects)",
                "digital_evidence": "Is there any digital evidence? (e.g., messages, emails, photos, videos)",
                "medical_evidence": "Has a medical examination been conducted? What were the findings?",
                "witness_statements": "Have witness statements been recorded? How many witnesses?",
                "forensic_reports": "Are there any forensic reports available?",
                "cctv_footage": "Is there CCTV or video footage available?"
            }
        },
        "compliance": {
            "name": "Legal Compliance",
            "fields": [
                "fir_filed", "fir_number", "investigation_timeline",
                "victim_rights_informed", "legal_aid_offered", "mandatory_reporting"
            ],
            "questions": {
                "fir_filed": "Has an FIR been filed?",
                "fir_number": "What is the FIR number and date?",
                "investigation_timeline": "What is the investigation timeline so far?",
                "victim_rights_informed": "Have victim's rights been explained to them?",
                "legal_aid_offered": "Has legal aid been offered to the victim?",
                "mandatory_reporting": "Have all mandatory reporting requirements been fulfilled?"
            }
        },
        "witnesses": {
            "name": "Witness Information",
            "fields": [
                "witness_count", "witness_details", "witness_credibility",
                "expert_witnesses", "protection_needed"
            ],
            "questions": {
                "witness_count": "How many witnesses are there?",
                "witness_details": "Can you provide details about each witness? (Name, relation, what they saw)",
                "witness_credibility": "How credible are the witnesses?",
                "expert_witnesses": "Are there any expert witnesses? (e.g., forensic experts, medical professionals)",
                "protection_needed": "Do any witnesses require protection?"
            }
        }
    }

    def __init__(self):
        self.conversations = {}  # session_id -> conversation_state
        
    def start_conversation(self, session_id: str, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize a new conversational case building session"""
        
        # Initialize conversation state
        self.conversations[session_id] = {
            "case_id": case_data.get("caseId"),
            "case_title": case_data.get("caseTitle"),
            "initial_data": case_data,
            "current_section": "case_info",
            "current_field_index": 0,
            "extracted_data": {},
            "progress": {
                "case_info": 0,
                "evidence": 0,
                "compliance": 0,
                "witnesses": 0
            },
            "conversation_history": [],
            "started_at": datetime.now().isoformat()
        }
        
        # Determine if POCSO case
        victim_age = case_data.get("victimAge")
        is_pocso = victim_age and int(victim_age) < 18
        
        # Generate first question
        greeting = f"""Hello! I'll help you build a complete case file for **{case_data.get('caseTitle', 'this case')}**.

{'⚠️ **POCSO Case Detected** - This involves a minor. Special protocols will be followed.' if is_pocso else ''}

I'll ask you questions across 4 sections:
1. **Case Information** - Basic details about the incident
2. **Evidence Collection** - All evidence gathered
3. **Legal Compliance** - Procedural requirements
4. **Witness Information** - Witness details

Let's start with **Case Information**:

"""
        
        first_question = self._get_next_question(session_id)
        
        return {
            "message": greeting + first_question,
            "session_id": session_id,
            "section": "case_info",
            "progress": self.conversations[session_id]["progress"],
            "is_complete": False
        }
    
    def process_answer(self, session_id: str, user_answer: str) -> Dict[str, Any]:
        """Process user's answer and generate next question"""
        
        if session_id not in self.conversations:
            return {
                "error": "Session not found",
                "message": "Please start a new conversation."
            }
        
        conv = self.conversations[session_id]
        
        # Store the answer
        current_section = conv["current_section"]
        field_index = conv["current_field_index"]
        fields = list(self.SECTIONS[current_section]["fields"])
        
        if field_index < len(fields):
            current_field = fields[field_index]
            
            # Extract and store the answer
            conv["extracted_data"][current_field] = user_answer
            
            # Add to conversation history
            conv["conversation_history"].append({
                "field": current_field,
                "answer": user_answer,
                "timestamp": datetime.now().isoformat()
            })
            
            # Move to next field
            conv["current_field_index"] += 1
            
            # Update progress for current section
            total_fields = len(fields)
            completed_fields = conv["current_field_index"]
            conv["progress"][current_section] = int((completed_fields / total_fields) * 100)
        
        # Check if section is complete
        if conv["current_field_index"] >= len(fields):
            # Move to next section
            sections_order = ["case_info", "evidence", "compliance", "witnesses"]
            current_section_index = sections_order.index(current_section)
            
            if current_section_index < len(sections_order) - 1:
                # Move to next section
                next_section = sections_order[current_section_index + 1]
                conv["current_section"] = next_section
                conv["current_field_index"] = 0
                
                section_name = self.SECTIONS[next_section]["name"]
                transition_message = f"\n✅ **{self.SECTIONS[current_section]['name']}** completed!\n\nNow let's move to **{section_name}**:\n\n"
                next_question = self._get_next_question(session_id)
                
                return {
                    "message": transition_message + next_question,
                    "session_id": session_id,
                    "section": next_section,
                    "progress": conv["progress"],
                    "is_complete": False
                }
            else:
                # All sections complete
                conv["progress"][current_section] = 100
                return {
                    "message": "🎉 **All sections completed!** Your case file is now complete with all necessary information.",
                    "session_id": session_id,
                    "section": current_section,
                    "progress": conv["progress"],
                    "is_complete": True,
                    "extracted_data": conv["extracted_data"]
                }
        
        # Get next question in current section
        next_question = self._get_next_question(session_id)
        
        return {
            "message": next_question,
            "session_id": session_id,
            "section": current_section,
            "progress": conv["progress"],
            "is_complete": False
        }
    
    def _get_next_question(self, session_id: str) -> str:
        """Get the next question based on conversation state"""
        conv = self.conversations[session_id]
        current_section = conv["current_section"]
        field_index = conv["current_field_index"]
        
        fields = list(self.SECTIONS[current_section]["fields"])
        questions = self.SECTIONS[current_section]["questions"]
        
        if field_index < len(fields):
            current_field = fields[field_index]
            question = questions.get(current_field, f"Please provide information about {current_field}")
            
            # Add legal references for specific questions
            legal_refs = self._get_legal_reference(current_section, current_field)
            if legal_refs:
                question += f"\n\n📖 *Legal Basis: {legal_refs}*"
            
            return question
        
        return "Section complete."
    
    def _get_legal_reference(self, section: str, field: str) -> Optional[str]:
        """Get relevant legal references for specific fields"""
        references = {
            "medical_evidence": "Section 164A CrPC - Medical Examination",
            "fir_filed": "Section 154 CrPC - FIR Registration",
            "victim_rights_informed": "Section 357A CrPC - Victim Compensation",
            "witness_protection": "Section 164 CrPC - Statement Before Magistrate"
        }
        return references.get(field)
    
    def get_conversation_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get current state of conversation"""
        return self.conversations.get(session_id)
    
    def pause_conversation(self, session_id: str) -> Dict[str, Any]:
        """Pause and save conversation state"""
        if session_id in self.conversations:
            conv = self.conversations[session_id]
            return {
                "success": True,
                "message": "Conversation paused and saved",
                "progress": conv["progress"],
                "extracted_data": conv["extracted_data"]
            }
        return {"success": False, "message": "Session not found"}
    
    def resume_conversation(self, session_id: str, saved_state: Dict[str, Any]) -> Dict[str, Any]:
        """Resume a paused conversation"""
        self.conversations[session_id] = saved_state
        
        greeting = f"Welcome back! Let's continue building your case file.\n\n"
        next_question = self._get_next_question(session_id)
        
        return {
            "message": greeting + next_question,
            "session_id": session_id,
            "section": saved_state["current_section"],
            "progress": saved_state["progress"],
            "is_complete": False
        }


# Global instance
case_builder = ConversationalCaseBuilder()
