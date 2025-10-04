"""
Test script for CaseSwift AI Features
Tests all new AI endpoints to ensure they're working correctly.
"""

import requests
import json
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration - Get from environment or use default
BASE_URL = os.getenv('VITE_AI_API_URL', 'http://localhost:8000')
TEST_CASE_ID = "TEST-DEMO-001"

print(f"Testing AI API at: {BASE_URL}")

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    print(f"{BLUE}ℹ {message}{RESET}")

def print_warning(message):
    print(f"{YELLOW}⚠ {message}{RESET}")

def test_health_check():
    """Test if the API is running"""
    print_info("Testing API health check...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print_success("API is running!")
            return True
        else:
            print_error(f"API health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to API. Is the server running on port 8000?")
        return False

def test_generate_checklist():
    """Test checklist generation endpoint"""
    print_info("\nTesting AI Checklist Generator...")
    
    payload = {
        "case_id": TEST_CASE_ID,
        "case_type": "POCSO Case",
        "victim_age": 15,
        "incident_details": "Test case for checklist generation",
        "current_status": "Initial registration"
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/generate-checklist",
            json=payload,
            timeout=30
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Checklist generated successfully in {elapsed_time:.2f}s")
            print_info(f"  Generated {len(data['checklist'])} checklist items")
            
            # Display first 2 items as example
            if data['checklist']:
                print_info("\n  Sample checklist items:")
                for item in data['checklist'][:2]:
                    print(f"    • {item['task']} ({item['category']})")
            
            return True
        else:
            print_error(f"Checklist generation failed: {response.status_code}")
            print_error(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print_error("Request timed out (>30s). LLM might be slow or not loaded.")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_next_action():
    """Test next action recommendation endpoint"""
    print_info("\nTesting Next Action Recommender...")
    
    payload = {
        "case_id": TEST_CASE_ID,
        "case_type": "POCSO Case",
        "completed_steps": ["FIR registered", "Medical examination completed"],
        "pending_steps": ["Age determination", "CWC notification", "Witness statements"]
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/next-action",
            json=payload,
            timeout=30
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Next action recommended in {elapsed_time:.2f}s")
            
            # Display recommendation preview
            recommendation = data['recommendation'][:200]
            print_info(f"  Recommendation preview: {recommendation}...")
            
            return True
        else:
            print_error(f"Next action recommendation failed: {response.status_code}")
            print_error(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print_error("Request timed out (>30s)")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_evidence_gap_analysis():
    """Test evidence gap analyzer endpoint"""
    print_info("\nTesting Evidence Gap Analyzer...")
    
    payload = {
        "case_id": TEST_CASE_ID,
        "case_type": "POCSO Case",
        "evidence_list": [
            "Medical examination report",
            "Victim statement",
            "Witness statement from teacher"
        ]
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/analyze-evidence-gaps",
            json=payload,
            timeout=30
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Evidence gaps analyzed in {elapsed_time:.2f}s")
            
            # Display analysis preview
            analysis = data['gap_analysis'][:200]
            print_info(f"  Analysis preview: {analysis}...")
            
            return True
        else:
            print_error(f"Evidence gap analysis failed: {response.status_code}")
            print_error(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print_error("Request timed out (>30s)")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_document_quality_review():
    """Test document quality reviewer endpoint"""
    print_info("\nTesting Document Quality Reviewer...")
    
    sample_fir = """
    FIR No: 123/2024
    Date: 01-10-2024
    Station: City Police Station
    
    Complaint: Sexual assault case involving a minor victim aged 15 years.
    Incident occurred on 30-09-2024 at approximately 8 PM.
    
    Sections: POCSO Act Section 4
    """
    
    payload = {
        "case_id": TEST_CASE_ID,
        "case_type": "POCSO Case",
        "document_type": "FIR",
        "document_content": sample_fir
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/review-document-quality",
            json=payload,
            timeout=30
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Document reviewed in {elapsed_time:.2f}s")
            
            # Display review preview
            review = data['quality_review'][:200]
            print_info(f"  Review preview: {review}...")
            
            return True
        else:
            print_error(f"Document quality review failed: {response.status_code}")
            print_error(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print_error("Request timed out (>30s)")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def run_all_tests():
    """Run all tests and display summary"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}  CaseSwift AI Features - Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Check if API is running
    if not test_health_check():
        print_error("\n❌ API is not running. Please start the server first:")
        print_info("   cd ChatBot")
        print_info("   uvicorn api:app --reload --port 8000")
        return
    
    # Run all tests
    tests = [
        ("Checklist Generator", test_generate_checklist),
        ("Next Action Recommender", test_next_action),
        ("Evidence Gap Analyzer", test_evidence_gap_analysis),
        ("Document Quality Reviewer", test_document_quality_review)
    ]
    
    results = {}
    for test_name, test_func in tests:
        results[test_name] = test_func()
        time.sleep(1)  # Small delay between tests
    
    # Print summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}  Test Summary{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASSED{RESET}" if result else f"{RED}FAILED{RESET}"
        print(f"  {test_name:.<40} {status}")
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    
    if passed == total:
        print_success(f"\n🎉 All {total} tests passed! System is working correctly.")
    else:
        print_warning(f"\n⚠ {passed}/{total} tests passed. Please check failed tests.")
    
    print(f"\n{BLUE}{'='*60}{RESET}\n")

if __name__ == "__main__":
    run_all_tests()
