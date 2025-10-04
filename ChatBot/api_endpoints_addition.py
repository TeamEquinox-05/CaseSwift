
import datetime
from http.client import HTTPException
import json
import re
from ChatBot import app
from ChatBot.api import AnswersSubmissionRequest, AnswersSubmissionResponse, QuestionGenerationRequest, QuestionGenerationResponse


@app.post("/api/generate-questions", response_model=QuestionGenerationResponse)
async def generate_dynamic_questions(request: QuestionGenerationRequest):
    """Generate dynamic, AI-powered questions based on case details"""
    if "question_generator_chain" not in ml_models:
        raise HTTPException(status_code=503, detail="Question generator chain not ready")
    
    try:
        # Determine case type from details
        case_type = request.case_type
        if request.victim_age and request.victim_age.isdigit() and int(request.victim_age) < 18:
            case_type += " (POCSO applicable)"
        
        questions_json = await ml_models["question_generator_chain"].ainvoke({
            "case_type": case_type,
            "case_description": request.case_description,
            "victim_age": request.victim_age,
            "incident_date": request.incident_date,
            "location": request.location
        })
        
        # Parse JSON response from LLM
        json_match = re.search(r'```json\n(.*?)\n```', questions_json, re.DOTALL)
        if json_match:
            questions_data = json.loads(json_match.group(1))
        else:
            # Try to find JSON array in the response
            json_match = re.search(r'\[(.*?)\]', questions_json, re.DOTALL)
            if json_match:
                questions_data = json.loads('[' + json_match.group(1) + ']')
            else:
                questions_data = json.loads(questions_json)
        
        return QuestionGenerationResponse(
            case_id=request.case_id,
            questions=questions_data,
            generated_at=datetime.now().isoformat()
        )
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw response: {questions_json}")
        # Return default questions if parsing fails
        is_pocso = request.victim_age and request.victim_age.isdigit() and int(request.victim_age) < 18
        
        default_questions = [
            {
                "question": "What is the complete name of the victim?",
                "type": "text",
                "required": True,
                "placeholder": "Full name as per identity documents",
                "category": "VICTIM_DETAILS"
            },
            {
                "question": "What is the victim's date of birth?",
                "type": "date",
                "required": is_pocso,
                "placeholder": "DD/MM/YYYY",
                "category": "VICTIM_DETAILS",
                "legal_basis": "POCSO Act Section 34 - Age determination" if is_pocso else ""
            },
            {
                "question": "What is the complete name of the accused?",
                "type": "text",
                "required": True,
                "placeholder": "Full name (if known)",
                "category": "ACCUSED_DETAILS"
            },
            {
                "question": "What is the relationship between the victim and accused?",
                "type": "select",
                "required": True,
                "options": ["Family Member", "Neighbor", "Friend/Acquaintance", "Stranger", "Teacher/Guardian", "Employer", "Other"],
                "category": "CASE_CONTEXT"
            },
            {
                "question": "Provide a detailed description of the incident",
                "type": "textarea",
                "required": True,
                "placeholder": "Describe the sequence of events in detail...",
                "category": "INCIDENT_DETAILS"
            },
            {
                "question": "What is the exact location where the incident occurred?",
                "type": "textarea",
                "required": True,
                "placeholder": "Complete address with landmarks",
                "category": "INCIDENT_DETAILS"
            },
            {
                "question": "Has the medical examination been conducted?",
                "type": "select",
                "required": True,
                "options": ["Yes", "No", "Scheduled"],
                "category": "EVIDENCE",
                "legal_basis": "CrPC Section 164A - Mandatory medical examination"
            },
            {
                "question": "List all physical evidence collected",
                "type": "textarea",
                "required": False,
                "placeholder": "Clothing, biological samples, weapons, etc.",
                "category": "EVIDENCE"
            },
            {
                "question": "Are there any eyewitnesses?",
                "type": "select",
                "required": True,
                "options": ["Yes", "No", "Not Sure"],
                "category": "WITNESSES"
            },
            {
                "question": "Has the scene of crime been documented?",
                "type": "select",
                "required": True,
                "options": ["Yes - Photos taken", "Yes - Video recorded", "Yes - Both", "No"],
                "category": "PROCEDURAL"
            }
        ]
        
        if is_pocso:
            default_questions.extend([
                {
                    "question": "Has the Child Welfare Committee been notified?",
                    "type": "select",
                    "required": True,
                    "options": ["Yes", "No", "In Progress"],
                    "category": "LEGAL_COMPLIANCE",
                    "legal_basis": "POCSO Act Section 19"
                },
                {
                    "question": "Has a support person/NGO been arranged for the victim?",
                    "type": "select",
                    "required": True,
                    "options": ["Yes", "No", "In Progress"],
                    "category": "LEGAL_COMPLIANCE",
                    "legal_basis": "POCSO Act Section 33"
                }
            ])
        
        return QuestionGenerationResponse(
            case_id=request.case_id,
            questions=default_questions,
            generated_at=datetime.now().isoformat()
        )
    except Exception as e:
        print(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

@app.post("/api/submit-answers", response_model=AnswersSubmissionResponse)
async def submit_question_answers(request: AnswersSubmissionRequest):
    """Process and store answers from dynamic questions"""
    try:
        # Convert answer indices to structured data
        enhanced_data = {
            "case_id": request.case_id,
            "session_id": request.session_id,
            "answers_submitted": len(request.answers),
            "timestamp": datetime.now().isoformat()
        }
        
        # Store answers in session
        if request.session_id not in active_sessions:
            active_sessions[request.session_id] = []
        
        # Add answers to conversation history
        for index, answer in request.answers.items():
            active_sessions[request.session_id].append(f"Question {index}: {answer}")
        
        # Extract and structure the data
        structured_answers = {}
        for index, answer in request.answers.items():
            structured_answers[f"answer_{index}"] = answer
        
        enhanced_data["structured_answers"] = structured_answers
        enhanced_data["case_enhancement_complete"] = True
        
        return AnswersSubmissionResponse(
            case_id=request.case_id,
            session_id=request.session_id,
            success=True,
            enhanced_case_data=enhanced_data
        )
    except Exception as e:
        print(f"Error submitting answers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit answers: {str(e)}")

@app.get("/")
async def root():
    return {"message": "CaseSwift AI API is running", "status": "active"}
