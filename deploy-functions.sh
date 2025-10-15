#!/bin/bash
# Quick deployment script for prayer reminders function

set -e  # Exit on error

echo "🚀 Deploying Prayer Reminders Function"
echo "========================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not installed"
    echo ""
    echo "Install with:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if linked to project
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Not linked to a Supabase project"
    echo ""
    read -p "Enter your Supabase project ref: " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project ref is required"
        exit 1
    fi
    
    echo ""
    echo "Linking to project..."
    supabase link --project-ref "$PROJECT_REF"
    echo ""
fi

echo "📦 Deploying send-prayer-reminders function..."
echo ""

supabase functions deploy send-prayer-reminders

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Function deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Apply database migration: APPLY_REMINDER_MIGRATION.sql"
    echo "  2. Configure reminder interval in Admin Settings"
    echo "  3. Test with 'Send Reminders Now' button"
    echo ""
    
    # Ask if user wants to deploy other functions too
    read -p "Deploy other functions too? (auto-transition-prayers) [y/N]: " DEPLOY_ALL
    
    if [[ $DEPLOY_ALL =~ ^[Yy]$ ]]; then
        echo ""
        echo "📦 Deploying auto-transition-prayers function..."
        supabase functions deploy auto-transition-prayers
        echo ""
        echo "✅ All functions deployed!"
    fi
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Common issues:"
    echo "  - Not logged in: Run 'supabase login'"
    echo "  - Wrong project: Check your project ref"
    echo "  - Network issues: Check your internet connection"
    echo ""
    exit 1
fi
