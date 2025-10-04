# 🔧 Debugging 422 Validation Error

## Issue
Getting `422 Unprocessable Entity` when calling `/api/process-answer`

## What I Added

### 1. Enhanced Debug Logging
```python
print(f"[DEBUG] case_id={request.case_id}, session_id={request.session_id}")
print(f"[DEBUG] question={request.question[:50]}...")
print(f"[DEBUG] answer={request.answer[:50]}...")
print(f"[DEBUG] Case data keys: {request.case_data.keys()}")
print(f"[DEBUG] Conversation history length: {len(request.conversation_history)}")
print(f"[DEBUG] Extracted data keys: {request.extracted_data.keys()}")
```

### 2. Validation Error Handler
```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"[ERROR] Validation error on {request.url.path}")
    print(f"[ERROR] Errors: {exc.errors()}")
    print(f"[ERROR] Body: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": str(exc.body)[:500]
        }
    )
```

## Next Steps

### 1. Restart API Server
```powershell
# Stop current server (Ctrl+C)
cd ChatBot
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

### 2. Try Answering a Question Again

Watch the console output. You'll now see:

**Before the error:**
```
[DEBUG] case_id=CASE_001, session_id=uuid-here
[DEBUG] question=What is the victim's name?
[DEBUG] answer=Aya Varsela
[DEBUG] Case data keys: dict_keys(['caseTitle', 'caseType', 'victimAge'])
[DEBUG] Conversation history length: 2
[DEBUG] Extracted data keys: dict_keys(['victim_name'])
```

**If validation fails:**
```
[ERROR] Validation error on /api/process-answer
[ERROR] Errors: [{'type': 'missing', 'loc': ['body', 'field_name'], 'msg': 'Field required'}]
[ERROR] Body: {...}
```

## Common Causes of 422

### 1. Missing Required Field
**Frontend might be sending:**
```javascript
{
  case_id: "CASE_001",  // ❌ Wrong - should be snake_case in some places
  caseId: "CASE_001"    // ✅ or camelCase depending on model
}
```

**Backend expects:**
```python
case_id: str  # snake_case
```

### 2. Wrong Type
**Frontend sends:**
```javascript
conversation_history: "string"  // ❌ Wrong - should be array
```

**Backend expects:**
```python
conversation_history: List[Dict[str, Any]]  # Array of objects
```

### 3. Extra Fields Not Allowed
If Pydantic model has `class Config: extra = "forbid"`, extra fields cause 422.

## Quick Fix Options

### Option 1: Make All Fields Optional
```python
class ProcessAnswerRequest(BaseModel):
    case_id: Optional[str] = None
    session_id: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    case_data: Optional[Dict[str, Any]] = {}
    conversation_history: Optional[List[Dict[str, Any]]] = []
    extracted_data: Optional[Dict[str, Any]] = {}
```

### Option 2: Allow Extra Fields
```python
class ProcessAnswerRequest(BaseModel):
    case_id: str
    session_id: str
    question: str
    answer: str
    case_data: Dict[str, Any] = {}
    conversation_history: List[Dict[str, Any]] = []
    extracted_data: Dict[str, Any] = {}
    
    class Config:
        extra = "allow"  # Allow extra fields
```

## Check Frontend Payload

Add this to your frontend console log:

```javascript
console.log('[FRONTEND] Sending to process-answer:', {
  case_id: caseId,
  session_id: sessionId,
  question: lastQuestion,
  answer: answerText,
  case_data: caseData,
  conversation_history: messages,
  extracted_data: extractedData
});
```

Then check browser console to see exact payload being sent.

## Expected Backend Output (After Fix)

```
INFO:     POST /api/process-answer HTTP/1.1
[DEBUG] Process answer request received
[DEBUG] case_id=CASE_001, session_id=057f19d1-8fe7-4285-a77e-17dbbabf1fb3
[DEBUG] question=What is the victim's name?
[DEBUG] answer=Aya Varsela
[DEBUG] Case data keys: dict_keys(['caseTitle', 'caseType', 'victimAge', 'incidentDate'])
[DEBUG] Conversation history length: 2
[DEBUG] Extracted data keys: dict_keys(['victim_name'])
[Answer processing...]
INFO:     200 OK
```

## Still Getting 422?

Share the output from:
1. Backend console showing `[ERROR] Errors: [...]`
2. Browser console showing the payload being sent

This will show exactly which field is the problem!

