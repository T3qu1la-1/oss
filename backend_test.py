#!/usr/bin/env python3
"""
Backend Testing Suite - Simplified System Validation
Testing focus: Registration validation, regular login, security headers, authenticated scans
After admin and telegram removal
"""

import requests
import json
import time
import uuid
from typing import Dict, Any

class BackendTester:
    def __init__(self):
        self.base_url = "https://automated-site.preview.emergentagent.com/api"
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} - {test_name}"
        if details:
            result += f" | {details}"
        self.test_results.append(result)
        print(result)
        
    def test_unique_registration_validation(self):
        """Test 1: REGISTRO COM VALIDAÇÃO ÚNICA"""
        print("\n🔐 TESTE 1: VALIDAÇÃO ÚNICA NO REGISTRO")
        
        # Test data
        test_email = "test@test.com"
        test_username = "test_user"
        
        # First registration - should succeed
        try:
            register_data = {
                "email": test_email,
                "username": test_username,
                "password": "SecurePass123!"
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=register_data, timeout=10)
            
            if response.status_code == 201:
                self.log_test("Primeiro registro bem-sucedido", True, f"Status: {response.status_code}")
                response_data = response.json()
                self.auth_token = response_data.get("access_token") or response_data.get("token")
                self.test_user_id = response_data.get("user", {}).get("id")
            else:
                # User might already exist, let's try to login instead
                login_data = {"email": test_email, "password": "SecurePass123!"}
                login_response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=10)
                if login_response.status_code == 200:
                    self.log_test("Login com usuário existente", True, f"Status: {login_response.status_code}")
                    response_data = login_response.json()
                    self.auth_token = response_data.get("access_token") or response_data.get("token")
                    self.test_user_id = response_data.get("user", {}).get("id")
                else:
                    self.log_test("Primeiro registro falhou", False, f"Status: {response.status_code}, Body: {response.text}")
                    return
                    
        except Exception as e:
            self.log_test("Erro no primeiro registro", False, f"Exception: {str(e)}")
            return
            
        # Test duplicate EMAIL
        try:
            duplicate_email_data = {
                "email": test_email,  # Same email
                "username": "different_username",  # Different username
                "password": "AnotherPass123!"
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=duplicate_email_data, timeout=10)
            
            if response.status_code in [400, 409, 422]:
                response_text = response.text.lower()
                if "email" in response_text and ("cadastrado" in response_text or "exist" in response_text or "already" in response_text):
                    self.log_test("Validação email duplicado funcionando", True, f"Status: {response.status_code}, Mensagem correta")
                else:
                    self.log_test("Validação email duplicado - mensagem incorreta", False, f"Status: {response.status_code}, Body: {response.text}")
            else:
                self.log_test("Validação email duplicado falhou", False, f"Status: {response.status_code}, deveria ser 400/409/422")
                
        except Exception as e:
            self.log_test("Erro no teste email duplicado", False, f"Exception: {str(e)}")
            
        # Test duplicate USERNAME  
        try:
            duplicate_username_data = {
                "email": "different@email.com",  # Different email
                "username": test_username,  # Same username
                "password": "AnotherPass123!"
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=duplicate_username_data, timeout=10)
            
            if response.status_code in [400, 409, 422]:
                response_text = response.text.lower()
                if "username" in response_text or "usuário" in response_text or "nome" in response_text:
                    self.log_test("Validação username duplicado funcionando", True, f"Status: {response.status_code}, Mensagem correta")
                else:
                    self.log_test("Validação username duplicado - mensagem incorreta", False, f"Status: {response.status_code}, Body: {response.text}")
            else:
                self.log_test("Validação username duplicado falhou", False, f"Status: {response.status_code}, deveria ser 400/409/422")
                
        except Exception as e:
            self.log_test("Erro no teste username duplicado", False, f"Exception: {str(e)}")
    
    def test_regular_login(self):
        """Test 2: LOGIN REGULAR (sem admin)"""
        print("\n🔑 TESTE 2: LOGIN REGULAR")
        
        # Test with created user
        try:
            login_data = {
                "email": "test@test.com",
                "password": "SecurePass123!"
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                token = response_data.get("access_token") or response_data.get("token")
                user_data = response_data.get("user", {})
                role = user_data.get("role", "")
                
                if token:
                    self.log_test("Login bem-sucedido", True, f"Token recebido: {token[:20]}...")
                    self.auth_token = token
                    
                    # Check role from JWT token if not in user object
                    if not role and token:
                        try:
                            import jwt
                            import json
                            import base64
                            parts = token.split('.')
                            payload = json.loads(base64.b64decode(parts[1] + '==='))
                            role = payload.get("role", "")
                        except:
                            pass
                    
                    # Verify role is "user" (not admin)
                    if role == "user":
                        self.log_test("Role correto: user", True, f"Role: {role}")
                    else:
                        self.log_test("Role incorreto", False, f"Role: {role}, deveria ser 'user'")
                else:
                    self.log_test("Token não recebido", False, "Token ausente na resposta")
            else:
                self.log_test("Login falhou", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_test("Erro no login", False, f"Exception: {str(e)}")
            
        # Test that admin login is rejected
        try:
            admin_login_data = {
                "email": "manobrown333011@gmail.com",
                "password": "anypassword"
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=admin_login_data, timeout=10)
            
            if response.status_code in [401, 403, 404]:
                self.log_test("Admin rejeitado corretamente", True, f"Status: {response.status_code}")
            elif response.status_code == 200:
                # Check if it has admin role or if admin is disabled
                response_data = response.json()
                user_data = response_data.get("user", {})
                role = user_data.get("role", "")
                if role != "admin":
                    self.log_test("Ex-admin agora é user regular", True, f"Role: {role}")
                else:
                    self.log_test("Admin ainda tem acesso", False, f"Admin deveria ser removido")
            else:
                self.log_test("Resposta inesperada para admin", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Erro no teste admin", False, f"Exception: {str(e)}")
    
    def test_security_headers(self):
        """Test 3: PROTEÇÕES TLS/BYPASS - Security Headers"""
        print("\n🛡️ TESTE 3: HEADERS DE SEGURANÇA")
        
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            headers = response.headers
            
            # Required security headers
            security_headers = [
                "Referrer-Policy",
                "Permissions-Policy", 
                "Strict-Transport-Security"
            ]
            
            for header in security_headers:
                if header in headers:
                    self.log_test(f"Header {header} presente", True, f"Valor: {headers[header]}")
                else:
                    self.log_test(f"Header {header} ausente", False, "Header de segurança não encontrado")
                    
            # Additional common security headers
            additional_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY", 
                "X-XSS-Protection": "1; mode=block"
            }
            
            for header, expected in additional_headers.items():
                if header in headers:
                    self.log_test(f"Header {header} presente", True, f"Valor: {headers[header]}")
                else:
                    self.log_test(f"Header {header} ausente", False, "Header adicional não encontrado")
                    
        except Exception as e:
            self.log_test("Erro ao verificar headers", False, f"Exception: {str(e)}")
    
    def test_authenticated_scans(self):
        """Test 4: SCANS (AUTENTICADO)"""
        print("\n🔍 TESTE 4: SCANS AUTENTICADOS")
        
        if not self.auth_token:
            self.log_test("Token não disponível", False, "Necessário login primeiro")
            return
            
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test creating a scan
        try:
            scan_data = {
                "name": f"Teste Scan {uuid.uuid4().hex[:8]}",
                "target": "https://httpbin.org",
                "scan_type": "quick"
            }
            
            response = requests.post(f"{self.base_url}/scans", json=scan_data, headers=headers, timeout=15)
            
            if response.status_code in [200, 201]:
                response_data = response.json()
                scan_id = response_data.get("id")
                self.log_test("Criação de scan autenticado", True, f"Scan ID: {scan_id}")
                
                # Test retrieving scans
                try:
                    get_response = requests.get(f"{self.base_url}/scans", headers=headers, timeout=10)
                    if get_response.status_code == 200:
                        scans_data = get_response.json()
                        scans = scans_data.get("scans", []) if isinstance(scans_data, dict) else scans_data
                        self.log_test("Listagem de scans autenticado", True, f"Total scans: {len(scans)}")
                    else:
                        self.log_test("Listagem de scans falhou", False, f"Status: {get_response.status_code}")
                except Exception as e:
                    self.log_test("Erro na listagem de scans", False, f"Exception: {str(e)}")
                    
            else:
                self.log_test("Criação de scan falhou", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_test("Erro na criação de scan", False, f"Exception: {str(e)}")
            
        # Test accessing scans without authentication
        try:
            response = requests.get(f"{self.base_url}/scans", timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("Proteção de autenticação funcionando", True, f"Acesso negado sem token: {response.status_code}")
            else:
                self.log_test("Proteção de autenticação falhou", False, f"Status: {response.status_code}, deveria ser 401/403")
        except Exception as e:
            self.log_test("Erro no teste sem autenticação", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Execute all tests in sequence"""
        print("🚀 INICIANDO TESTES DO SISTEMA SIMPLIFICADO")
        print("=" * 60)
        
        self.test_unique_registration_validation()
        self.test_regular_login() 
        self.test_security_headers()
        self.test_authenticated_scans()
        
        print("\n" + "=" * 60)
        print("📊 RESUMO DOS TESTES")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
        
        print(f"Total: {len(self.test_results)} | Passou: {passed} | Falhou: {failed}")
        print(f"Taxa de Sucesso: {(passed/len(self.test_results)*100):.1f}%")
        
        print("\nDetalhes:")
        for result in self.test_results:
            print(f"  {result}")
            
        return passed, failed

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()