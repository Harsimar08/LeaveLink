"""
Test script to verify Google OAuth configuration
Run: python test_oauth_setup.py
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_oauth_setup():
    """Check if OAuth is properly configured"""
    
    print("\n" + "="*80)
    print(" "*25 + "🔍 Google OAuth Configuration Check")
    print("="*80 + "\n")
    
    checks_passed = 0
    checks_failed = 0
    
    # Check 1: Google Client ID
    print("1. Checking GOOGLE_CLIENT_ID...")
    google_client_id = os.getenv('GOOGLE_CLIENT_ID')
    if google_client_id and google_client_id != 'your-google-client-id':
        print(f"   ✅ FOUND: {google_client_id[:20]}...{google_client_id[-10:]}")
        checks_passed += 1
    else:
        print(f"   ❌ NOT CONFIGURED: {google_client_id}")
        print("      Please set GOOGLE_CLIENT_ID in .env file")
        checks_failed += 1
    
    # Check 2: Google Client Secret
    print("\n2. Checking GOOGLE_CLIENT_SECRET...")
    google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    if google_client_secret and google_client_secret != 'your-google-client-secret':
        print(f"   ✅ FOUND: {google_client_secret[:10]}...{google_client_secret[-5:]}")
        checks_passed += 1
    else:
        print(f"   ❌ NOT CONFIGURED: {google_client_secret}")
        print("      Please set GOOGLE_CLIENT_SECRET in .env file")
        checks_failed += 1
    
    # Check 3: Frontend URL
    print("\n3. Checking FRONTEND_URL...")
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    print(f"   ✅ Frontend URL: {frontend_url}")
    checks_passed += 1
    
    # Check 4: Secret Key
    print("\n4. Checking SECRET_KEY...")
    secret_key = os.getenv('SECRET_KEY')
    if secret_key and len(secret_key) > 10:
        print(f"   ✅ SECRET_KEY is set (length: {len(secret_key)})")
        checks_passed += 1
    else:
        print(f"   ⚠️  WARNING: SECRET_KEY is weak or not set")
        print("      Recommended: Change it in production")
        checks_failed += 1
    
    # Check 5: Required packages
    print("\n5. Checking required Python packages...")
    try:
        import authlib
        print(f"   ✅ Authlib: {authlib.__version__}")
        checks_passed += 1
    except ImportError:
        print("   ❌ Authlib not installed")
        print("      Run: pip install Authlib")
        checks_failed += 1
    
    try:
        import requests
        print(f"   ✅ Requests: {requests.__version__}")
        checks_passed += 1
    except ImportError:
        print("   ❌ Requests not installed")
        print("      Run: pip install requests")
        checks_failed += 1
    
    # Check 6: Flask app configuration
    print("\n6. Checking Flask app imports...")
    try:
        from app import app
        print("   ✅ Flask app imports successfully")
        checks_passed += 1
    except ImportError as e:
        print(f"   ❌ Failed to import Flask app: {e}")
        checks_failed += 1
    
    # Check 7: OAuth routes
    print("\n7. Checking OAuth routes...")
    try:
        from routes.oauth import oauth_bp
        print("   ✅ OAuth blueprint imported successfully")
        checks_passed += 1
    except ImportError as e:
        print(f"   ❌ Failed to import OAuth routes: {e}")
        checks_failed += 1
    
    # Check 8: User model has google_id field
    print("\n8. Checking User model for google_id field...")
    try:
        from models.user import User
        if hasattr(User, 'google_id'):
            print("   ✅ User model has google_id field")
            checks_passed += 1
        else:
            print("   ❌ User model missing google_id field")
            checks_failed += 1
    except Exception as e:
        print(f"   ❌ Error checking User model: {e}")
        checks_failed += 1
    
    # Summary
    print("\n" + "="*80)
    print(f"📊 Results: {checks_passed} passed, {checks_failed} failed")
    print("="*80 + "\n")
    
    if checks_failed == 0:
        print("🎉 All checks passed! Google OAuth is properly configured.")
        print("\n📝 Next steps:")
        print("   1. Make sure MySQL server is running")
        print("   2. Start Flask backend: python app.py")
        print("   3. Start React frontend: npm run dev")
        print("   4. Test Google login at: http://localhost:5173/login")
        print()
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        print("\n📚 For setup instructions, see: GOOGLE_OAUTH_SETUP.md")
        print()
    
    # OAuth endpoints info
    print("="*80)
    print("🔗 OAuth Endpoints:")
    print("="*80)
    print("   Login: GET /api/auth/google")
    print("   Callback: GET /api/auth/google/callback")
    print("   Complete Signup: POST /api/auth/google/signup")
    print()
    print("   Full URL examples:")
    print("   - http://localhost:5000/api/auth/google")
    print("   - http://localhost:5000/api/auth/google/callback")
    print("="*80 + "\n")

if __name__ == '__main__':
    check_oauth_setup()
