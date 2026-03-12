#!/usr/bin/env python3
"""
Tools Endpoints Testing Script
Tests the three new tool endpoints:
1. POST /api/tools/extract-exif - Extract EXIF data from images
2. POST /api/tools/clone-website - Clone website HTML content
3. POST /api/tools/analyze-face - Analyze faces in images
"""

import requests
import json
import sys
from io import BytesIO
from PIL import Image
import os

# Backend URL from frontend .env
BACKEND_URL = "https://automated-site.preview.emergentagent.com"

class ToolsEndpointTester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 15
        
    def test_extract_exif(self):
        """Test POST /api/tools/extract-exif endpoint"""
        print("\n=== Testing POST /api/tools/extract-exif ===")
        
        try:
            # Create a test image with some basic properties
            test_image = Image.new('RGB', (800, 600), color='red')
            
            # Save image to bytes
            img_buffer = BytesIO()
            test_image.save(img_buffer, format='JPEG')
            img_buffer.seek(0)
            
            # Test the endpoint
            url = f"{self.base_url}/api/tools/extract-exif"
            files = {'file': ('test_image.jpg', img_buffer, 'image/jpeg')}
            
            response = self.session.post(url, files=files)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify response structure
                required_fields = ['camera', 'date', 'gps', 'settings', 'software', 'resolution', 'size', 'format']
                missing_fields = []
                
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ MISSING FIELDS: {missing_fields}")
                    return False
                
                # Verify GPS structure (should have lat/lng even if None)
                gps_data = data.get('gps', {})
                if not isinstance(gps_data, dict):
                    print("❌ GPS data should be a dictionary")
                    return False
                
                # Verify settings structure 
                settings = data.get('settings', {})
                if not isinstance(settings, dict):
                    print("❌ Settings should be a dictionary")
                    return False
                
                # Basic validation checks
                if data['resolution'] != "800 x 600":
                    print(f"❌ Expected resolution '800 x 600', got '{data['resolution']}'")
                    return False
                
                if data['format'] != 'JPEG':
                    print(f"❌ Expected format 'JPEG', got '{data['format']}'")
                    return False
                
                print("✅ EXIF extraction endpoint working correctly")
                return True
            else:
                print(f"❌ Failed with status {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"Error: {error_detail}")
                except:
                    print(f"Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception during EXIF test: {str(e)}")
            return False
    
    def test_clone_website(self):
        """Test POST /api/tools/clone-website endpoint"""
        print("\n=== Testing POST /api/tools/clone-website ===")
        
        try:
            url = f"{self.base_url}/api/tools/clone-website"
            
            # Test with httpbin.org which is reliable for testing
            test_data = {"url": "https://httpbin.org/html"}
            
            response = self.session.post(
                url, 
                json=test_data,
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response keys: {list(data.keys())}")
                
                # Verify response structure
                required_fields = ['html', 'status', 'size']
                missing_fields = []
                
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ MISSING FIELDS: {missing_fields}")
                    return False
                
                # Verify data types and content
                if not isinstance(data['html'], str):
                    print("❌ HTML content should be a string")
                    return False
                
                if data['status'] != 200:
                    print(f"❌ Status should be 200, got {data['status']}")
                    return False
                
                if not isinstance(data['size'], int) or data['size'] <= 0:
                    print("❌ Size should be positive integer")
                    return False
                
                if len(data['html']) != data['size']:
                    print("❌ HTML length doesn't match reported size")
                    return False
                
                # Check if HTML looks valid
                if '<html' not in data['html'].lower() and '<!doctype' not in data['html'].lower():
                    print("❌ Doesn't look like valid HTML content")
                    return False
                
                print("✅ Website cloning endpoint working correctly")
                print(f"   Cloned {data['size']} bytes of HTML")
                return True
            else:
                print(f"❌ Failed with status {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"Error: {error_detail}")
                except:
                    print(f"Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception during website clone test: {str(e)}")
            return False
    
    def test_analyze_face(self):
        """Test POST /api/tools/analyze-face endpoint"""
        print("\n=== Testing POST /api/tools/analyze-face ===")
        
        try:
            # Create a test image
            test_image = Image.new('RGB', (640, 480), color='blue')
            
            # Save image to bytes
            img_buffer = BytesIO()
            test_image.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            
            # Test the endpoint
            url = f"{self.base_url}/api/tools/analyze-face"
            files = {'file': ('test_face.png', img_buffer, 'image/png')}
            
            response = self.session.post(url, files=files)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify response structure
                required_fields = ['faces', 'width', 'height', 'format']
                missing_fields = []
                
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ MISSING FIELDS: {missing_fields}")
                    return False
                
                # Verify data types and values
                if not isinstance(data['faces'], int):
                    print("❌ Faces count should be an integer")
                    return False
                
                if data['width'] != 640:
                    print(f"❌ Width should be 640, got {data['width']}")
                    return False
                
                if data['height'] != 480:
                    print(f"❌ Height should be 480, got {data['height']}")
                    return False
                
                if data['format'] != 'PNG':
                    print(f"❌ Format should be PNG, got {data['format']}")
                    return False
                
                print("✅ Face analysis endpoint working correctly")
                print(f"   Detected {data['faces']} faces in {data['width']}x{data['height']} {data['format']} image")
                return True
            else:
                print(f"❌ Failed with status {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"Error: {error_detail}")
                except:
                    print(f"Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception during face analysis test: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all endpoint tests"""
        print(f"🚀 Starting Tools Endpoints API tests for: {self.base_url}")
        
        results = {
            'extract_exif': self.test_extract_exif(),
            'clone_website': self.test_clone_website(), 
            'analyze_face': self.test_analyze_face()
        }
        
        print("\n" + "="*50)
        print("📊 TOOLS ENDPOINTS TEST RESULTS")
        print("="*50)
        
        all_passed = True
        for endpoint, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{endpoint:20} : {status}")
            if not passed:
                all_passed = False
        
        print("\n" + "="*50)
        if all_passed:
            print("🎉 ALL TOOLS ENDPOINTS WORKING - Ready for frontend integration!")
        else:
            print("⚠️  SOME TOOLS ENDPOINTS FAILED - Check individual results above")
        print("="*50)
        
        return results
        
if __name__ == "__main__":
    tester = ToolsEndpointTester(BACKEND_URL)
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if all(results.values()):
        sys.exit(0)
    else:
        sys.exit(1)

