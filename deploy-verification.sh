#!/bin/bash

# Email Verification System - Quick Setup Script
# This script helps you deploy the email verification system

set -e  # Exit on error

echo "================================================"
echo "  Email Verification System - Quick Setup"
echo "================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Or follow: https://supabase.com/docs/guides/cli/getting-started"
    echo ""
    echo "⚠️  OR use the Supabase Dashboard method instead (see TROUBLESHOOTING.md)"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "Please log in first:"
    echo "  supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

echo "Step 1: Deploying Edge Functions..."
echo "-----------------------------------"

# Deploy send-verification-code
echo "📤 Deploying send-verification-code..."
if supabase functions deploy send-verification-code; then
    echo "✅ send-verification-code deployed"
else
    echo "❌ Failed to deploy send-verification-code"
    exit 1
fi

echo ""

# Deploy verify-code
echo "📤 Deploying verify-code..."
if supabase functions deploy verify-code; then
    echo "✅ verify-code deployed"
else
    echo "❌ Failed to deploy verify-code"
    exit 1
fi

echo ""
echo "Step 2: Setting up secrets..."
echo "-----------------------------------"

# Check if RESEND_API_KEY is set
if supabase secrets list | grep -q RESEND_API_KEY; then
    echo "✅ RESEND_API_KEY already set"
else
    echo "⚠️  RESEND_API_KEY not set"
    echo ""
    echo "You need to set your Resend API key:"
    echo "  supabase secrets set RESEND_API_KEY=re_your_key_here"
    echo ""
    echo "Get your API key from: https://resend.com/api-keys"
fi

echo ""
echo "Step 3: Database Migration"
echo "-----------------------------------"
echo ""
echo "⚠️  You need to apply the database migration manually"
echo ""
echo "Option 1: Supabase Dashboard (RECOMMENDED)"
echo "  1. Go to https://supabase.com/dashboard"
echo "  2. Select your project"
echo "  3. Click 'SQL Editor'"
echo "  4. Copy contents of: supabase/migrations/20251020_create_verification_codes.sql"
echo "  5. Paste and click 'Run'"
echo ""
echo "Option 2: Supabase CLI"
echo "  supabase db push"
echo ""

echo "================================================"
echo "  Next Steps"
echo "================================================"
echo ""
echo "1. ✅ Apply the database migration (see above)"
echo "2. ✅ Go to your app's Admin Portal"
echo "3. ✅ Click 'Email Settings' tab"
echo "4. ✅ Enable 'Require Email Verification (2FA)'"
echo "5. ✅ Configure code length and expiry time"
echo "6. ✅ Click 'Save Settings'"
echo "7. ✅ Test by submitting a prayer request"
echo ""
echo "For detailed troubleshooting, see:"
echo "  EMAIL_VERIFICATION_TROUBLESHOOTING.md"
echo ""
echo "================================================"
