#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time


class TelcoAPITester:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.user_password = "TestPass123!"
        self.user_name = "Test User"

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            print(f"   Status: {response.status_code}")

            success = response.status_code == expected_status
            if success:
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    self.log_result(name, True)
                    return True, response_data
                except:
                    # For non-JSON responses (like PDF)
                    self.log_result(name, True)
                    return True, response.content
            else:
                try:
                    error_data = response.json()
                    details = f"Expected {expected_status}, got {response.status_code}. Error: {error_data}"
                except:
                    details = f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}"
                self.log_result(name, False, details)
                return False, {}

        except requests.exceptions.Timeout:
            self.log_result(name, False, f"Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)

        self.run_test("Health Check", "GET", "", 200)
        self.run_test("Health Status", "GET", "health", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)

        # Test user registration
        register_data = {
            "name": self.user_name,
            "email": self.user_email,
            "password": self.user_password
        }

        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            register_data
        )

        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")

        # Test user login
        login_data = {
            "email": self.user_email,
            "password": self.user_password
        }

        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            login_data
        )

        if success and 'token' in response:
            self.token = response['token']
            print(f"   Login token: {self.token[:20]}...")

        # Test get current user
        if self.token:
            self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD ENDPOINTS")
        print("="*50)

        if not self.token:
            print("❌ No auth token available, skipping dashboard tests")
            return

        self.run_test("Dashboard KPIs", "GET", "dashboard/kpis", 200)
        self.run_test("Churn Trends", "GET", "dashboard/churn-trends", 200)
        self.run_test("Churn Reasons", "GET", "dashboard/churn-reasons", 200)
        self.run_test("Revenue by Segment", "GET", "dashboard/revenue-by-segment", 200)
        self.run_test("Retention by Offer", "GET", "dashboard/retention-by-offer", 200)

    def test_churn_prediction(self):
        """Test churn prediction endpoint"""
        print("\n" + "="*50)
        print("TESTING CHURN PREDICTION")
        print("="*50)

        if not self.token:
            print("❌ No auth token available, skipping churn prediction tests")
            return

        # Test churn prediction with sample data
        prediction_data = {
            "tenure": 12,
            "voice_usage": 200.5,
            "data_usage": 5.2,
            "complaints": 1,
            "contract_type": "postpaid",
            "monthly_charges": 65.0,
            "internet_service": "Fiber optic",
            "online_security": "No",
            "tech_support": "Yes",
            "streaming_tv": "No"
        }

        self.run_test(
            "Churn Prediction",
            "POST",
            "churn/predict",
            200,
            prediction_data
        )

    def test_segmentation_endpoints(self):
        """Test segmentation endpoints"""
        print("\n" + "="*50)
        print("TESTING SEGMENTATION")
        print("="*50)

        if not self.token:
            print("❌ No auth token available, skipping segmentation tests")
            return

        self.run_test("Customer Segments", "GET", "segments", 200)

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n" + "="*50)
        print("TESTING ANALYTICS")
        print("="*50)

        if not self.token:
            print("❌ No auth token available, skipping analytics tests")
            return

        self.run_test("Analytics Overview", "GET", "analytics/overview", 200)
        self.run_test("Analytics Trends", "GET", "analytics/trends", 200)

        # Test with filters
        self.run_test(
            "Analytics Overview with Filter",
            "GET",
            "analytics/overview?customer_type=active",
            200
        )

    def test_reports_endpoints(self):
        """Test PDF report generation"""
        print("\n" + "="*50)
        print("TESTING REPORTS")
        print("="*50)

        if not self.token:
            print("❌ No auth token available, skipping reports tests")
            return

        # Test PDF generation
        report_data = {
            "title": "Test Report",
            "include_sections": ["kpis", "churn", "segments"]
        }

        # PDF generation might take longer
        self.run_test(
            "PDF Report Generation",
            "POST",
            "reports/generate-pdf",
            200,
            report_data,
            timeout=60
        )

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        print("\n" + "="*50)
        print("TESTING UNAUTHORIZED ACCESS")
        print("="*50)

        # Temporarily remove token
        original_token = self.token
        self.token = None

        self.run_test("Unauthorized KPIs Access", "GET", "dashboard/kpis", 401)
        self.run_test("Unauthorized Segments Access", "GET", "segments", 401)

        # Restore token
        self.token = original_token

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Telco Analytics API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        start_time = time.time()

        # Run test suites
        self.test_health_check()
        self.test_auth_endpoints()
        self.test_dashboard_endpoints()
        self.test_churn_prediction()
        self.test_segmentation_endpoints()
        self.test_analytics_endpoints()
        self.test_reports_endpoints()
        self.test_unauthorized_access()

        end_time = time.time()
        duration = end_time - start_time

        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"📊 Tests run: {self.tests_run}")
        print(f"✅ Tests passed: {self.tests_passed}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print(f"⏱️  Duration: {duration:.2f}s")

        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}.{failure['test']}")
                print(f"{failure['details']}")

        return len(self.failed_tests) == 0


def main():
    """Main test runner"""
    tester = TelcoAPITester()
    success = tester.run_all_tests()

    # Return appropriate exit code
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())