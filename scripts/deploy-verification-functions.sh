#!/bin/bash

# Deploy Email Verification Edge Functions
# Run from project root: ./scripts/deploy-verification-functions.sh

set -e

echo "🚀 Deploying Email Verification Edge Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "📡 Checking Supabase connection..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Run: supabase login"
    exit 1
fi

echo "✅ Connected to Supabase"
echo ""

# Deploy send-verification-code
echo "📤 Deploying send-verification-code function..."
supabase functions deploy send-verification-code --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ send-verification-code deployed successfully"
else
    echo "❌ Failed to deploy send-verification-code"
    exit 1
fi
echo ""

# Deploy verify-code
echo "📤 Deploying verify-code function..."
supabase functions deploy verify-code --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ verify-code deployed successfully"
else
    echo "❌ Failed to deploy verify-code"
    exit 1
fi
echo ""

echo "🎉 All functions deployed successfully!"
echo ""
echo "⚙️  Next steps:"
echo "1. Set environment variables in Supabase Dashboard:"
echo "   - Go to Edge Functions → Configuration"
echo "   - Add these secrets:"
echo "     • RESEND_API_KEY=re_your_key_here"
echo "     • RESEND_FROM_EMAIL=noreply@yourdomain.com"
echo ""
echo "2. Test the functions:"
echo "   • Run: supabase functions logs send-verification-code --follow"
echo "   • Try submitting a form in your app"
echo ""
echo "3. Enable verification in admin settings:"
echo "   • Go to your app → Admin → Settings"
echo "   • Enable 'Email Verification Required'"
echo ""
