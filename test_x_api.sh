#!/bin/bash

# X (Twitter) API Test Script using cURL
# Simple tests to verify your API credentials are working

echo "🚀 Starting X API Tests with cURL..."
echo ""

# Your credentials
BEARER_TOKEN="AAAAAAAAAAAAAAAAAAAAANV94QEAAAAAUTrJHstaefyqXYeQN3jIN7VmGRg%3DYzRfm3r2DE9BXvF7KDHEkbzeW9AbfTqIhHrHEOGCouIUjODsfE"

# Test 1: Bearer Token Authentication - Get user by username
echo "🧪 Test 1: Testing Bearer Token Authentication..."
echo "Getting @twitter user info..."

response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.twitter.com/2/users/by/username/twitter")

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo "✅ Bearer Token Test PASSED"
    echo "Response: $response_body"
else
    echo "❌ Bearer Token Test FAILED - HTTP Code: $http_code"
    echo "Error: $response_body"
fi

echo ""

# Test 2: Bearer Token Authentication - Search recent tweets
echo "🧪 Test 2: Testing Tweet Search..."
echo "Searching for recent tweets about 'python'..."

search_response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.twitter.com/2/tweets/search/recent?query=python&max_results=5")

search_http_code=$(echo "$search_response" | tail -n1)
search_response_body=$(echo "$search_response" | head -n -1)

if [ "$search_http_code" = "200" ]; then
    echo "✅ Tweet Search Test PASSED"
    echo "Response: $search_response_body"
else
    echo "❌ Tweet Search Test FAILED - HTTP Code: $search_http_code"
    echo "Error: $search_response_body"
fi

echo ""

# Test 3: Get user's own profile (requires OAuth 1.0a - more complex)
echo "🧪 Test 3: Testing OAuth 1.0a Authentication..."
echo "Note: OAuth 1.0a requires more complex signature generation."
echo "For full OAuth 1.0a testing, use the Python or Node.js scripts."
echo ""

# Summary
echo "📊 Test Results Summary:"
echo "========================"
if [ "$http_code" = "200" ]; then
    echo "Bearer Token Auth: ✅ PASS"
else
    echo "Bearer Token Auth: ❌ FAIL"
fi

if [ "$search_http_code" = "200" ]; then
    echo "Tweet Search: ✅ PASS"
else
    echo "Tweet Search: ❌ FAIL"
fi

echo ""
echo "💡 For complete testing including posting tweets and OAuth 1.0a,"
echo "   run the Python script: python3 test_x_api.py"
echo "   or the Node.js script: node test-x-api.js"













