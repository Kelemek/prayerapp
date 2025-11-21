# Features Guide

Complete guide to all Prayer App features and how to use them.

---

## Table of Contents

- [Core Features](#core-features)
  - [Prayer Request Management](#1-prayer-request-management)
  - [Prayer Updates](#2-prayer-updates)
  - [Prayer Interactions](#3-prayer-interactions)
  - [Prayer Prompts](#4-prayer-prompts)
  - [Prayer Timer](#5-prayer-timer)
  - [Printable Prayer List](#6-printable-prayer-list)
  - [Email Notifications](#7-email-notification-preferences)
  - [Theme Settings](#8-theme-settings)
  - [Realtime Updates](#9-realtime-updates)
- [Admin Features](#admin-features)
- [User Interface](#user-interface-features)
- [Advanced Features](#advanced-features)
- [Tips & Best Practices](#tips--best-practices)

---

## Core Features

### 1. Prayer Request Management

#### Submit Prayer Request

**From Main Page**:
1. Click "Submit Prayer Request" button
2. Fill in the form:
   - **First Name** (required) - Stored in localStorage for next time
   - **Last Name** (required) - Stored in localStorage for next time
   - **Email** (required) - Stored in localStorage for next time
     - *Planning Center integration*: If enabled, typing an email will auto-lookup name
   - **Prayer For** (required) - Brief title/subject
   - **Prayer Request Details** (required) - Full description
   - **Submit Anonymously** (optional) - Hides your name from public view
3. Click "Submit Prayer Request"
4. Request goes to admin for approval

**localStorage Benefits**:
- Your name and email are automatically saved
- Pre-fills forms for faster submissions
- Persists across browser sessions
- Privacy-focused (stored only in your browser)

#### View Prayers

- **Current Tab**: Active prayer requests
- **Ongoing**: Long-term prayers
- **Answered**: Prayers that have been answered
- **Closed**: Archived prayers
- **Prompts**: Inspirational prayer prompts (admin-created)

#### Filter & Search Prayers

- **Search**: Keywords in title or description
- **Status Filter**: Current/Answered/Archived/Prompts
- **Personal Filter**: Filter by your email to see only your prayers
- **Real-time Updates**: List updates automatically as prayers are approved

### 2. Prayer Updates

#### Add an Update

1. Click "Add Update" on any prayer card
2. Fill in:
   - First Name / Last Name (pre-filled from localStorage)
   - Email (pre-filled from localStorage)
   - Update content
   - Anonymous option
3. Click "Submit Update"
4. Goes to admin for approval

#### View Updates

- Click "Updates" button on prayer card
- See chronological list of approved updates
- Each update shows:
  - Author name (or "Anonymous")
  - Date posted
  - Update content
- Updates appear in real-time when approved

#### Delete Your Update

**For update authors**:
1. Open prayer updates
2. Click "Delete" on your update
3. Provide reason for deletion request
4. Submit for admin approval
5. Receive email notification of admin decision

### 3. Prayer Interactions

#### Request Status Change

**For prayer requesters who want to update status**:
1. Click "Request Status Change" on the prayer card
2. Select new status (Current/Ongoing/Answered/Closed)
3. Provide reason for change
4. Submit for admin approval
5. Receive email notification when approved/denied

**Use cases**:
- Mark prayer as "Answered" when God answers
- Move to "Ongoing" for long-term needs
- Close completed prayer requests

#### Request Deletion

**For prayer requesters**:
1. Click "Request Deletion" on prayer card
2. Enter your name, email, and reason
3. Submit for admin approval
4. Prayer removed if approved
5. Notification sent with admin decision

**Privacy**: Admins can review request before permanent deletion.

### 4. Prayer Prompts

**Inspirational prayer starters created by admins**

#### View Prompts

1. Click "Prompts" filter button (yellow, left-most)
2. Browse prayer prompts by type:
   - Healing
   - Guidance
   - Thanksgiving
   - Protection
   - Family
   - Finances
   - Salvation
   - Missions
   - Other

#### Prompt Features

- **Lightbulb Icon**: Easy visual identification
- **Type Badge**: Categorizes each prompt
- **Description**: Full prayer text or guidance
- **No Updates**: Prompts are standalone (not prayer requests)
- **Admin Managed**: Only admins can add/remove

**Use cases**:
- Daily prayer inspiration
- Guided prayer topics
- Seasonal prayer themes
- Scripture-based prompts

### 5. Prayer Timer

**Focus your prayer time**

#### Using the Timer

1. Click Settings icon (top right)
2. Click "Prayer Timer" tab
3. Set minutes (default: 5, range: 1-60)
4. Click "Start Timer"
5. Timer counts down
6. Sound plays when time is up
7. Click "Reset" to start over

**Tip**: Use while viewing prayer list to ensure focused prayer time for each request.

### 6. Printable Prayer List

**Create a physical prayer list for offline prayer**

#### Generate Print List

1. Click Settings icon
2. Click "Prayer Timer" tab
3. Scroll to "Printable Prayer List"
4. Choose time range:
   - **Past Week** - Last 7 days
   - **Past Month** - Last 30 days
   - **Past Year** - Last 365 days
5. Click button to generate
6. Print dialog opens automatically

#### Print Output Includes

- Prayer title and description
- Date requested
- Requester name (unless anonymous)
- All approved updates with dates
- Clean formatting for easy reading
- Page breaks between prayers

**Use cases**:
- Church prayer meetings
- Small group gatherings
- Personal prayer journals
- Offline prayer times

### 7. Email Notification Preferences

**Manage your email subscriptions**

#### Subscribe/Unsubscribe

1. Click Settings icon (top right)
2. Enter your name and email
3. Check/uncheck "Receive email notifications for new prayers"
4. Click "Save Preferences"
5. **Admin must approve** your preference change
6. You'll receive confirmation email once approved/denied

#### What You Receive

When subscribed, you receive emails for:
- ✅ **New Prayers**: When prayers are approved by admins
- ✅ **Prayer Updates**: Updates on prayers you've interacted with
- ✅ **Status Changes**: When prayer status changes
- ✅ **Prayer Reminders**: Periodic reminders about prayers without recent updates
- ✅ **Approval Decisions**: When your submitted prayers/updates are approved/denied

#### Email Settings

- **From Address**: Configured by admin (typically church email)
- **Reply-To**: Emails sent from app include reply-to address for responses
- **Bulk Sending**: Automatically batched (30/minute for Microsoft 365)
- **Privacy**: Email list only visible to admins

**Opt-out anytime**: Uncheck the box and save - no questions asked!

### 8. Theme Settings

**Choose your display theme**

#### Available Themes

1. Click Settings icon (top right)
2. Select theme:
   - **Light** - Bright background, dark text
   - **Dark** - Dark background, light text (easier on eyes)
   - **System** - Automatically matches your device preference

#### Theme Persistence

- Saved to localStorage
- Persists across browser sessions
- Independent of user account (browser-based)
- Changes apply immediately

### 9. Realtime Updates

**Automatic updates without refreshing**

#### Real-time Features

- ✅ New prayers appear automatically when approved
- ✅ Updates show up instantly when added
- ✅ Status changes reflect immediately
- ✅ Deletions remove prayers in real-time
- ✅ Live status indicator shows connection status
- ✅ Updates synchronized across all open browsers/devices

#### Connection Status

- **🔴 Red Dot**: Live updates active
- Powered by Supabase Realtime subscriptions
- Automatic reconnection if connection drops
- No manual refresh needed

---

## Admin Features

**Access**: Settings → Admin Login (password required)

### 1. Prayer Approval

**Approve/Deny Prayer Requests**

1. Go to Admin Portal → Prayers tab
2. Review pending requests with full details
3. **Approve**: Prayer becomes public immediately
4. **Deny**: Provide reason, requester notified via email

**Batch Actions**:
- **Approve All**: Approves all pending prayers at once
- **Next Prayer**: Keyboard shortcut (N key) for quick review
- **Email on Denial**: Sends notification to requester

### 2. Update Approval

**Review Prayer Updates**

1. Go to Updates tab
2. Review pending updates
3. See update content, author, and prayer context
4. Approve or deny with reason
5. Approved updates appear on prayer card immediately
6. Denial reason sent via email

### 3. Deletion Request Management

**Handle Deletion Requests**

1. Go to Deletions tab
2. Review two types:
   - **Prayer Deletions**: Complete prayer removal
   - **Update Deletions**: Single update removal
3. See requester info and reason
4. Approve or deny
5. Optional email notification on denial

**Security**: Prevents accidental or malicious deletions

### 4. Status Change Request Approval

**Approve Status Changes**

1. Go to Status Changes tab
2. Review requests showing:
   - Current status → Requested status
   - Reason for change
   - Requester information
3. Approve or deny
4. Prayer status updates automatically if approved
5. Requester notified via email

### 5. Email Preference Management

**Approve Subscriber Changes**

1. Go to Preferences tab
2. See pending preference changes:
   - New subscriptions
   - Unsubscribe requests
3. Approve: User added/removed from email list
4. Deny: Preference not changed, user notified

**Why approval required?**
- Prevents spam/fake email addresses
- Maintains clean subscriber list
- Ensures valid recipients

### 6. Email Subscriber Management

**Manage Email List**

#### Add Subscribers

1. Go to Email Settings tab
2. Click "Add Subscriber"
3. Enter email, name, and settings:
   - **Active**: Currently subscribed
   - **Admin**: Receives admin notifications
4. Save to add immediately (no approval needed)

#### Manage Existing

- Toggle subscribers active/inactive
- Mark as admin (for admin-only notifications)
- Search subscribers by email or name
- View subscription status at a glance

**Admin vs Regular Subscribers**:
- **Admin**: Gets approval notifications, admin invite emails, all updates
- **Regular**: Gets new prayer notifications and general updates only

### 7. Prayer Prompt Management

**Create Inspirational Prompts**

Located in Settings tab:

#### Add Single Prompt

1. Enter title (required)
2. Select type from dropdown
3. Write description/prayer text
4. Click "Add Prompt"
5. Appears immediately in Prompts view

#### CSV Bulk Import

1. Click "Download CSV Template" for format
2. Fill CSV with:
   ```csv
   Title,Type,Description
   "Pray for healing","Healing","Lord, we lift up..."
   "Pray for guidance","Guidance","Father, guide us..."
   ```
3. Upload CSV file
4. Click "Import Prompts"
5. All valid prompts added at once

#### Delete Prompts

- Click delete icon on any prompt card (admin-only)
- Immediate deletion (no undo)
- Prompts removed from user view instantly

### 8. Admin Settings Configuration

**Configure System Settings**

1. Go to Admin Settings tab
2. Configure:

#### Admin Password
- Set/change admin portal access password
- Applies immediately
- All admins use same password

#### Notification Emails
- Comma-separated list of admin emails
- Receives approval notifications
- Gets system alerts and updates

#### Prayer Reminders
- **Interval**: Days before sending reminders (default: 7)
- **Threshold**: Only send if no updates in X days
- **Manual Trigger**: "Send Reminders Now" button
- Sends emails to prayer requesters with stale prayers
- **Auto-Archive**: After reminder threshold, prayers can be automatically archived

#### Analytics View
- Today's page views
- This week's views
- This month's views
- All-time views
- Updated in real-time

---

## User Interface Features

### Navigation

- **Prayer List**: Main view with status tabs
- **Filter Buttons**: Current, Ongoing, Answered, Closed, Prompts
- **Settings Icon**: Top right (⚙️)
- **Admin Login**: Settings → Admin Login
- **Responsive**: Works on mobile, tablet, desktop

### Prayer Cards

Each prayer card displays:
- 📝 **Title**: Prayer subject
- 📄 **Description**: Full prayer request
- 👤 **Requester**: Name or "Anonymous"
- 📅 **Date**: When requested
- 🔖 **Status**: Current/Ongoing/Answered/Closed
- 📊 **Updates**: Count of approved updates
- ⚡ **Actions**: Status change, delete, add update

### Prompt Cards

Inspirational prompt cards show:
- 💡 **Lightbulb Icon**: Visual indicator
- 🏷️ **Type Badge**: Category (Healing, Guidance, etc.)
- 📝 **Title**: Prompt title
- 📄 **Description**: Prayer text/guidance
- 🗑️ **Delete** (admin only)

### Responsive Design

- ✅ **Mobile-Friendly**: Touch-optimized interface
- ✅ **Tablet-Optimized**: Efficient use of screen space
- ✅ **Desktop Full-Featured**: All features accessible
- ✅ **Touch and Keyboard**: Multiple input methods

### Accessibility

- ✅ Keyboard navigation support
- ✅ Clear focus indicators
- ✅ Semantic HTML structure
- ✅ Screen reader compatible
- ✅ High contrast themes available

---

## Advanced Features

### localStorage Persistence

**Automatically Saved**:
- First name
- Last name
- Email address
- Theme preference
- Anonymous submission preference

**Benefits**:
- No need to re-enter information
- Faster prayer submissions
- Seamless experience across sessions
- Privacy-focused (browser-only, not server)
- Clears on browser data clear

### Approval Workflow

**All user actions require admin approval**:

1. **User submits** (prayer/update/deletion/status change/preference)
2. **Admin reviews** in portal with full context
3. **Admin decides** (approve or deny with reason)
4. **User notified** via email (if email provided)
5. **Action takes effect** (if approved)

**Why approval system?**
- ✅ Prevents spam and inappropriate content
- ✅ Maintains quality of prayer requests
- ✅ Allows content moderation
- ✅ Email notifications on all decisions
- ✅ Protects community standards

### Anonymous Submissions

**Privacy Options**:
- Submit prayers anonymously
- Add updates anonymously
- Name hidden from public view
- Admin can still see for moderation
- Email still captured for notifications

**Use Cases**:
- Sensitive prayer requests
- Privacy concerns
- Confidential situations
- Personal struggles

### Planning Center Integration

**Automatic Name Lookup**:
- Type email in prayer form
- System searches Planning Center database
- Auto-fills first/last name if found
- Saves time for church members
- Falls back to manual entry if not found

**Setup Required**:
- Admin configures Planning Center API credentials
- See [SETUP_GUIDE.md](SETUP_GUIDE.md) for instructions

### Browser-Independent Seed Data

**Demo/Testing Mode**:
- Sample prayers available without database
- Useful for demonstrations
- Testing UI changes
- Offline development

---

## Tips & Best Practices

### For Prayer Requesters

- ✅ **Be Specific**: Provide clear, concise prayer requests
- ✅ **Update Status**: Mark prayers as answered when God answers
- ✅ **Add Updates**: Keep community informed of progress
- ✅ **Use Anonymous**: For sensitive or personal requests
- ✅ **Check Email**: Notifications about approval status
- ✅ **Save Contact Info**: Let localStorage remember your details

### For Admins

- ✅ **Review Promptly**: Check admin portal regularly
- ✅ **Use Shortcuts**: Press "N" for next prayer
- ✅ **Clear Denials**: Provide helpful rejection reasons
- ✅ **Maintain Email List**: Keep subscribers current
- ✅ **Monitor Reminders**: Adjust interval based on activity
- ✅ **Create Prompts**: Add inspirational content regularly
- ✅ **Check Analytics**: Monitor app usage in Settings tab
- ✅ **Test Features**: Use "Run Now" buttons to verify automation

### For All Users

- ✅ **Check Notifications**: Review email updates regularly
- ✅ **Respect Privacy**: Honor anonymous requests
- ✅ **Update Preferences**: Keep email settings current
- ✅ **Use Print Feature**: Create offline prayer lists
- ✅ **Try Prayer Timer**: Focus prayer time
- ✅ **Explore Prompts**: Use admin-created prayer starters

---

## Keyboard Shortcuts

### Admin Portal

- **N** - Next prayer (when reviewing)
- **Escape** - Close modals/dialogs
- **Tab** - Navigate between form fields
- **Enter** - Submit forms/approve items

### General

- **Ctrl/Cmd + P** - Print (when print dialog open)
- **Escape** - Close Settings modal
- **Tab** - Navigate interface

---

## Coming Soon

Features planned for future releases:

- 📊 Prayer statistics dashboard
- 📱 Mobile app (iOS/Android)
- 👥 Prayer partner matching
- 🎯 Prayer categories/tags
- 📅 Group prayer sessions
- 📈 Extended analytics
- 🔔 Browser push notifications
- 🌐 Multi-language support

---

**Questions?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.
**Setup Help?** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for installation instructions.
**Email Issues?** See [EMAIL_GUIDE.md](EMAIL_GUIDE.md) for email configuration.
3. Approve: User added/removed from email list
4. Deny: Preference not changed, user notified

### 6. Email Subscriber Management

**Manage email subscribers**:
1. Go to Email Settings tab
2. Add new subscribers (manual)
3. Toggle subscribers active/inactive
4. Mark admins (receive admin notifications)
5. Search subscribers by email

**Admin vs Regular Subscribers**:
- **Admin**: Gets approval notifications, admin emails
- **Regular**: Gets new prayer notifications only

### 7. Admin Settings Configuration

**Configure system settings**:
1. Go to Admin Settings tab
2. Configure:
   - **Admin Password**: Set/change admin access password
   - **Notification Emails**: Admin email addresses (comma-separated)
   - **Reminder Interval**: Days before sending prayer reminders
   - **Auto-Archive**: Automatically archive prayers after reminders

**Prayer Reminders**:
- "Send Reminders Now" button
- Sends emails to prayer requesters with no updates
- Configurable threshold (default: 7 days)

**Auto-Archive**:
- Automatically archives prayers after reminder threshold
- Only archives prayers with no recent updates
- Configurable days before archive (default: 7 days after reminder)

## User Interface Features

### Navigation

- **Prayer List**: Main view with tabs (Current/Ongoing/Answered/Closed)
- **Settings**: Top right icon
- **Admin**: Settings → Admin Login

### Prayer Cards

Each prayer card shows:
- 📝 Prayer title and description
- 👤 Requester (or "Anonymous")
- 📅 Date requested
- 🔖 Current status
- 📊 Number of updates
- ⚡ Action buttons

### Responsive Design

- ✅ Mobile-friendly
- ✅ Tablet optimized
- ✅ Desktop full-featured
- ✅ Touch and keyboard navigation

### Accessibility

- ✅ Keyboard navigation support
- ✅ Clear focus indicators
- ✅ Semantic HTML
- ✅ Screen reader compatible

## Advanced Features

### localStorage Persistence

**Automatically saved**:
- First name
- Last name
- Email address
- Theme preference

**Benefits**:
- No need to re-enter information
- Faster prayer submissions
- Seamless experience across sessions

### Approval Workflow

**All user actions require admin approval**:
1. User submits (prayer/update/deletion/status change)
2. Admin reviews in portal
3. Admin approves or denies
4. User notified via email (if email provided)
5. Action takes effect (if approved)

**Why approval system?**:
- ✅ Prevents spam and inappropriate content
- ✅ Maintains quality of prayer requests
- ✅ Allows moderation
- ✅ Email notifications on decisions

### Anonymous Submissions

**Privacy options**:
- Submit prayers anonymously
- Add updates anonymously
- Your name hidden from public view
- Admin can still see for moderation

**Use cases**:
- Sensitive prayer requests
- Privacy concerns
- Confidential situations

## Tips & Best Practices

### For Prayer Requesters

- ✅ Be specific but concise in requests
- ✅ Update status when prayers are answered
- ✅ Add updates to keep people informed
- ✅ Use anonymous mode for sensitive requests

### For Admins

- ✅ Review submissions promptly
- ✅ Use keyboard shortcuts (N for next)
- ✅ Provide clear denial reasons
- ✅ Keep admin email list updated
- ✅ Monitor reminder intervals

### For All Users

- ✅ Check notifications regularly
- ✅ Respect privacy of anonymous requests
- ✅ Keep email preferences updated
- ✅ Use print feature for offline prayer

## Keyboard Shortcuts

### Admin Portal

- **N** - Next prayer (when reviewing)
- **Escape** - Close modals
- **Tab** - Navigate between fields

### General

- **Ctrl/Cmd + P** - Print (when print dialog open)
- **Escape** - Close Settings modal

## Coming Soon

Features planned for future releases:
- Prayer categories/tags
- Prayer partner matching
- Group prayer sessions
- Mobile app
- Prayer statistics dashboard

---

**Questions?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.
