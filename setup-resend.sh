#!/bin/bash

# Resend Email Setup Script
# This script helps you set up email notifications with Resend

echo "🚀 Resend Email Setup"
echo "===================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Please install it first:"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Prompt for Resend API key
read -p "Enter your Resend API Key (starts with re_): " RESEND_KEY

if [[ ! $RESEND_KEY =~ ^re_ ]]; then
    echo "❌ Invalid API key format. Should start with 're_'"
    exit 1
fi

echo ""
echo "📝 Setting Supabase secret..."

# Set the secret
supabase secrets set RESEND_API_KEY="$RESEND_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Secret set successfully"
else
    echo "❌ Failed to set secret"
    echo "You may need to run: supabase login"
    echo "Or: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo ""
echo "📦 Deploying Edge Function..."

# Deploy the function
supabase functions deploy send-notification

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Failed to deploy function"
    exit 1
fi

echo ""
echo "🗄️  Applying database migration..."

# Apply migration
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migration applied"
else
    echo "⚠️  Database migration may have failed"
    echo "You can manually run it in the Supabase SQL Editor"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to your app and login as admin"
echo "2. Navigate to Admin Portal → Settings"
echo "3. Add admin email addresses"
echo "4. Test by submitting a prayer request"
echo ""
echo "📖 For more details, see RESEND_SETUP.md"
