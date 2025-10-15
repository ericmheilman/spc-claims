#!/usr/bin/env python3
"""
X (Twitter) API Test Script
Tests various API endpoints to verify credentials are working
"""

import requests
import json
import time
import hashlib
import hmac
import base64
from urllib.parse import quote, urlencode
import secrets

# Your X API credentials
API_KEY = "IFJyL366mkL2S3xvrJ1Jvfys6"
API_KEY_SECRET = "QjQucicduk1StkGTcvX7jLvoOE00AU42ZBQsVQs6xaj4ASdESG"
BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANV94QEAAAAAUTrJHstaefyqXYeQN3jIN7VmGRg%3DYzRfm3r2DE9BXvF7KDHEkbzeW9AbfTqIhHrHEOGCouIUjODsfE"
ACCESS_TOKEN = "1392551524916727811-Pqi9U1bRoHVn5LchgC9Wr8usDTGrYk"
ACCESS_TOKEN_SECRET = "FDVCcn37XcjFPAO27XRXQoK0vX39DisGGL2wCgcetEmfe"

def create_oauth_signature(method, url, params, consumer_secret, token_secret=""):
    """Create OAuth 1.0a signature"""
    sorted_params = urlencode(sorted(params.items()))
    signature_base_string = f"{method.upper()}&{quote(url, safe='')}&{quote(sorted_params, safe='')}"
    signing_key = f"{quote(consumer_secret, safe='')}&{quote(token_secret, safe='')}"
    
    signature = hmac.new(
        signing_key.encode('utf-8'),
        signature_base_string.encode('utf-8'),
        hashlib.sha1
    ).digest()
    
    return base64.b64encode(signature).decode('utf-8')

def generate_oauth_header(method, url, params):
    """Generate OAuth 1.0a authorization header"""
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(32)
    
    oauth_params = {
        'oauth_consumer_key': API_KEY,
        'oauth_token': ACCESS_TOKEN,
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': timestamp,
        'oauth_nonce': nonce,
        'oauth_version': '1.0'
    }
    
    all_params = {**params, **oauth_params}
    signature = create_oauth_signature(method, url, all_params, API_KEY_SECRET, ACCESS_TOKEN_SECRET)
    oauth_params['oauth_signature'] = signature
    
    header_params = ', '.join([f'{quote(k, safe="")}="{quote(v, safe="")}"' for k, v in sorted(oauth_params.items())])
    return f'OAuth {header_params}'

def test_bearer_token():
    """Test Bearer Token Authentication"""
    print("🧪 Test 1: Testing Bearer Token Authentication...")
    
    try:
        headers = {
            'Authorization': f'Bearer {BEARER_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get('https://api.twitter.com/2/users/by/username/twitter', headers=headers)
        
        if response.status_code == 200:
            print("✅ Bearer Token Test PASSED")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return True
        else:
            print(f"❌ Bearer Token Test FAILED - Status: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Bearer Token Test FAILED - Exception: {e}")
        return False

def test_oauth1_user_timeline():
    """Test OAuth 1.0a Authentication with user timeline"""
    print("\n🧪 Test 2: Testing OAuth 1.0a Authentication...")
    
    try:
        url = 'https://api.twitter.com/1.1/statuses/user_timeline.json'
        params = {'count': 5}
        
        headers = {
            'Authorization': generate_oauth_header('GET', url, params),
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code == 200:
            print("✅ OAuth 1.0a Test PASSED")
            data = response.json()
            print(f"Retrieved {len(data)} tweets from timeline")
            if data:
                print(f"Latest tweet: {data[0].get('text', 'No text')[:100]}...")
            return True
        else:
            print(f"❌ OAuth 1.0a Test FAILED - Status: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ OAuth 1.0a Test FAILED - Exception: {e}")
        return False

def test_post_tweet():
    """Test posting a tweet using OAuth 1.0a"""
    print("\n🧪 Test 3: Testing Tweet Posting...")
    
    try:
        url = 'https://api.twitter.com/1.1/statuses/update.json'
        tweet_text = f"🧪 Testing X API integration at {time.strftime('%Y-%m-%d %H:%M:%S')}"
        params = {'status': tweet_text}
        
        headers = {
            'Authorization': generate_oauth_header('POST', url, params),
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        response = requests.post(url, data=params, headers=headers)
        
        if response.status_code == 200:
            print("✅ Tweet Posting Test PASSED")
            data = response.json()
            print(f"Tweet posted: {data.get('text', 'No text')}")
            print(f"Tweet ID: {data.get('id_str', 'No ID')}")
            return True
        else:
            print(f"❌ Tweet Posting Test FAILED - Status: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Tweet Posting Test FAILED - Exception: {e}")
        return False

def test_user_info():
    """Test getting user information"""
    print("\n🧪 Test 4: Testing User Info Retrieval...")
    
    try:
        url = 'https://api.twitter.com/1.1/account/verify_credentials.json'
        
        headers = {
            'Authorization': generate_oauth_header('GET', url, {}),
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            print("✅ User Info Test PASSED")
            data = response.json()
            print(f"User: {data.get('name', 'No name')}")
            print(f"Username: @{data.get('screen_name', 'No username')}")
            print(f"Followers: {data.get('followers_count', 0)}")
            print(f"Following: {data.get('friends_count', 0)}")
            return True
        else:
            print(f"❌ User Info Test FAILED - Status: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ User Info Test FAILED - Exception: {e}")
        return False

def test_search_tweets():
    """Test searching tweets using Bearer Token"""
    print("\n🧪 Test 5: Testing Tweet Search...")
    
    try:
        headers = {
            'Authorization': f'Bearer {BEARER_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        params = {
            'query': 'python programming',
            'max_results': 10,
            'tweet.fields': 'created_at,author_id'
        }
        
        response = requests.get('https://api.twitter.com/2/tweets/search/recent', 
                              params=params, headers=headers)
        
        if response.status_code == 200:
            print("✅ Tweet Search Test PASSED")
            data = response.json()
            print(f"Found {len(data.get('data', []))} tweets")
            return True
        else:
            print(f"❌ Tweet Search Test FAILED - Status: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Tweet Search Test FAILED - Exception: {e}")
        return False

def main():
    """Run all API tests"""
    print("🚀 Starting X API Tests...\n")
    
    results = {
        'bearer_token': test_bearer_token(),
        'oauth1_timeline': test_oauth1_user_timeline(),
        'post_tweet': test_post_tweet(),
        'user_info': test_user_info(),
        'search_tweets': test_search_tweets()
    }
    
    print("\n📊 Test Results Summary:")
    print("=========================")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    passed_tests = sum(results.values())
    total_tests = len(results)
    
    print(f"\n🎯 Overall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Your X API credentials are working correctly.")
    elif passed_tests > 0:
        print("⚠️  Some tests passed. Your credentials are partially working.")
    else:
        print("❌ All tests failed. Please check your credentials and permissions.")

if __name__ == "__main__":
    main()












