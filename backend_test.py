#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://projeto-completo-5.preview.emergentagent.com/api"
TEST_USER_EMAIL = "antonio.silva@exemplo.com"
TEST_USER_PASSWORD = "MinhaSenh@123"
TEST_USER_NAME = "Antonio Silva"

# Test results tracking
test_results = []
auth_token = None

def log_test(test_name, success, message, details=None):
    """Log test results"""
    result = {
        "test": test_name,
        "success": success,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "details": details
    }
    test_results.append(result)
    
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {test_name}")
    print(f"   {message}")
    if details:
        print(f"   Details: {details}")
    print()

def test_register():
    """Test user registration"""
    global auth_token
    
    print("🔐 Testing User Registration...")
    
    payload = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "name": TEST_USER_NAME
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response structure
            required_fields = ["access_token", "token_type", "user"]
            user_fields = ["id", "email", "name", "created_at"]
            
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if "user" in data:
                for field in user_fields:
                    if field not in data["user"]:
                        missing_fields.append(f"user.{field}")
            
            if missing_fields:
                log_test("Register - Response Structure", False, 
                        f"Missing fields: {', '.join(missing_fields)}", 
                        {"response": data})
            else:
                auth_token = data["access_token"]
                log_test("Register - Success", True, 
                        f"User registered successfully. Token received.", 
                        {"user_id": data["user"]["id"], "email": data["user"]["email"]})
        
        elif response.status_code == 400:
            # Expected for duplicate email
            log_test("Register - Duplicate Email", True, 
                    "Correctly rejected duplicate email registration", 
                    {"status_code": 400, "message": response.json().get("detail")})
        else:
            log_test("Register - Unexpected Status", False, 
                    f"Unexpected status code: {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("Register - Connection Error", False, f"Request failed: {str(e)}")

def test_register_duplicate():
    """Test registration with duplicate email"""
    print("🔐 Testing Duplicate Email Registration...")
    
    payload = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "name": TEST_USER_NAME
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            if "já cadastrado" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower():
                log_test("Register - Duplicate Prevention", True, 
                        "Correctly prevented duplicate email registration", 
                        {"status_code": 400})
            else:
                log_test("Register - Duplicate Error Message", False, 
                        "Unexpected error message for duplicate email", 
                        {"response": data})
        else:
            log_test("Register - Duplicate Not Prevented", False, 
                    f"Should have returned 400 for duplicate email, got {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("Register Duplicate - Connection Error", False, f"Request failed: {str(e)}")

def test_login():
    """Test user login"""
    global auth_token
    
    print("🔐 Testing User Login...")
    
    payload = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response structure
            required_fields = ["access_token", "token_type", "user"]
            user_fields = ["id", "email", "name", "created_at"]
            
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if "user" in data:
                for field in user_fields:
                    if field not in data["user"]:
                        missing_fields.append(f"user.{field}")
            
            if missing_fields:
                log_test("Login - Response Structure", False, 
                        f"Missing fields: {', '.join(missing_fields)}", 
                        {"response": data})
            else:
                auth_token = data["access_token"]
                log_test("Login - Success", True, 
                        "Login successful, token received", 
                        {"user_email": data["user"]["email"], "token_type": data["token_type"]})
        
        elif response.status_code == 401:
            log_test("Login - Credentials", False, 
                    "Login failed with valid credentials", 
                    {"status_code": 401, "message": response.json().get("detail")})
        else:
            log_test("Login - Unexpected Status", False, 
                    f"Unexpected status code: {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("Login - Connection Error", False, f"Request failed: {str(e)}")

def test_login_wrong_password():
    """Test login with wrong password"""
    print("🔐 Testing Login with Wrong Password...")
    
    payload = {
        "email": TEST_USER_EMAIL,
        "password": "wrong_password_123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        if response.status_code == 401:
            log_test("Login - Wrong Password", True, 
                    "Correctly rejected login with wrong password", 
                    {"status_code": 401})
        else:
            log_test("Login - Wrong Password Security", False, 
                    f"Should have returned 401 for wrong password, got {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("Login Wrong Password - Connection Error", False, f"Request failed: {str(e)}")

def test_get_user_info():
    """Test getting current user info"""
    global auth_token
    
    print("🔐 Testing Get User Info...")
    
    if not auth_token:
        log_test("Get User Info - No Token", False, "No auth token available from previous tests")
        return
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response structure
            required_fields = ["id", "email", "name", "created_at"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                log_test("Get User Info - Response Structure", False, 
                        f"Missing fields: {', '.join(missing_fields)}", 
                        {"response": data})
            else:
                # Validate email matches
                if data["email"] == TEST_USER_EMAIL:
                    log_test("Get User Info - Success", True, 
                            "User info retrieved successfully", 
                            {"email": data["email"], "name": data["name"]})
                else:
                    log_test("Get User Info - Wrong User", False, 
                            f"Expected email {TEST_USER_EMAIL}, got {data['email']}", 
                            {"response": data})
        
        elif response.status_code == 401:
            log_test("Get User Info - Token Invalid", False, 
                    "Valid token rejected", 
                    {"status_code": 401, "message": response.json().get("detail")})
        else:
            log_test("Get User Info - Unexpected Status", False, 
                    f"Unexpected status code: {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("Get User Info - Connection Error", False, f"Request failed: {str(e)}")

def test_get_user_info_no_token():
    """Test getting user info without token"""
    print("🔐 Testing Get User Info Without Token...")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        
        if response.status_code == 401 or response.status_code == 403:
            log_test("Get User Info - No Token Protection", True, 
                    "Correctly rejected request without token", 
                    {"status_code": response.status_code})
        else:
            log_test("Get User Info - No Token Security", False, 
                    f"Should have returned 401/403 without token, got {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("Get User Info No Token - Connection Error", False, f"Request failed: {str(e)}")

def test_logout():
    """Test user logout"""
    global auth_token
    
    print("🔐 Testing User Logout...")
    
    if not auth_token:
        log_test("Logout - No Token", False, "No auth token available from previous tests")
        return
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/logout", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test("Logout - Success", True, 
                        "Logout successful", 
                        {"message": data["message"]})
            else:
                log_test("Logout - Response Format", False, 
                        "Logout successful but unexpected response format", 
                        {"response": data})
        elif response.status_code == 401:
            log_test("Logout - Token Invalid", False, 
                    "Valid token rejected for logout", 
                    {"status_code": 401, "message": response.json().get("detail")})
        else:
            log_test("Logout - Unexpected Status", False, 
                    f"Unexpected status code: {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("Logout - Connection Error", False, f"Request failed: {str(e)}")

def test_jwt_token_validation():
    """Test JWT token validation"""
    global auth_token
    
    print("🔐 Testing JWT Token Validation...")
    
    # Test with invalid token
    invalid_headers = {
        "Authorization": "Bearer invalid_token_here",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=invalid_headers, timeout=10)
        
        if response.status_code == 401:
            log_test("JWT - Invalid Token Rejection", True, 
                    "Invalid token correctly rejected", 
                    {"status_code": 401})
        else:
            log_test("JWT - Invalid Token Security", False, 
                    f"Invalid token should be rejected with 401, got {response.status_code}", 
                    {"response": response.text})
    
    except requests.exceptions.RequestException as e:
        log_test("JWT Invalid Token - Connection Error", False, f"Request failed: {str(e)}")

def print_summary():
    """Print test summary"""
    print("=" * 60)
    print("🔍 AUTHENTICATION SYSTEM TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results if result["success"])
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    print()
    
    if failed_tests > 0:
        print("❌ FAILED TESTS:")
        for result in test_results:
            if not result["success"]:
                print(f"  • {result['test']}: {result['message']}")
        print()
    
    print("✅ PASSED TESTS:")
    for result in test_results:
        if result["success"]:
            print(f"  • {result['test']}")
    
    print("=" * 60)
    return failed_tests == 0

def main():
    """Main test execution"""
    print("🚀 Starting Authentication System Tests")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test User: {TEST_USER_EMAIL}")
    print("=" * 60)
    
    # Run all tests in sequence
    test_register()
    test_register_duplicate() 
    test_login()
    test_login_wrong_password()
    test_get_user_info()
    test_get_user_info_no_token()
    test_logout()
    test_jwt_token_validation()
    
    # Print summary
    success = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()