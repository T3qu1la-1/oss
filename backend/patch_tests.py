import os

filepath = r"c:\Users\home\.gemini\antigravity\scratch\OlhoDeCristo_Osint\backend\tests\test_security_scanner.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

header_code = """import uuid
TOKEN = None
HEADERS = {}

def get_auth_headers():
    global TOKEN, HEADERS
    if HEADERS: return HEADERS
    username = f"test_{uuid.uuid4().hex[:8]}"
    pwd = "TestPassword123!"
    requests.post(f"{BASE_URL}/api/auth/register", json={"username": username, "password": pwd, "role": "admin"})
    resp = requests.post(f"{BASE_URL}/api/auth/login", data={"username": username, "password": pwd})
    if resp.status_code == 200:
        TOKEN = resp.json().get("access_token")
        HEADERS = {"Authorization": f"Bearer {TOKEN}"}
    return HEADERS

"""

content = content.replace("class TestHealthAndRoot:", header_code + "class TestHealthAndRoot:")

# Replace requests in stats
content = content.replace('requests.get(f"{BASE_URL}/api/stats")', 'requests.get(f"{BASE_URL}/api/stats", headers=get_auth_headers())')

# Replace requests in scans get
content = content.replace('requests.get(f"{BASE_URL}/api/scans")', 'requests.get(f"{BASE_URL}/api/scans", headers=get_auth_headers())')
content = content.replace('requests.get(f"{BASE_URL}/api/scans/{scan_id}")', 'requests.get(f"{BASE_URL}/api/scans/{scan_id}", headers=get_auth_headers())')
content = content.replace('requests.get(f"{BASE_URL}/api/scans/{scan_id}/vulnerabilities")', 'requests.get(f"{BASE_URL}/api/scans/{scan_id}/vulnerabilities", headers=get_auth_headers())')
content = content.replace('requests.get(f"{BASE_URL}/api/scans/nonexistent-id-12345")', 'requests.get(f"{BASE_URL}/api/scans/nonexistent-id-12345", headers=get_auth_headers())')
content = content.replace('requests.get(f"{BASE_URL}/api/scans/nonexistent-scan-id/vulnerabilities")', 'requests.get(f"{BASE_URL}/api/scans/nonexistent-scan-id/vulnerabilities", headers=get_auth_headers())')

# Replace requests in scans post
content = content.replace('requests.post(f"{BASE_URL}/api/scans", json=payload)', 'requests.post(f"{BASE_URL}/api/scans", json=payload, headers=get_auth_headers())')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("patch applied successfully")
