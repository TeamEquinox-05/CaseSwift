"""
Test script to diagnose repetitive questions issue
Run this to check if Answer Analyzer is extracting incident_description
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_answer_analyzer():
    print("=" * 60)
    print("TEST: Answer Analyzer Extraction")
    print("=" * 60)
    
    try:
        # Import and initialize chains
        print("Initializing AI chains...")
        from langchain_community.llms import Ollama
        from langchain.prompts import ChatPromptTemplate
        
        # Initialize Ollama
        llm = Ollama(
            model="huihui_ai/llama3.2-abliterate:latest",
            temperature=0.3
        )
        print("✅ Ollama initialized\n")
        
        # Load Answer Analyzer prompt
        answer_analyzer_template = """### ROLE: Answer Intelligence Extractor ###
You are an expert at extracting structured information from police officer answers.

### QUESTION ASKED ###
{question_asked}

### OFFICER'S ANSWER ###
{officer_answer}

### CASE CONTEXT ###
{case_context}

### INSTRUCTIONS ###
Extract ALL relevant information from the officer's answer into structured fields.

**CRITICAL: Use ONLY these exact field names. Do NOT use any other field names!**

Return ONLY valid JSON with these fields (use null if not mentioned):
{{
  "extracted_data": {{
    "victim_name": "Full name",
    "accused_name": "Full name",
    "victim_age": "Age in years",
    "accused_age": "Age in years",
    "victim_gender": "Male/Female/Other",
    "accused_gender": "Male/Female/Other",
    "incident_description": "Detailed description of what happened",
    "incident_date": "Date",
    "incident_time": "Time",
    "location": "Place where incident occurred",
    "evidence_items": ["Item 1", "Item 2"],
    "witnesses": ["Name 1", "Name 2"],
    "medical_exam_status": "Completed/Pending/Not Done",
    "accused_status": "Arrested/Absconding/Identified",
    "procedures_completed": ["Procedure 1"],
    "procedures_pending": ["Procedure 1"]
  }},
  "quality_assessment": "Good/Needs more detail/Excellent",
  "needs_clarification": false,
  "clarification_reason": "",
  "compliance_alerts": []
}}

Extract ONLY information explicitly mentioned. Use null for missing fields.
"""
        
        answer_analyzer_prompt = ChatPromptTemplate.from_template(answer_analyzer_template)
        answer_analyzer_chain = answer_analyzer_prompt | llm
        
        print("✅ Answer Analyzer chain created\n")
        
        # Test case: User provides detailed incident description
        test_question = "Can you describe what exactly happened during the incident?"
        test_answer = """The accused approached from behind silently. He first placed his hand on her right shoulder for approximately 2-3 seconds. Then, he moved his hand down to her waist area on the left side and squeezed for about 5 seconds. The victim immediately turned around, pushed his hand away, and shouted "What are you doing? Don't touch me!" The accused then tried to grab her arm, at which point she screamed loudly for help."""
        
        test_context = """Case Type: Molestation
