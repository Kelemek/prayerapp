# Features Guide

Complete guide to all Prayer App features and how to use them.

## Core Features

### 1. Prayer Request Management

#### Submit Prayer Request

**From Main Page**:
1. Click "Submit Prayer Request" button
2. Fill in the form:
   - **First Name** (required) - Stored in localStorage for next time
   - **Last Name** (required) - Stored in localStorage for next time
   - **Email** (required) - Stored in localStorage for next time
   - **Prayer For** (required) - Brief title/subject
   - **Prayer Request Details** (required) - Full description
   - **Submit Anonymously** (optional) - Hides your name from public view
3. Click "Submit Prayer Request"
4. Request goes to admin for approval

**localStorage**: Your name and email are automatically saved and will pre-fill next time!

#### View Prayers

- **Current Tab**: Active prayer requests
- **Ongoing**: Long-term prayers
- **Answered**: Prayers that have been answered
- **Closed**: Archived prayers

#### Filter Prayers

- Search by keywords in title or description
- Filter by status (Current/Ongoing/Answered/Closed)
- Filter by your email to see only your prayers

### 2. Prayer Updates

**Add an Update**:
1. Click "Add Update" on any prayer card
2. Fill in:
   - First Name / Last Name (pre-filled from localStorage)
   - Email (pre-filled from localStorage)
   - Update content
   - Anonymous option
3. Click "Submit Update"
4. Goes to admin for approval

**View Updates**:
- Click "Updates" button on prayer card
- See chronological list of approved updates
- Each shows author, date, and content

### 3. Prayer Interactions

#### Request Status Change

**For prayer requesters who want to update status**:
1. Click "Request Status Change" on the prayer card
2. Select new status (Current/Ongoing/Answered/Closed)
3. Provide reason for change
4. Submit for admin approval

#### Request Deletion

**For prayer requesters**:
1. Click "Request Deletion"
2. Enter your name, email, and reason
3. Submit for admin approval

#### Delete Own Update

**For update authors**:
1. Open prayer updates
2. Click "Delete" on your update
3. Provide reason
4. Submit for admin approval

### 4. Prayer Timer

**Focus your prayer time**:
1. Click Settings icon (top right)
2. Click "Prayer Timer" tab
3. Set minutes (default: 5)
4. Click "Start Timer"
5. Timer shows countdown
6. Sound plays when time is up

**Tip**: Use while viewing prayer list to ensure focused prayer time for each request.

### 5. Printable Prayer List

**Create a physical prayer list**:
1. Click Settings icon
2. Click "Prayer Timer" tab
3. Scroll to "Printable Prayer List"
4. Choose time range:
   - **Past Week** - Last 7 days
   - **Past Month** - Last 30 days
   - **Past Year** - Last 365 days
5. Click button to generate
6. Print dialog opens automatically

**Output includes**:
- Prayer title and description
- Date requested
- Requester name (unless anonymous)
- All approved updates
- Formatted for easy reading

### 6. Email Notification Preferences

**Manage your email subscriptions**:
1. Click Settings icon (top right)
2. Enter your name and email
3. Check/uncheck "Receive email notifications for new prayers"
4. Click "Save Preferences"
5. **Admin must approve** your preference change
6. You'll receive confirmation email once approved

**What you receive**:
- ✅ New prayer notifications (when prayers are approved)
- ✅ Updates on prayers you've interacted with
- ✅ Status change notifications

**Opt-out anytime**: Uncheck the box and save - no questions asked!

### 7. Theme Settings

**Choose your display theme**:
1. Click Settings icon (top right)
2. Select theme:
   - **Light** - Bright background
   - **Dark** - Dark background (easier on eyes)
   - **System** - Matches your device

Theme is saved to localStorage and persists across sessions.

### 8. Realtime Updates

**Automatic updates without refreshing**:
- ✅ New prayers appear automatically when approved
- ✅ Updates show up instantly when added
- ✅ Status changes reflect immediately
- ✅ Deletions remove prayers in real-time

**Powered by**: Supabase Realtime subscriptions

## Admin Features

Access: Settings → Admin Login (password required)

### 1. Prayer Approval

**Approve/Deny Prayer Requests**:
1. Go to Admin Portal → Prayers tab
2. Review pending requests
3. **Approve**: Prayer becomes public
4. **Deny**: Provide reason, requester notified

**Batch Actions**:
- Approve All - Approves all pending prayers
- Next Prayer - Keyboard shortcut (N key)

### 2. Update Approval

**Review prayer updates**:
1. Go to Updates tab
2. Review pending updates
3. Approve or deny with reason
4. Approved updates appear on prayer card

### 3. Deletion Requests

**Handle deletion requests**:
1. Go to Deletions tab
2. Types:
   - **Prayer Deletions**: Full prayer removal
   - **Update Deletions**: Single update removal
3. Approve or deny
4. Option to send email notification on denial

### 4. Status Change Requests

**Approve status changes**:
1. Go to Status Changes tab
2. See:
   - Current status → Requested status
   - Reason for change
   - Requester info
3. Approve or deny
4. Prayer status updates automatically if approved

### 5. Email Preference Management

**Approve subscriber changes**:
1. Go to Preferences tab
2. See pending preference changes
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
   - **Auto-Transition**: Enable automatic prayer status transitions

**Prayer Reminders**:
- "Send Reminders Now" button
- Sends emails to prayer requesters with no updates
- Configurable threshold (default: 7 days)

**Auto-Transition**:
- Automatically moves prayers between statuses
- Based on time and activity
- Schedule in Edge Functions

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
