#!/usr/bin/env python3
"""
🔍 FOCUSED SECURITY VALIDATION TESTING
Quick validation test to understand the specific security implementations
"""

import requests
import json

BACKEND_URL = "https://automated-site.preview.emergentagent.com/api"
TEST_USER = {
    "email": "focused.test@exemplo.com", 
    "password": "FocusTest123!",
    "username": "FocusedTester"
}

def test_auth_and_validate():
    """Test authentication and input validation details"""
    session = requests.Session()
    
    print("🔧 Testing Authentication Flow...")
    
    # Test register
    register_response = session.post(
        f"{BACKEND_URL}/auth/register",
        json=TEST_USER,
        timeout=10
    )
    
    print(f"Register Response: {register_response.status_code}")
    print(f"Register Data: {register_response.text}")
    
    if register_response.status_code == 200:
        data = register_response.json()
        token = data.get("token")
        print(f"Token received: {token[:20] if token else 'None'}...")
        
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
            
            # Test protected endpoint
            scans_response = session.get(f"{BACKEND_URL}/scans", timeout=10)
            print(f"Scans access: {scans_response.status_code}")
            
            # Test input validation on register (should fail with malicious email)
            print("\n🔍 Testing SQL Injection Validation...")
            
            sql_test = session.post(
                f"{BACKEND_URL}/auth/register",
                json={
                    "email": "test@test.com'; DROP TABLE users;--",
                    "password": "test123",
                    "username": "test"
                },
                timeout=10
            )
            
            print(f"SQL injection test: {sql_test.status_code}")
            print(f"SQL response: {sql_test.text}")
            
            # Test XSS in scans
            print("\n🔍 Testing XSS Validation...")
            
            xss_test = session.post(
                f"{BACKEND_URL}/scans",
                json={
                    "name": "<script>alert('xss')</script>",
                    "target": "https://httpbin.org",
                    "scanType": "web"
                },
                timeout=10
            )
            
            print(f"XSS test: {xss_test.status_code}")
            print(f"XSS response: {xss_test.text}")
            
    else:
        # Try login instead
        login_response = session.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": TEST_USER["email"], "password": TEST_USER["password"]},
            timeout=10
        )
        print(f"\nLogin Response: {login_response.status_code}")
        print(f"Login Data: {login_response.text}")

if __name__ == "__main__":
    test_auth_and_validate()