Case Description: Incident at Panjim Bus Stand
Conversation History:
ai: Hello, I'll help you document this case.
user: A molestation case at Panjim Bus Stand
Extracted Data So Far:
{
  "location": "Panjim Bus Stand",
  "incident_date": "3rd October 2025",
  "incident_time": "6:45 PM"
}"""
        
        print(f"Question: {test_question}")
        print(f"Answer: {test_answer[:100]}...")
        print("\nCalling Answer Analyzer...\n")
        
        result = await answer_analyzer_chain.ainvoke({
            "question_asked": test_question,
            "officer_answer": test_answer,
            "case_context": test_context
        })
        
        print("=" * 60)
        print("RESULT FROM ANSWER ANALYZER:")
        print("=" * 60)
        print(result)
        print("\n")
        
        # Try to parse JSON
        import json
        import re
        
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', result, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(1))
            print("=" * 60)
            print("PARSED JSON:")
            print("=" * 60)
            print(json.dumps(parsed, indent=2))
            
            if "extracted_data" in parsed:
                extracted = parsed["extracted_data"]
                print("\n" + "=" * 60)
                print("EXTRACTED FIELDS:")
                print("=" * 60)
                for key, value in extracted.items():
                    print(f"  ✅ {key}: {str(value)[:100]}")
                
                # Check for incident_description
                if "incident_description" in extracted:
                    print("\n✅ SUCCESS: incident_description was extracted!")
                    print(f"   Value: {extracted['incident_description'][:150]}...")
                else:
                    print("\n❌ PROBLEM: incident_description was NOT extracted!")
                    print(f"   Extracted fields: {list(extracted.keys())}")
            else:
                print("\n❌ PROBLEM: No 'extracted_data' field in response")
        else:
            # Try to parse as plain JSON
            try:
                parsed = json.loads(result)
                print("=" * 60)
                print("PARSED JSON (plain):")
                print("=" * 60)
                print(json.dumps(parsed, indent=2))
            except:
                print("❌ Could not parse JSON from result")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

async def test_question_decider():
    print("\n" + "=" * 60)
    print("TEST: Question Decider Decision Making")
    print("=" * 60)
    
    try:
        # Initialize chains
        print("Initializing AI chains...")
        from langchain_community.llms import Ollama
        from langchain.prompts import ChatPromptTemplate
        
        llm = Ollama(
            model="huihui_ai/llama3.2-abliterate:latest",
            temperature=0.3
        )
        
        # Simplified Question Decider prompt
        question_decider_template = """### ROLE: Intelligent Question Strategist ###

### EXTRACTED DATA ###
{extracted_data}

### LAST QUESTION & ANSWER ###
Q: {last_question}
A: {last_answer}

### INSTRUCTIONS ###
Look at the extracted data. If incident_description already has detailed information, DON'T ask about it again.
Ask about something that's MISSING instead.

Return JSON with next question.
"""
        
        question_decider_prompt = ChatPromptTemplate.from_template(question_decider_template)
        question_decider_chain = question_decider_prompt | llm
        
        print("✅ Question Decider chain created\n")
        
        # Test case: We have incident_description already
        extracted_data_with_description = {
            "incident_description": "The accused approached from behind silently. He first placed his hand on her right shoulder for approximately 2-3 seconds. Then, he moved his hand down to her waist area on the left side and squeezed for about 5 seconds. The victim immediately turned around, pushed his hand away, and shouted 'What are you doing? Don't touch me!' The accused then tried to grab her arm, at which point she screamed loudly for help.",
            "location": "Panjim Bus Stand",
            "incident_date": "3rd October 2025",
            "incident_time": "6:45 PM",
            "victim_age": "25"
        }
        
        import json
        extracted_data_str = json.dumps(extracted_data_with_description, indent=2)
        
        print("Testing with extracted data that INCLUDES incident_description:")
        print(f"  - incident_description: {extracted_data_with_description['incident_description'][:80]}...")
        print(f"  - location: {extracted_data_with_description['location']}")
        print(f"  - Other fields: {list(extracted_data_with_description.keys())}")
        print("\nCalling Question Decider...\n")
        
        result = await question_decider_chain.ainvoke({
            "case_type": "Molestation",
            "case_description": "Incident at Panjim Bus Stand",
            "extracted_data": extracted_data_str,
            "conversation_summary": "ai: Can you describe the incident?\nuser: [Provided detailed description]",
            "last_question": "Can you describe what exactly happened?",
            "last_answer": extracted_data_with_description["incident_description"],
            "answer_quality": "Excellent - very detailed",
            "legal_context": "Indian Penal Code Section 354 - Assault on woman with intent to outrage her modesty"
        })
        
        print("=" * 60)
        print("RESULT FROM QUESTION DECIDER:")
        print("=" * 60)
        print(result)
        print("\n")
        
        # Check if it's asking about incident again
        if "incident" in result.lower() and "describe" in result.lower():
            print("❌ PROBLEM: AI is STILL asking about incident details!")
            print("   Even though we provided incident_description in extracted_data")
        else:
            print("✅ SUCCESS: AI moved to a different topic!")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("\n" + "🔬 DIAGNOSTIC TEST SUITE - Repetitive Questions Issue\n")
    asyncio.run(test_answer_analyzer())
    asyncio.run(test_question_decider())
    print("\n" + "=" * 60)
    print("TESTS COMPLETE")
    print("=" * 60)
