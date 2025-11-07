# Prayer App Documentation

Complete documentation for the Church Prayer Management System built with React, TypeScript, Supabase, and Microsoft Graph API.

---

## � Quick Start

New to the Prayer App? Start here:

1. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup from scratch
2. **[FEATURES.md](FEATURES.md)** - Learn all features and how to use them
3. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to production

---

## 📚 Core Documentation

### Setup & Configuration

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup guide
  - Supabase configuration
  - Database migrations
  - Edge functions deployment
  - Microsoft 365 email setup
  - Planning Center integration
  - Analytics setup

### Features & Usage

- **[FEATURES.md](FEATURES.md)** - All app features
  - Prayer request management
  - Prayer prompts
  - Prayer timer & printable lists
  - Email notifications
  - Theme settings
  - Admin features
  - Real-time updates

### Email System

- **[EMAIL_GUIDE.md](EMAIL_GUIDE.md)** - Email system guide
  - Microsoft Graph API setup
  - Email subscriber management
  - Automated prayer reminders
  - Email templates
  - Bulk sending & rate limits
  - Troubleshooting email issues

### Database

- **[DATABASE.md](DATABASE.md)** - Database guide
  - Schema overview
  - Table relationships
  - Row Level Security (RLS)
  - Migrations
  - Data management

### Deployment

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide
  - Edge functions deployment
  - Environment variables
  - Production checklist
  - Vercel/Netlify deployment

### Testing

- **[TESTING.md](TESTING.md)** - Testing guide
  - Running tests
  - Smoke tests
  - Verification testing
  - Real-time feature testing

### Troubleshooting

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues
  - Connection errors
  - Email problems
  - Edge function debugging
  - Netlify issues
  - GitHub secrets
  - Linter configuration

---

## 🔧 Technical Reference

### Configuration

- **[CONFIGURABLE_CODE_LENGTH.md](CONFIGURABLE_CODE_LENGTH.md)** - Verification code settings
- **[CONFIGURABLE_VERIFICATION_SETTINGS.md](CONFIGURABLE_VERIFICATION_SETTINGS.md)** - Verification configuration
- **[USER_INFO_LOCALSTORAGE.md](USER_INFO_LOCALSTORAGE.md)** - localStorage implementation

### Admin Documentation

- **[ADMIN_USER_MANAGEMENT.md](ADMIN_USER_MANAGEMENT.md)** - User management
- **[ADMIN_USER_MANAGEMENT_SETUP.md](ADMIN_USER_MANAGEMENT_SETUP.md)** - Setup guide
- **[ADMIN_SESSION_IMPLEMENTATION.md](ADMIN_SESSION_IMPLEMENTATION.md)** - Session management
- **[ADMIN_SESSION_SECURITY.md](ADMIN_SESSION_SECURITY.md)** - Security guide
- **[ADMIN_SETTINGS_TEST_PLAN.md](ADMIN_SETTINGS_TEST_PLAN.md)** - Testing plan
- **[ADMIN_EMAIL_CLEANUP.md](ADMIN_EMAIL_CLEANUP.md)** - Email notifications

---

## � Archive

### Migrations (Historical)

Completed migrations and implementation docs:

- **[archive/migrations/](archive/migrations/)** - Completed migrations
  - Graph API migration
  - Table consolidation
  - M365 SMTP switch
  - Database migrations
  - Code cleanup summaries

### Implementation Archives

Historical implementation docs:

- **[archive/](archive/)** - Implementation history
  - Feature implementations
  - Debug procedures
  - Test procedures
  - Email system implementations

### Backup System

Backup feature documentation:

- **[backup/](backup/)** - Backup system docs
  - Backup setup
  - Restore procedures
  - Manual backup implementation

---

## 📦 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Email**: Microsoft Graph API / Microsoft 365 SMTP
- **Real-time**: Supabase Realtime
- **Hosting**: Vercel / Netlify
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library

---

## 📝 Recent Changes

See [DOCUMENTATION_CONSOLIDATION.md](DOCUMENTATION_CONSOLIDATION.md) for consolidation history.

**November 2025**:
- ✅ Consolidated documentation structure
- ✅ Created comprehensive setup guide
- ✅ Enhanced features documentation
- ✅ Unified email system guide
- ✅ Archived migration documentation
- ✅ Removed obsolete fix documentation

---

## 🔗 Quick Links

- [Main README](../README.md)
- [Archive (Old Docs)](archive/)
- [SQL Migrations](../supabase/migrations/)

---

**Last Updated**: November 2025  
**Documentation Version**: 2.0 (Consolidated)
- **Testing docs**: Vitest, React Testing Library, CI/CD workflows
- **Backup docs**: Complete backup system documentation in `backup/` subfolder
- **Historical docs**: Debugging guides and implementation notes archived in `archive/` folder
