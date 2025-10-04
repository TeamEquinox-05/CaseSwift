import os
import uuid
import json
import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

# LangChain imports
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

# Import case transformer
from case_transformer import transform_to_case_structure

# --- CONFIGURATION ---
PERSIST_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "document_store")
EMBEDDING_MODEL = "mixedbread-ai/mxbai-embed-large-v1"
LLM_MODEL = "huihui_ai/llama3.2-abliterate:latest"

# --- IN-MEMORY DICTIONARIES TO HOLD MODELS AND SESSIONS ---
ml_models = {}
active_sessions = {}

# --- HELPER FUNCTIONS ---
def extract_json_from_llm_response(response_text: str) -> Optional[Dict]:
    """
    Robustly extract JSON from LLM response that might contain markdown, text, or multiple JSONs.
    """
    try:
        # Try 1: Direct JSON parse
        return json.loads(response_text)
    except:
        pass
    
    try:
        # Try 2: Extract from markdown code block
        json_match = re.search(r'```json\s*\n(.*?)\n```', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
    except:
        pass
    
    try:
        # Try 3: Find first complete JSON object
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
    except:
        pass
    
    try:
        # Try 4: Extract between first { and last }
        start = response_text.find('{')
        end = response_text.rfind('}')
        if start != -1 and end != -1 and end > start:
            return json.loads(response_text[start:end+1])
    except:
        pass
    
    return None

# --- FASTAPI LIFESPAN MANAGER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models on startup
    print("--- Loading models and building all chains ---")
    
    # Initialize shared components
    llm = ChatOllama(model=LLM_MODEL)
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vectordb = Chroma(persist_directory=PERSIST_DIRECTORY, embedding_function=embeddings)
    retriever = vectordb.as_retriever(search_kwargs={'k': 5}) # Retrieve more docs for better context

    # --- 1. The Q&A Chain (for general questions) ---
    qa_template = """### ROLE: Q&A Expert ###
    You are an expert AI assistant for Indian Police Officers. Your sole purpose is to provide factual answers from the provided legal documents.
    ### INSTRUCTIONS ###
    Analyze the officer's question, use the "RELEVANT DOCUMENT INFORMATION" to find the answer. If a special law like POCSO applies, prioritize it.
    ---
    ### RELEVANT DOCUMENT INFORMATION ###
    {document_context}
    ---
    ### CONVERSATION HISTORY ###
    {chat_history}
    ---
    ### Officer's Question ###
    {question}
    ### Your Answer ###
    """
    qa_prompt = ChatPromptTemplate.from_template(qa_template)
    ml_models["qa_chain"] = ({
        "document_context": (lambda x: x["question"]) | retriever,
        "question": lambda x: x["question"],
        "chat_history": lambda x: x["chat_history"]
    } | qa_prompt | llm | StrOutputParser())

    # --- 2. The Form-Filler Chain ---
    form_filler_template = """### ROLE: Form Expert ###
    Your task is to accurately fill out a form using information from the provided text.
    ### INSTRUCTIONS ###
    1. Read the "CONVERSATION HISTORY" and "CURRENT USER MESSAGE" to find all available facts.
    2. Identify the form template in the "CURRENT USER MESSAGE".
    3. Fill in every blank (like `___`) in the form with the correct information.
    4. If information for a blank is not available, write "NOT MENTIONED".
    5. Return ONLY the fully completed form text.
    ---
    ### CONVERSATION HISTORY ###
    {chat_history}
    ---
    ### CURRENT USER MESSAGE (contains the form) ###
    {question}
    ---
    ### COMPLETED FORM ###
    """
    form_filler_prompt = ChatPromptTemplate.from_template(form_filler_template)
    ml_models["form_filler_chain"] = (form_filler_prompt | llm | StrOutputParser())

    # --- 3. The Investigative Guide Chain ---
    guide_template = """### ROLE: Investigative Guide ###
    You are an expert investigative AI assistant. Your task is to dynamically generate a procedural checklist for a police officer by analyzing legal documents and then guide them through it.
    ### CURRENT STATE ###
    The case has been classified as: {classification}. The officer's last message was: {question}.
    ### LEGAL CONTEXT (Retrieved from BNS/POCSO Docs) ###
    {document_context}
    ### INSTRUCTIONS ###
    Based on the legal context, determine the full checklist of mandatory steps for this investigation. Then, compare it to the conversation history to find the next most logical question to ask the officer to fill in a missing detail. Ask only that one question.
    ---
    ### CONVERSATION HISTORY ###
    {chat_history}
    ---
    ### Your Next Question ###
    """
    guide_prompt = ChatPromptTemplate.from_template(guide_template)
    ml_models["guide_chain"] = ({
        "document_context": (lambda x: x["question"]) | retriever,
        "question": lambda x: x["question"],
        "chat_history": lambda x: x["chat_history"],
        "classification": lambda x: x["classification"]
    } | guide_prompt | llm | StrOutputParser())

    # --- 4. Dynamic Checklist Generator Chain ---
    checklist_template = """### ROLE: Investigation Checklist Expert ###
    You are an AI that generates personalized investigation checklists based on case details and legal requirements.
    
    ### CASE DETAILS ###
    Case Type: {case_type}
    Victim Age: {victim_age}
    Incident Nature: {incident_details}
    Current Status: {current_status}
    
    ### LEGAL REQUIREMENTS (from RAG) ###
    {legal_context}
    
    ### INSTRUCTIONS ###
    Generate a comprehensive, prioritized checklist for this investigation. Include:
    1. **MANDATORY STEPS** - Legal requirements that MUST be completed
    2. **EVIDENCE COLLECTION** - Documents and physical evidence needed
    3. **PROCEDURAL STEPS** - Interviews, examinations, reports
    4. **TIMELINE CRITICAL** - Tasks with deadlines (e.g., medical exam within 24hrs)
    5. **DEPENDENCIES** - Steps that must be done before others
    
    For POCSO cases, include:
    - Age determination (birth cert/school cert/ossification)
    - CWC notification
    - NGO support arrangement
    - Special court procedures
    
    Format as JSON array with structure:
    [
      {{
        "step_id": 1,
        "category": "MANDATORY",
        "task": "Age determination via birth certificate",
        "priority": "HIGH",
        "deadline": "Before charge sheet",
        "dependencies": [],
        "legal_basis": "POCSO Act Section 34",
        "completed": false
      }}
    ]
    
    Return ONLY valid JSON, no additional text.
    
    ### GENERATED CHECKLIST ###
    """
    checklist_prompt = ChatPromptTemplate.from_template(checklist_template)
    ml_models["checklist_chain"] = ({
        "legal_context": (lambda x: f"Case type: {x['case_type']}") | retriever,
        "case_type": lambda x: x["case_type"],
        "victim_age": lambda x: x.get("victim_age", "Unknown"),
        "incident_details": lambda x: x.get("incident_details", ""),
        "current_status": lambda x: x.get("current_status", "Initial registration")
    } | checklist_prompt | llm | StrOutputParser())

    # --- 5. Next Action Recommender Chain ---
    next_action_template = """### ROLE: Investigation Progress Advisor ###
    You analyze the current state of an investigation and recommend the next best action.
    
    ### CASE CONTEXT ###
    Case ID: {case_id}
    Case Type: {case_type}
    
    ### COMPLETED STEPS ###
    {completed_steps}
    
    ### PENDING STEPS ###
    {pending_steps}
    
    ### RECENT CONVERSATION ###
    {chat_history}
    
    ### LEGAL REQUIREMENTS (from RAG) ###
    {legal_context}
    
    ### INSTRUCTIONS ###
    Based on the investigation progress, recommend the SINGLE MOST IMPORTANT next action.
    
    Consider:
    1. Legal deadlines (medical exam within 24 hours takes priority)
    2. Dependencies (can't file charge sheet without age proof)
    3. Critical evidence that might be lost
    4. Procedural requirements
    
    Provide:
    - **Next Action**: Clear, specific task
    - **Reason**: Why this is the priority
    - **How to Execute**: Step-by-step guidance
    - **Legal Basis**: Relevant law/section
    - **Deadline**: When this must be completed
    
    ### RECOMMENDATION ###
    """
    next_action_prompt = ChatPromptTemplate.from_template(next_action_template)
    ml_models["next_action_chain"] = ({
        "legal_context": (lambda x: f"Case: {x['case_type']}") | retriever,
        "case_id": lambda x: x["case_id"],
        "case_type": lambda x: x["case_type"],
        "completed_steps": lambda x: "\n".join(x.get("completed_steps", [])),
        "pending_steps": lambda x: "\n".join(x.get("pending_steps", [])),
        "chat_history": lambda x: x.get("chat_history", "")
    } | next_action_prompt | llm | StrOutputParser())

    # --- 6. Evidence Gap Analyzer Chain ---
    evidence_gap_template = """### ROLE: Evidence Quality Auditor ###
    You are an AI that identifies missing or weak evidence in investigations.
    
    ### CASE DETAILS ###
    Case Type: {case_type}
    Current Evidence: {evidence_list}
    
    ### LEGAL REQUIREMENTS (from documents) ###
    {legal_context}
    
    ### INSTRUCTIONS ###
    Analyze the evidence collected so far and identify:
    
    1. **CRITICAL GAPS** - Evidence that is legally mandatory but missing
    2. **WEAK EVIDENCE** - Collected but insufficient/problematic
    3. **CORROBORATION NEEDED** - Claims that need supporting evidence
    4. **CHAIN OF CUSTODY** - Potential issues with evidence handling
    
    For each gap, provide:
    - What is missing
    - Why it's important (legal/investigative reason)
    - How to obtain it
    - Deadline/urgency
    
    ### EVIDENCE GAP ANALYSIS ###
    """
    evidence_gap_prompt = ChatPromptTemplate.from_template(evidence_gap_template)
    ml_models["evidence_gap_chain"] = ({
        "legal_context": (lambda x: f"Evidence requirements for {x['case_type']}") | retriever,
        "case_type": lambda x: x["case_type"],
        "evidence_list": lambda x: "\n".join(x.get("evidence_list", []))
    } | evidence_gap_prompt | llm | StrOutputParser())

    # --- 7. Document Quality Checker Chain ---
    doc_quality_template = """### ROLE: Legal Document Quality Auditor ###
    You review legal documents (FIR, charge sheets, statements) for completeness and accuracy.
    
    ### DOCUMENT TO REVIEW ###
    Document Type: {document_type}
    Content:
    {document_content}
    
    ### CASE CONTEXT ###
    Case Type: {case_type}
    
    ### LEGAL STANDARDS (from RAG) ###
    {legal_context}
    
    ### INSTRUCTIONS ###
    Review this document and provide:
    
    1. **COMPLETENESS CHECK**
       - All required fields filled?
       - Missing information?
    
    2. **LEGAL ACCURACY**
       - Correct sections cited?
       - Proper legal language?
       - Procedural compliance?
    
    3. **IMPROVEMENT SUGGESTIONS**
       - Ambiguous statements
       - Missing corroboration
       - Formatting issues
    
    4. **CRITICAL ERRORS**
       - Legal mistakes that could affect prosecution
    
    Provide actionable feedback to improve the document.
    
    ### QUALITY REVIEW ###
    """
    doc_quality_prompt = ChatPromptTemplate.from_template(doc_quality_template)
    ml_models["doc_quality_chain"] = ({
        "legal_context": (lambda x: f"Standards for {x['document_type']} in {x['case_type']} cases") | retriever,
        "document_type": lambda x: x["document_type"],
        "document_content": lambda x: x["document_content"],
        "case_type": lambda x: x["case_type"]
    } | doc_quality_prompt | llm | StrOutputParser())

    # --- 8. Dynamic Question Generator Chain ---
    question_generator_template = """### ROLE: Intelligent Investigation Assistant ###
    You are an expert at conducting thorough case investigations. Your task is to generate intelligent, 
    contextual questions to gather complete case information from the Investigating Officer.
    
    ### CASE DETAILS PROVIDED SO FAR ###
    Case Type: {case_type}
    Case Description: {case_description}
    Victim Age: {victim_age}
    Incident Date: {incident_date}
    Location: {location}
    
    ### LEGAL REQUIREMENTS (from RAG) ###
    {legal_context}
    
    ### INSTRUCTIONS ###
    Based on the case details and legal requirements, generate a comprehensive list of questions to ask the IO.
    
    **Question Generation Rules:**
    1. Ask about MANDATORY legal requirements first (medical exam, CWC notification for minors, etc.)
    2. Branch based on case type (POCSO vs IPC, known vs unknown accused)
    3. Ask about evidence collection and preservation
    4. Identify witnesses and their details
    5. Check procedural compliance
    6. Gather timeline and sequence of events
    
    **For POCSO cases (victim < 18), MUST ask about:**
    - Age verification documents (birth certificate, school records)
    - Medical examination within 24 hours
    - Child Welfare Committee notification
    - Female officer present during statement recording
    - NGO support arrangement
    
    **For all cases, ask about:**
    - Accused details (known/unknown, arrested/absconding)
    - Evidence collected (physical, digital, documentary)
    - Witness identification
    - Medical examination status
    - Scene of crime documentation
    - Previous complaints or related cases
    
    **Generate questions in this JSON format:**
    [
      {{
        "question": "What is the exact date of birth of the victim?",
        "type": "date",
        "required": true,
        "placeholder": "DD/MM/YYYY",
        "category": "VICTIM_DETAILS",
        "legal_basis": "POCSO Act Section 34 - Age determination"
      }},
      {{
        "question": "Describe the relationship between the victim and accused",
        "type": "textarea",
        "required": true,
        "placeholder": "Provide details...",
        "category": "CASE_CONTEXT",
        "legal_basis": "IPC Section 376 - Context matters for sentencing"
      }}
    ]
    
    **Question Types Available:** text, textarea, select, date, time, number, tel, email
    
    Generate 10-20 intelligent, case-specific questions. Return ONLY valid JSON array.
    
    ### GENERATED QUESTIONS ###
    """
    question_generator_prompt = ChatPromptTemplate.from_template(question_generator_template)
    ml_models["question_generator_chain"] = ({
        "legal_context": (lambda x: f"Requirements for {x['case_type']} cases") | retriever,
        "case_type": lambda x: x["case_type"],
        "case_description": lambda x: x.get("case_description", ""),
        "victim_age": lambda x: x.get("victim_age", "Unknown"),
        "incident_date": lambda x: x.get("incident_date", "Unknown"),
        "location": lambda x: x.get("location", "Unknown")
    } | question_generator_prompt | llm | StrOutputParser())

    # --- 10. Conversational Answer Analyzer Chain ---
    answer_analyzer_template = """### ROLE: Answer Intelligence Extractor ###
    You are an expert at analyzing Investigation Officer's answers and extracting structured information.
    
    ### QUESTION ASKED ###
    {question_asked}
    
    ### OFFICER'S ANSWER ###
    {officer_answer}
    
    ### CURRENT CASE CONTEXT ###
    {case_context}
    
    ### INSTRUCTIONS ###
    Analyze the answer and extract ALL relevant information:
    
    1. **Structured Data Extraction**
       - Names (victim, accused, witnesses)
       - Dates and times
       - Locations and addresses
       - Evidence items mentioned
       - Procedures completed/pending
       - Legal sections referenced
    
    2. **Answer Quality Assessment**
       - Is answer complete and specific?
       - Is answer vague or needs clarification?
       - Are there contradictions with previous information?
    
    3. **Follow-up Need Detection**
       - Does answer require clarification?
       - Are there obvious gaps in the response?
       - Should we probe deeper?
    
    4. **Legal Compliance Check**
       - Are mandatory procedures mentioned?
       - Are timelines being met?
       - Are there compliance issues?
    
    Return JSON with structure:
    {{
      "extracted_data": {{
        "victim_name": "extracted name or null",
        "accused_name": "extracted name or null",
        "dates": ["list of dates mentioned"],
        "evidence": ["list of evidence items"],
        "witnesses": ["list of witness names"],
        "locations": ["list of locations"],
        "procedures_done": ["list of completed procedures"],
        "procedures_pending": ["list of pending procedures"]
      }},
      "answer_quality": "complete|partial|vague|insufficient",
      "needs_clarification": true|false,
      "clarification_reason": "why clarification needed",
      "compliance_alerts": ["list of compliance issues if any"],
      "confidence_score": 0.0-1.0
    }}
    
    Return ONLY valid JSON.
    
    ### ANALYSIS ###
    """
    answer_analyzer_prompt = ChatPromptTemplate.from_template(answer_analyzer_template)
    ml_models["answer_analyzer"] = (answer_analyzer_prompt | llm | StrOutputParser())

    # --- 11. Next Question Decision Chain ---
    next_question_decider_template = """### ROLE: Intelligent Question Strategist ###
    You are an expert at conducting systematic case investigations through strategic questioning.
    
    ### CASE DETAILS ###
    Case Type: {case_type}
    Case Description: {case_description}
    
    ### INFORMATION WE HAVE ###
    {extracted_data}
    
    ### CONVERSATION SO FAR ###
    {conversation_summary}
    
    ### LAST QUESTION & ANSWER ###
    Q: {last_question}
    A: {last_answer}
    Answer Quality: {answer_quality}
    
    ### LEGAL REQUIREMENTS (from RAG) ###
    {legal_context}
    
    ### INSTRUCTIONS ###
    Based on everything above, decide the SINGLE MOST IMPORTANT next question to ask.
    
    **IMPORTANT: Be SPECIFIC, not generic!**
    - ❌ BAD: "Can you provide more details about the incident?"
    - ✅ GOOD: "What specifically happened during the assault? Please describe the sequence of events."
    - ✅ GOOD: "What evidence has been collected from the crime scene?"
    - ✅ GOOD: "Has the victim undergone medical examination? If yes, where and when?"
    
    **Decision Logic:**
    1. Look at EXTRACTED DATA - what do we have?
    2. Look at MISSING INFO - what's still needed?
    3. Ask about the MOST CRITICAL missing piece SPECIFICALLY
    
    **If we have victim/accused names but missing:**
    - Incident details → Ask: "What exactly happened during the incident? Please describe the sequence of events."
    - Evidence → Ask: "What evidence has been collected? (clothing, photos, CCTV, etc.)"
    - Medical exam → Ask: "Has the victim undergone medical examination? If yes, provide details."
    - Witnesses → Ask: "Were there any witnesses? If yes, who are they?"
    - Accused status → Ask: "Has the accused been arrested or identified?"
    
    **Priority Order:**
    1. URGENT: Compliance issues with immediate deadlines (medical exam, CWC notification)
    2. CRITICAL: Missing mandatory information (incident description, accused details, evidence)
    3. IMPORTANT: Evidence documentation and preservation
    4. ROUTINE: Supporting details and background information
    
    **For POCSO cases, prioritize:**
    - Age verification
    - CWC notification within 24 hours
    - Medical exam by female doctor within 24 hours
    - Statement recording by female officer
    - Support person arrangement
    
    **Question Style:**
    - Be specific and clear - ask about ONE specific thing
    - Reference their previous answer when relevant
    - Show legal basis for urgent questions
    - Be conversational but professional
    
    **EXAMPLE:**
    If extracted_data shows:
    - victim_name: "Aya Varsela" ✓
    - accused_name: "Sammy Gonsalves" ✓
    - incident_description: MISSING
    
    Then ask: "Thank you. Now, can you describe what exactly happened during the incident? What did the accused do to the victim?"
    NOT: "Can you provide more details about the incident?"
    
    Return JSON:
    {{
      "question": "The specific question to ask",
      "question_type": "clarification|follow-up|mandatory|evidence|witness|timeline|routine",
      "category": "VICTIM_DETAILS|ACCUSED_DETAILS|EVIDENCE|COMPLIANCE|WITNESSES|TIMELINE",
      "priority": "URGENT|CRITICAL|IMPORTANT|ROUTINE",
      "is_urgent": true|false,
      "legal_basis": "Relevant law/section if applicable",
      "reasoning": "Why this question now",
      "expected_info": "What we hope to learn"
    }}
    
    Return ONLY valid JSON.
    
    ### NEXT QUESTION ###
    """
    next_question_decider_prompt = ChatPromptTemplate.from_template(next_question_decider_template)
    ml_models["question_decider"] = ({
        "legal_context": (lambda x: f"Requirements for {x['case_type']}") | retriever,
        "case_type": lambda x: x.get("case_type", ""),
        "case_description": lambda x: x.get("case_description", ""),
        "extracted_data": lambda x: json.dumps(x.get("extracted_data", {})),
        "conversation_summary": lambda x: x.get("conversation_summary", ""),
        "last_question": lambda x: x.get("last_question", ""),
        "last_answer": lambda x: x.get("last_answer", ""),
        "answer_quality": lambda x: x.get("answer_quality", "unknown")
    } | next_question_decider_prompt | llm | StrOutputParser())

    # --- 12. Completion Checker Chain ---
    completion_checker_template = """### ROLE: Case Completeness Auditor ###
    You are an expert at determining if a case investigation has all required information.
    
    ### CASE TYPE ###
    {case_type}
    
    ### ALL EXTRACTED INFORMATION ###
    {all_extracted_data}
    
    ### LEGAL REQUIREMENTS (from RAG) ###
    {legal_context}
    
    ### INSTRUCTIONS ###
    Review all extracted information against legal requirements and determine if we have enough to proceed.
    
    **Check for:**
    
    1. **MANDATORY VICTIM INFORMATION**
       - Full name
       - Age/DOB (critical for POCSO determination)
       - Contact details
       - Statement recorded
    
    2. **MANDATORY ACCUSED INFORMATION**
       - Name (if known)
       - Description/identification
       - Relationship to victim
       - Current status (arrested/absconding)
    
    3. **MANDATORY INCIDENT DETAILS**
       - Date and time
       - Location with details
       - Nature of offense
       - Sequence of events
    
    4. **MANDATORY EVIDENCE**
       - Physical evidence identified
       - Digital evidence identified
       - Preservation status
       - Documentation status
    
    5. **MANDATORY COMPLIANCE (POCSO if victim < 18)**
       - Medical examination status
       - CWC notification status
       - Statement recording compliance
       - Support person arrangement
    
    6. **WITNESSES**
       - Witnesses identified
       - Statements recorded
    
    **Completion Criteria:**
    - All MANDATORY fields must be present
    - All URGENT compliance items must be addressed
    - All CRITICAL evidence must be documented
    
    Return JSON:
    {{
      "is_complete": true|false,
      "completion_percentage": 0-100,
      "missing_mandatory": ["list of critical missing items"],
      "missing_important": ["list of important missing items"],
      "compliance_status": {{
        "medical_exam": "done|pending|not_applicable",
        "cwc_notification": "done|pending|not_applicable",
        "statement_recorded": "done|pending|not_applicable"
      }},
      "can_proceed": true|false,
      "summary": "Brief summary of case readiness",
      "next_steps": ["What should happen next"]
    }}
    
    Return ONLY valid JSON.
    
    ### COMPLETENESS CHECK ###
    """
    completion_checker_prompt = ChatPromptTemplate.from_template(completion_checker_template)
    ml_models["completion_checker"] = ({
        "legal_context": (lambda x: f"Requirements for {x['case_type']}") | retriever,
        "case_type": lambda x: x.get("case_type", ""),
        "all_extracted_data": lambda x: json.dumps(x.get("all_data", {}))
    } | completion_checker_prompt | llm | StrOutputParser())

    # --- 9. The Router Chain ---
    router_template = """Your job is to classify the user's intent. Choose one of the following tools:

    1. "GUIDE": If the user is starting a new case, providing case details, or asking "what's next?".
    2. "FORM_FILLER": If the user explicitly asks to "fill a form" and provides a form template.
    3. "QA": For general questions about laws, procedures, or punishments.

    User Message: "{user_message}"
    Respond with ONLY the tool name (e.g., "GUIDE", "FORM_FILLER", or "QA")."""
    router_prompt = ChatPromptTemplate.from_template(router_template)
    ml_models["router_chain"] = router_prompt | llm | StrOutputParser()
    
    print("--- Models loaded and all chains are ready ---")
    yield
    ml_models.clear()
    active_sessions.clear()


# --- FASTAPI APP INITIALIZATION ---
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC MODELS ---
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

class ChecklistRequest(BaseModel):
    case_id: str
    case_type: str
    victim_age: int
    incident_details: str
    current_status: Optional[str] = "Initial"

class ChecklistResponse(BaseModel):
    case_id: str
    checklist: List[Dict[str, Any]]
    generated_at: str

class NextActionRequest(BaseModel):
    case_id: str
    case_type: str
    completed_steps: List[str]
    pending_steps: List[str]

class NextActionResponse(BaseModel):
    case_id: str
    recommendation: str
    timestamp: str

class QuestionGenerationRequest(BaseModel):
    case_id: str
    case_type: str
    case_description: Optional[str] = ""
    victim_age: Optional[str] = ""
    incident_date: Optional[str] = ""
    location: Optional[str] = ""

class QuestionGenerationResponse(BaseModel):
    case_id: str
    questions: List[Dict[str, Any]]
    generated_at: str

class AnswersSubmissionRequest(BaseModel):
    case_id: str
    session_id: str
    answers: Dict[int, str]  # Question index -> Answer

class AnswersSubmissionResponse(BaseModel):
    case_id: str
    session_id: str
    success: bool
    enhanced_case_data: Dict[str, Any]

class EvidenceGapRequest(BaseModel):
    case_id: str
    case_type: str
    evidence_list: List[str]

class EvidenceGapResponse(BaseModel):
    case_id: str
    gap_analysis: str
    analyzed_at: str

class DocumentQualityRequest(BaseModel):
    case_id: str
    case_type: str
    document_type: str
    document_content: str

class DocumentQualityResponse(BaseModel):
    case_id: str
    document_type: str
    quality_review: str
    reviewed_at: str

# --- Conversational Questioning Models ---
class ConversationalQuestionRequest(BaseModel):
    case_id: str
    session_id: str
    case_data: Dict[str, Any]
    conversation_history: List[Dict[str, Any]] = []  # Allow any value types
    extracted_data: Dict[str, Any] = {}

class ConversationalQuestionResponse(BaseModel):
    complete: bool
    question: Optional[str] = None
    question_type: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    is_urgent: bool = False
    legal_basis: Optional[str] = None
    progress: Dict[str, int] = {}
    summary: Optional[str] = None
    final_data: Optional[Dict[str, Any]] = None

class ProcessAnswerRequest(BaseModel):
    case_id: str
    session_id: str
    question: str
    answer: str
    case_data: Dict[str, Any] = {}  # Make optional with default
    conversation_history: List[Dict[str, Any]] = []  # Allow any value types
    extracted_data: Dict[str, Any] = {}

class ProcessAnswerResponse(BaseModel):
    success: bool
    extracted_data: Dict[str, Any]
    quality_assessment: str
    needs_clarification: bool
    clarification_reason: Optional[str] = None
    compliance_alerts: List[str] = []
    confidence_score: float

# --- API ENDPOINTS ---

@app.post("/api/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    if "router_chain" not in ml_models:
        raise HTTPException(status_code=503, detail="Chains are not ready")

    session_id = request.session_id or str(uuid.uuid4())
    chat_history_list = active_sessions.get(session_id, [])
    formatted_history = "\n".join(chat_history_list)
    user_message = request.message
    
    # 1. Call the router to determine intent
    intent = await ml_models["router_chain"].ainvoke({"user_message": user_message})
    
    response_text = ""
    
    # 2. Route to the appropriate chain
    if "GUIDE" in intent:
        print("--- Routing to Guide Chain ---")
        # In a real app, you'd get the classification from the case state
        classification = "POCSO" if "minor" in user_message or "age" in user_message else "BNS_General"
        response_text = await ml_models["guide_chain"].ainvoke({
            "question": user_message, 
            "chat_history": formatted_history,
            "classification": classification
        })
    elif "FORM_FILLER" in intent:
        print("--- Routing to Form-Filler Chain ---")
        response_text = await ml_models["form_filler_chain"].ainvoke({
            "question": user_message, 
            "chat_history": formatted_history
        })
    else: # Default to Q&A
        print("--- Routing to Q&A Chain ---")
        response_text = await ml_models["qa_chain"].ainvoke({
            "question": user_message, 
            "chat_history": formatted_history
        })

    # 3. Update history and return response
    chat_history_list.append(f"Officer: {user_message}")
    chat_history_list.append(f"AI Guide: {response_text}")
    active_sessions[session_id] = chat_history_list
    
    return ChatResponse(response=response_text, session_id=session_id)

@app.post("/api/generate-checklist", response_model=ChecklistResponse)
async def generate_checklist(request: ChecklistRequest):
    """Generate AI-powered investigation checklist"""
    if "checklist_chain" not in ml_models:
        raise HTTPException(status_code=503, detail="Checklist chain not ready")
    
    try:
        checklist_json = await ml_models["checklist_chain"].ainvoke({
            "case_type": request.case_type,
            "victim_age": request.victim_age,
            "incident_details": request.incident_details,
            "current_status": request.current_status
        })
        
        # Parse JSON response from LLM
        # Extract JSON from markdown code blocks if present
        json_match = re.search(r'```json\n(.*?)\n```', checklist_json, re.DOTALL)
        if json_match:
            checklist_data = json.loads(json_match.group(1))
        else:
            # Try to find JSON array in the response
            json_match = re.search(r'\[(.*?)\]', checklist_json, re.DOTALL)
            if json_match:
                checklist_data = json.loads('[' + json_match.group(1) + ']')
            else:
                checklist_data = json.loads(checklist_json)
        
        return ChecklistResponse(
            case_id=request.case_id,
            checklist=checklist_data,
            generated_at=datetime.now().isoformat()
        )
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw response: {checklist_json}")
        # Return a default checklist if parsing fails
        default_checklist = [
            {
                "step_id": 1,
                "category": "MANDATORY",
                "task": "Register FIR",
                "priority": "HIGH",
                "deadline": "Immediate",
                "dependencies": [],
                "legal_basis": "CrPC Section 154",
                "completed": False
            },
            {
                "step_id": 2,
                "category": "MANDATORY",
                "task": "Medical Examination",
                "priority": "HIGH",
                "deadline": "Within 24 hours" if "POCSO" in request.case_type else "Within 72 hours",
                "dependencies": ["Register FIR"],
                "legal_basis": "CrPC Section 164A",
                "completed": False
            },
            {
                "step_id": 3,
                "category": "MANDATORY",
                "task": "Victim Statement Recording",
                "priority": "HIGH",
                "deadline": "Within 48 hours",
                "dependencies": ["Medical Examination"],
                "legal_basis": "CrPC Section 161",
                "completed": False
            }
        ]
        
        if "POCSO" in request.case_type:
            default_checklist.extend([
                {
                    "step_id": 4,
                    "category": "MANDATORY",
                    "task": "Age Determination",
                    "priority": "HIGH",
                    "deadline": "Before charge sheet",
                    "dependencies": [],
                    "legal_basis": "POCSO Act Section 34",
                    "completed": False
                },
                {
                    "step_id": 5,
                    "category": "MANDATORY",
                    "task": "CWC Notification",
                    "priority": "HIGH",
                    "deadline": "Within 24 hours",
                    "dependencies": [],
                    "legal_basis": "POCSO Act Section 19",
                    "completed": False
                }
            ])
        
        return ChecklistResponse(
            case_id=request.case_id,
            checklist=default_checklist,
            generated_at=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checklist generation failed: {str(e)}")

@app.post("/api/next-action", response_model=NextActionResponse)
async def recommend_next_action(request: NextActionRequest):
    """AI recommends next investigation step"""
    if "next_action_chain" not in ml_models:
        raise HTTPException(status_code=503, detail="Next action chain not ready")
    
    session_id = request.case_id
    chat_history_list = active_sessions.get(session_id, [])
    formatted_history = "\n".join(chat_history_list[-10:])  # Last 10 messages
    
    recommendation = await ml_models["next_action_chain"].ainvoke({
        "case_id": request.case_id,
        "case_type": request.case_type,
        "completed_steps": request.completed_steps,
        "pending_steps": request.pending_steps,
        "chat_history": formatted_history
    })
    
    return NextActionResponse(
        case_id=request.case_id,
        recommendation=recommendation,
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/analyze-evidence-gaps", response_model=EvidenceGapResponse)
async def analyze_evidence_gaps(request: EvidenceGapRequest):
    """AI identifies missing or weak evidence"""
    if "evidence_gap_chain" not in ml_models:
        raise HTTPException(status_code=503, detail="Evidence gap chain not ready")
    
    analysis = await ml_models["evidence_gap_chain"].ainvoke({
        "case_type": request.case_type,
        "evidence_list": request.evidence_list
    })
    
    return EvidenceGapResponse(
        case_id=request.case_id,
        gap_analysis=analysis,
        analyzed_at=datetime.now().isoformat()
    )

@app.post("/api/review-document-quality", response_model=DocumentQualityResponse)
async def review_document_quality(request: DocumentQualityRequest):
    """AI reviews document for quality and completeness"""
    if "doc_quality_chain" not in ml_models:
        raise HTTPException(status_code=503, detail="Document quality chain not ready")
    
    review = await ml_models["doc_quality_chain"].ainvoke({
        "document_type": request.document_type,
        "document_content": request.document_content,
        "case_type": request.case_type
    })
    
    return DocumentQualityResponse(
        case_id=request.case_id,
        document_type=request.document_type,
        quality_review=review,
        reviewed_at=datetime.now().isoformat()
    )
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

@app.post("/api/conversational-question", response_model=ConversationalQuestionResponse)
async def get_conversational_question(request: ConversationalQuestionRequest):
    """
    Get next question in conversational interrogation flow.
    First checks if case is complete, then decides next question.
    """
    if "completion_checker" not in ml_models or "question_decider" not in ml_models:
        raise HTTPException(status_code=503, detail="Conversational chains not ready")
    
    try:
        case_type = request.case_data.get("caseType", "Unknown")
        case_description = request.case_data.get("initialDescription", "")
        
        # Format conversation history
        conversation_summary = "\n".join([
            f"{msg.get('role', 'Unknown')}: {msg.get('content', '')}" 
            for msg in request.conversation_history
        ])
        
        # Format extracted data
        extracted_data_str = json.dumps(request.extracted_data, indent=2)
        
        # 1. Check if conversation is complete
        completion_check_result = await ml_models["completion_checker"].ainvoke({
            "case_type": case_type,
            "case_description": case_description,
            "extracted_data": extracted_data_str,
            "conversation_summary": conversation_summary
        })
        
        # Parse completion check result
        try:
            completion_data = extract_json_from_llm_response(completion_check_result)
            if not completion_data:
                # Fallback - assume not complete
                completion_data = {
                    "is_complete": False,
                    "completion_percentage": 30,
                    "missing_items": ["Unable to parse completion check"],
                    "can_proceed": False
                }
        except Exception as e:
            print(f"Error parsing completion check: {e}")
            completion_data = {
                "is_complete": False,
                "completion_percentage": 30,
                "missing_items": [f"Parse error: {str(e)}"],
                "can_proceed": False
            }
        
        # If complete, return completion response
        if completion_data.get("is_complete", False):
            # Transform extracted data to structured case format
            try:
                structured_case = transform_to_case_structure(
                    case_id=request.case_id,
                    initial_case_data=request.case_data,
                    extracted_data=request.extracted_data,
                    conversation_history=request.conversation_history
                )
                final_data = structured_case
            except Exception as e:
                print(f"Error transforming case structure: {e}")
                # Fallback to raw extracted data
                final_data = request.extracted_data
            
            return ConversationalQuestionResponse(
                complete=True,
                summary=f"Case interrogation complete! {completion_data.get('completion_percentage', 100)}% information gathered.",
                progress={
                    "case_info": completion_data.get("completion_percentage", 100),
                    "evidence": 100,
                    "compliance": 100,
                    "witnesses": 100
                },
                final_data=final_data
            )
        
        # 2. If not complete, get next question
        # Get last Q&A if available
        last_question = ""
        last_answer = ""
        if len(request.conversation_history) >= 2:
            last_question = request.conversation_history[-2].get("content", "")
            last_answer = request.conversation_history[-1].get("content", "")
        
        # Get legal context from RAG (optional, can be empty for now)
        legal_context = "Refer to relevant legal procedures."
        
        next_question_result = await ml_models["question_decider"].ainvoke({
            "case_type": case_type,
            "case_description": case_description,
            "extracted_data": extracted_data_str,
            "conversation_summary": conversation_summary,
            "last_question": last_question,
            "last_answer": last_answer,
            "answer_quality": "Good" if last_answer else "N/A",
            "legal_context": legal_context
        })
        
        print(f"[DEBUG] Question Decider raw output: {next_question_result[:500]}")  # Log first 500 chars
        
        # Parse next question result
        try:
            question_data = extract_json_from_llm_response(next_question_result)
            if not question_data:
                # Fallback question
                question_data = {
                    "question": "Can you provide more details about the incident?",
                    "question_type": "open_ended",
                    "category": "INCIDENT_DETAILS",
                    "priority": "IMPORTANT",
                    "is_urgent": False,
                    "legal_basis": "General investigation procedure"
                }
            # Handle both "question" and "next_question" keys for compatibility
            if "next_question" in question_data and "question" not in question_data:
                question_data["question"] = question_data["next_question"]
        except Exception as e:
            print(f"Error parsing next question: {e}")
            question_data = {
                "question": "Can you provide more details about the incident?",
                "question_type": "open_ended",
                "category": "INCIDENT_DETAILS",
                "priority": "IMPORTANT",
                "is_urgent": False,
                "legal_basis": "General investigation procedure"
            }
        
        # Calculate progress
        progress = {
            "case_info": completion_data.get("completion_percentage", 30),
            "evidence": min(len([k for k in request.extracted_data.keys() if "evidence" in k.lower()]) * 25, 100),
            "compliance": min(len([k for k in request.extracted_data.keys() if "compliance" in k.lower()]) * 25, 100),
            "witnesses": min(len([k for k in request.extracted_data.keys() if "witness" in k.lower()]) * 25, 100)
        }
        
        return ConversationalQuestionResponse(
            complete=False,
            question=question_data.get("question"),
            question_type=question_data.get("question_type"),
            category=question_data.get("category"),
            priority=question_data.get("priority"),
            is_urgent=question_data.get("is_urgent", False),
            legal_basis=question_data.get("legal_basis"),
            progress=progress
        )
        
    except Exception as e:
        print(f"Error in conversational question: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get next question: {str(e)}")

@app.post("/api/process-answer", response_model=ProcessAnswerResponse)
async def process_answer(request: ProcessAnswerRequest):
    """
    Process IO's answer, extract structured data, assess quality.
    """
    if "answer_analyzer" not in ml_models:
        raise HTTPException(status_code=503, detail="Answer analyzer chain not ready")
    
    try:
        print(f"[DEBUG] Process answer request: case_id={request.case_id}, session_id={request.session_id}")
        print(f"[DEBUG] Case data keys: {request.case_data.keys() if request.case_data else 'None'}")
        
        case_type = request.case_data.get("caseType", request.case_data.get("caseTitle", "Unknown"))
        case_description = request.case_data.get("caseDescription", request.case_data.get("initialDescription", ""))
        
        # Format conversation history
        conversation_summary = "\n".join([
            f"{msg.get('role', 'Unknown')}: {msg.get('content', '')}" 
            for msg in request.conversation_history
        ])
        
        # Format extracted data
        extracted_data_str = json.dumps(request.extracted_data, indent=2)
        
        # Build case context
        case_context = f"Case Type: {case_type}\nCase Description: {case_description}\nConversation History:\n{conversation_summary}\nExtracted Data So Far:\n{extracted_data_str}"
        
        # Analyze the answer
        analysis_result = await ml_models["answer_analyzer"].ainvoke({
            "question_asked": request.question,
            "officer_answer": request.answer,
            "case_context": case_context
        })
        
        # Parse analysis result
        try:
            analysis_data = extract_json_from_llm_response(analysis_result)
            if not analysis_data:
                # Fallback
                analysis_data = {
                    "extracted_data": {"raw_answer": request.answer},
                    "quality_assessment": "Unable to parse analysis",
                    "needs_clarification": False,
                    "clarification_reason": "",
                    "compliance_alerts": [],
                    "confidence_score": 0.5
                }
        except Exception as e:
            print(f"Error parsing answer analysis: {e}")
            analysis_data = {
                "extracted_data": {"raw_answer": request.answer},
                "quality_assessment": f"Parse error: {str(e)}",
                "needs_clarification": False,
                "clarification_reason": "",
                "compliance_alerts": [],
                "confidence_score": 0.5
            }
        
        # Merge extracted data with existing data
        new_extracted_data = analysis_data.get("extracted_data", {})
        
        return ProcessAnswerResponse(
            success=True,
            extracted_data=new_extracted_data,
            quality_assessment=analysis_data.get("quality_assessment", ""),
            needs_clarification=analysis_data.get("needs_clarification", False),
            clarification_reason=analysis_data.get("clarification_reason"),
            compliance_alerts=analysis_data.get("compliance_alerts", []),
            confidence_score=analysis_data.get("confidence_score", 0.5)
        )
        
    except Exception as e:
        print(f"Error processing answer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process answer: {str(e)}")

@app.get("/")
async def root():
    return {"message": "CaseSwift AI API is running", "status": "active"}

