"""
Backend API Tests - Olhos de Deus Security Scanner
Tests for scan creation, listing, vulnerabilities, and stats endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

import uuid
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

class TestHealthAndRoot:
    """Test basic API health and root endpoint"""
    
    def test_api_root(self):
        """Test API root endpoint returns expected message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Pentester" in data["message"] or "API" in data["message"]
    
    def test_stats_endpoint(self):
        """Test stats endpoint returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert "totalScans" in data
        assert "totalVulnerabilities" in data
        assert "criticalVulnerabilities" in data
        assert "highVulnerabilities" in data
        assert isinstance(data["totalScans"], int)
        assert isinstance(data["totalVulnerabilities"], int)


class TestScansAPI:
    """Test scan CRUD operations"""
    
    def test_list_scans(self):
        """Test GET /api/scans returns list"""
        response = requests.get(f"{BASE_URL}/api/scans", headers=get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_scan(self):
        """Test POST /api/scans creates new scan"""
        payload = {
            "name": "TEST_Scan_API_Test",
            "target": "http://testphp.vulnweb.com",
            "scanType": "web"
        }
        response = requests.post(f"{BASE_URL}/api/scans", json=payload, headers=get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["target"] == payload["target"]
        assert data["scanType"] == payload["scanType"]
        assert data["status"] in ["pending", "running"]
        assert "createdAt" in data
        
        return data["id"]
    
    def test_create_scan_and_get_by_id(self):
        """Test creating scan and retrieving by ID"""
        # Create scan
        payload = {
            "name": "TEST_Scan_Get_By_ID",
            "target": "http://testphp.vulnweb.com",
            "scanType": "api"
        }
        create_response = requests.post(f"{BASE_URL}/api/scans", json=payload, headers=get_auth_headers())
        assert create_response.status_code == 200
        created_scan = create_response.json()
        scan_id = created_scan["id"]
        
        # Get scan by ID
        get_response = requests.get(f"{BASE_URL}/api/scans/{scan_id}", headers=get_auth_headers())
        assert get_response.status_code == 200
        fetched_scan = get_response.json()
        
        # Validate data persisted correctly
        assert fetched_scan["id"] == scan_id
        assert fetched_scan["name"] == payload["name"]
        assert fetched_scan["target"] == payload["target"]
        assert fetched_scan["scanType"] == payload["scanType"]
    
    def test_get_nonexistent_scan(self):
        """Test GET /api/scans/{id} with invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/scans/nonexistent-id-12345", headers=get_auth_headers())
        assert response.status_code == 404
    
    def test_create_scan_missing_fields(self):
        """Test POST /api/scans with missing required fields"""
        # Missing target
        payload = {"name": "TEST_Missing_Target"}
        response = requests.post(f"{BASE_URL}/api/scans", json=payload, headers=get_auth_headers())
        assert response.status_code == 422  # Validation error
        
        # Missing name
        payload = {"target": "http://example.com"}
        response = requests.post(f"{BASE_URL}/api/scans", json=payload, headers=get_auth_headers())
        assert response.status_code == 422


class TestVulnerabilitiesAPI:
    """Test vulnerabilities endpoint"""
    
    def test_get_vulnerabilities_for_scan(self):
        """Test GET /api/scans/{id}/vulnerabilities returns list"""
        # First get existing scans
        scans_response = requests.get(f"{BASE_URL}/api/scans", headers=get_auth_headers())
        scans = scans_response.json()
        
        if len(scans) > 0:
            # Get vulnerabilities for first scan
            scan_id = scans[0]["id"]
            response = requests.get(f"{BASE_URL}/api/scans/{scan_id}/vulnerabilities", headers=get_auth_headers())
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            
            # If vulnerabilities exist, validate structure
            if len(data) > 0:
                vuln = data[0]
                assert "id" in vuln
                assert "scan_id" in vuln
                assert "severity" in vuln
                assert "title" in vuln
                assert "description" in vuln
                assert "category" in vuln
                assert "endpoint" in vuln
                assert "recommendation" in vuln
    
    def test_get_vulnerabilities_nonexistent_scan(self):
        """Test vulnerabilities for non-existent scan returns empty list"""
        response = requests.get(f"{BASE_URL}/api/scans/nonexistent-scan-id/vulnerabilities", headers=get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0


class TestScanExecution:
    """Test scan execution and vulnerability detection"""
    
    def test_scan_completes_and_finds_vulnerabilities(self):
        """Test that a scan completes and finds vulnerabilities on vulnerable target"""
        # Create scan against known vulnerable target
        payload = {
            "name": "TEST_Full_Scan_Execution",
            "target": "http://testphp.vulnweb.com",
            "scanType": "full"
        }
        create_response = requests.post(f"{BASE_URL}/api/scans", json=payload, headers=get_auth_headers())
        assert create_response.status_code == 200
        scan_id = create_response.json()["id"]
        
        # Poll for completion (max 120 seconds for 35 tests)
        max_wait = 120
        poll_interval = 5
        elapsed = 0
        
        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval
            
            status_response = requests.get(f"{BASE_URL}/api/scans/{scan_id}", headers=get_auth_headers())
            assert status_response.status_code == 200
            scan_data = status_response.json()
            
            print(f"Scan progress: {scan_data.get('progress', 0)}% - {scan_data.get('currentTask', 'N/A')}")
            
            if scan_data["status"] in ["completed", "failed"]:
                break
        
        # Verify scan completed
        final_response = requests.get(f"{BASE_URL}/api/scans/{scan_id}", headers=get_auth_headers())
        final_scan = final_response.json()
        assert final_scan["status"] == "completed", f"Scan status: {final_scan['status']}, task: {final_scan.get('currentTask')}"
        
        # Verify vulnerabilities were found
        vulns_response = requests.get(f"{BASE_URL}/api/scans/{scan_id}/vulnerabilities", headers=get_auth_headers())
        assert vulns_response.status_code == 200
        vulnerabilities = vulns_response.json()
        
        # testphp.vulnweb.com should have multiple vulnerabilities
        assert len(vulnerabilities) > 0, "Expected vulnerabilities to be found on vulnerable target"
        print(f"Found {len(vulnerabilities)} vulnerabilities")
        
        # Validate vulnerability structure
        for vuln in vulnerabilities:
            assert vuln["severity"] in ["critical", "high", "medium", "low", "info"]
            assert len(vuln["title"]) > 0
            assert len(vuln["description"]) > 0


class TestStatsAccuracy:
    """Test stats endpoint accuracy"""
    
    def test_stats_reflect_database(self):
        """Test that stats endpoint reflects actual database counts"""
        # Get stats
        stats_response = requests.get(f"{BASE_URL}/api/stats", headers=get_auth_headers())
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Get all scans
        scans_response = requests.get(f"{BASE_URL}/api/scans", headers=get_auth_headers())
        scans = scans_response.json()
        
        # Stats totalScans should match scans list length
        assert stats["totalScans"] == len(scans), f"Stats shows {stats['totalScans']} but found {len(scans)} scans"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
