"""
🧪 TESTE COMPLETO DE TODAS AS FUNCIONALIDADES
Testa: register, login, /me, admin login, admin stats, admin users,
       telegram status, ddos alerts, visit tracking, scans, NoSQLi, logout
"""
import requests
import json
import time

BASE = "http://localhost:8000"
results = []

def safe_json(r):
    try: return r.json()
    except: return {}

def run_test(name, method, url, expected_range, **kwargs):
    try:
        r = getattr(requests, method)(url, timeout=10, **kwargs)
        status = "PASS" if expected_range[0] <= r.status_code <= expected_range[1] else "FAIL"
        data = safe_json(r)
        results.append(f"{'✅' if status == 'PASS' else '❌'} [{r.status_code}] {name}")
        if status == "FAIL":
            results.append(f"   Detail: {data}")
        return r
    except Exception as e:
        results.append(f"❌ [ERR] {name}: {e}")
        return None

def execute_all():
    # 1. REGISTER
    r = run_test("Register", "post", f"{BASE}/api/auth/register", [200, 201],
             json={"username":"testuser","email":"test@test.com","password":"Test123!"})
    token = safe_json(r).get("access_token","") if r else ""

    # 2. LOGIN
    r = run_test("Login", "post", f"{BASE}/api/auth/login", [200, 200],
             json={"email":"test@test.com","password":"Test123!"})
    if r:
        token = safe_json(r).get("access_token", token)

    # 3. GET /me
    run_test("Get /me", "get", f"{BASE}/api/auth/me", [200, 200],
         headers={"Authorization": f"Bearer {token}"})

    # 4. TELEGRAM CHECK
    run_test("Telegram Check", "get", f"{BASE}/api/auth/telegram/check?telegram_id=12345", [200, 200],
         headers={"Authorization": f"Bearer {token}"})

    # 5. NoSQLi PROTECTION
    run_test("NoSQLi Block", "post", f"{BASE}/api/auth/login", [400, 422],
         json={"email":{"$gt":""},"password":"test"})

    # 6. ADMIN LOGIN
    r = run_test("Admin Login", "post", f"{BASE}/api/admin/login", [200, 200],
             json={"email":"manobrown333011@gmail.com","password":"Celo050612"})
    admin_token = safe_json(r).get("access_token","") if r else ""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 7. ADMIN STATS
    r = run_test("Admin Stats", "get", f"{BASE}/api/admin/stats", [200, 200], headers=admin_headers)
    if r:
        d = safe_json(r)
        results.append(f"   CPU: {d.get('system',{}).get('cpu',{}).get('usage_percent')}%")
        results.append(f"   RAM: {d.get('system',{}).get('memory',{}).get('percent')}%")
        results.append(f"   Disk: {d.get('system',{}).get('storage',{}).get('percent')}%")
        results.append(f"   Backend MB: {d.get('backend_process',{}).get('memory_mb')}")
        results.append(f"   Project MB: {d.get('project',{}).get('size_mb')}")
        results.append(f"   DB Engine: {d.get('database',{}).get('engine')}")
        results.append(f"   Users: {d.get('database',{}).get('users')}")

    # 8. ADMIN USERS
    r = run_test("Admin Users List", "get", f"{BASE}/api/admin/users", [200, 200], headers=admin_headers)
    if r:
        d = safe_json(r)
        results.append(f"   Total: {d.get('total', 0)} | Regular: {len(d.get('regular_users',[]))} | Telegram: {len(d.get('telegram_users',[]))}")

    # 9. TELEGRAM BOT STATUS
    r = run_test("Telegram Bot Status", "get", f"{BASE}/api/admin/telegram/status", [200, 200], headers=admin_headers)
    if r:
        d = safe_json(r)
        results.append(f"   Online: {d.get('online')} | @{d.get('bot_username','N/A')}")

    # 10. DDOS ALERTS
    r = run_test("DDoS Alerts", "get", f"{BASE}/api/admin/ddos/alerts", [200, 200], headers=admin_headers)
    if r:
        d = safe_json(r)
        results.append(f"   Active: {d.get('active_alerts',0)} | Threshold: {d.get('threshold','?')}")

    # 11. VISIT TRACKING
    run_test("Visit Track", "post", f"{BASE}/api/admin/visits/track", [200, 200])

    # 12. ALL SCANS
    run_test("Admin All Scans", "get", f"{BASE}/api/admin/scans/all", [200, 200], headers=admin_headers)

    # 13. ADMIN BAD CREDS
    run_test("Admin Bad Creds", "post", f"{BASE}/api/admin/login", [401, 401],
         json={"email":"wrong@test.com","password":"wrong"})

    # 14. PROTECTED ROUTE WITHOUT TOKEN
    run_test("Protected No Token", "get", f"{BASE}/api/admin/stats", [401, 403])

    # 15. LOGOUT
    run_test("Logout", "post", f"{BASE}/api/auth/logout", [200, 200],
         headers={"Authorization": f"Bearer {token}"})

    # 16. DELETE TEST USER
    run_test("Delete Test User", "delete", f"{BASE}/api/admin/users/testuser_id", [200, 404], headers=admin_headers)

    print("\n=== TESTE COMPLETO ===\n")
    for r in results:
        print(r)

    passed = sum(1 for r in results if r.startswith("✅"))
    failed = sum(1 for r in results if r.startswith("❌"))
    print(f"\n{'='*40}")
    print(f"RESULTADO: {passed} PASS / {failed} FAIL")
    print(f"{'='*40}")

if __name__ == "__main__":
    execute_all()
