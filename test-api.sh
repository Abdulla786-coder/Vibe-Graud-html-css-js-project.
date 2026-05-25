#!/bin/bash
# VibeGuard Database API Test Script
# This script demonstrates all database-related API endpoints

BASE_URL="http://localhost:5000"
USER_ID=""

echo "================================"
echo "VibeGuard Database API Tests"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Register a new user
echo -e "${BLUE}1. Registering a new user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test_'$(date +%s)'@example.com",
    "password": "SecurePassword123"
  }')
echo "$REGISTER_RESPONSE" | jq .
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ User registered with ID: $USER_ID${NC}"
echo ""

# Test 2: Login
echo -e "${BLUE}2. Logging in user...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s -d '1 second ago' 2>/dev/null || echo $(date +%s))'",
    "email": "test_'$(date +%s)'@example.com",
    "password": "SecurePassword123"
  }')
echo "$LOGIN_RESPONSE" | jq .
echo ""

# Test 3: Get user profile
echo -e "${BLUE}3. Getting user profile...${NC}"
curl -s -X GET "$BASE_URL/api/users/$USER_ID" | jq .
echo ""

# Test 4: Submit a scan (JavaScript)
echo -e "${BLUE}4. Submitting a scan (JavaScript)...${NC}"
SCAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/scans" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const password = \"admin123\"; eval(userInput);",
    "language": "javascript",
    "vulnerabilities": [
      {"type": "hardcoded_password", "severity": "high"},
      {"type": "eval_usage", "severity": "high"}
    ],
    "score": 35.5,
    "user_id": '$USER_ID'
  }')
echo "$SCAN_RESPONSE" | jq .
SCAN_ID_1=$(echo "$SCAN_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ Scan created with ID: $SCAN_ID_1${NC}"
echo ""

# Test 5: Submit another scan (Python)
echo -e "${BLUE}5. Submitting another scan (Python)...${NC}"
SCAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/scans" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import pickle; data = pickle.loads(user_data);",
    "language": "python",
    "vulnerabilities": [
      {"type": "pickle_deserialization", "severity": "high"},
      {"type": "unsafe_eval", "severity": "medium"}
    ],
    "score": 45.2,
    "user_id": '$USER_ID'
  }')
echo "$SCAN_RESPONSE" | jq .
SCAN_ID_2=$(echo "$SCAN_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ Scan created with ID: $SCAN_ID_2${NC}"
echo ""

# Test 6: Get all scans for user
echo -e "${BLUE}6. Getting all scans for user...${NC}"
curl -s -X GET "$BASE_URL/api/scans?user_id=$USER_ID" | jq .
echo ""

# Test 7: Get scan history
echo -e "${BLUE}7. Getting scan history...${NC}"
curl -s -X GET "$BASE_URL/api/scan-history/$USER_ID" | jq .
echo ""

# Test 8: Get daily statistics
echo -e "${BLUE}8. Getting daily statistics...${NC}"
curl -s -X GET "$BASE_URL/api/daily-stats/$USER_ID" | jq .
echo ""

# Test 9: Get database status
echo -e "${BLUE}9. Getting database status...${NC}"
curl -s -X GET "$BASE_URL/api/status" | jq .
echo ""

# Test 10: Run AI audit (if API key configured)
echo -e "${BLUE}10. Running AI code audit...${NC}"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function test() { var x = eval(input); }",
    "language": "javascript",
    "user_id": '$USER_ID'
  }' | jq .
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${GREEN}================================${NC}"
