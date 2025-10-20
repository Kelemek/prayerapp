# Email Notification System - How It Works

## YES! You Can Send Emails to All Subscribers When a Prayer is Approved ✅

Your prayer app **already has this feature built in and working**! Here's how it works:

---

## Current Setup Overview

### 1. **Email Subscribers Table** 
You have an `email_subscribers` table that stores who should receive prayer notifications:

```sql
email_subscribers
  - id
  - name
  - email
  - is_active (true/false for opt-in/opt-out)
  - created_at
```

### 2. **Admin Settings Control**
In your Admin Portal → Settings, you can configure:

**Email Distribution Options:**
- `admin_only` - Only admins get notified (default)
- `all_users` - **All active subscribers** get notified when prayers are approved

**Where to find it:**
- Admin Portal → Settings → Email Settings
- Look for "Email Distribution" dropdown

---

## How It Works - Step by Step

### When a Prayer is Approved:

1. **Admin approves** a prayer in the Admin Portal
2. Prayer status changes from `pending` → `approved`
3. System automatically calls `sendApprovedPrayerNotification()`
4. System checks `email_distribution` setting:
   - If `admin_only`: Sends to admins only
   - If `all_users`: **Sends to ALL active subscribers** ✅

### Code Flow:

```typescript
// In useAdminData.ts (when admin clicks "Approve")
await sendApprovedPrayerNotification({
  title: prayer.title,
  description: prayer.description,
  requester: prayer.requested_by || 'Anonymous',
  prayerFor: prayer.prayer_for || 'Not specified',
  status: 'Current'
});
```

```typescript
// In emailNotifications.ts
export async function sendApprovedPrayerNotification(payload) {
  // 1. Get admin settings
  const { data: settings } = await supabase
    .from('admin_settings')
    .select('email_distribution')
    .single();

  // 2. Get recipients based on setting
  if (settings?.email_distribution === 'all_users') {
    // ✅ GET ALL SUBSCRIBERS
    const { data: subscribers } = await supabase
      .from('email_subscribers')
      .select('email')
      .eq('is_active', true);  // Only active subscribers
    
    recipients = subscribers.map(s => s.email);
  }

  // 3. Send email to all recipients
  await invokeSendNotification({
    to: recipients,  // ✅ Array of all subscriber emails
    subject: `New Prayer Request: ${payload.title}`,
    body: '...',
    html: generateApprovedPrayerHTML(payload)
  });
}
```

---

## What Subscribers Receive

When a prayer is approved, subscribers get a beautiful HTML email:

**Subject:** "New Prayer Request: [Prayer Title]"

**Email Content:**
- 🙏 Prayer title and description
- Who requested it
- Who it's for
- Current status
- Link to view in the app
- Professional formatting with your church branding

---

## How to Enable/Use This Feature

### Step 1: Add Email Subscribers

**Option A: Manual Entry**
1. Go to Admin Portal → Settings → Email Subscribers
2. Click "+ Add Subscriber"
3. Enter name and email
4. Click "Add Subscriber"

**Option B: CSV Upload**
1. Create CSV file with columns: `name,email`
   ```csv
   name,email
   John Doe,john@example.com
   Jane Smith,jane@example.com
   ```
2. In Admin Portal → Email Subscribers
3. Click "Upload CSV"
4. Select file and upload

### Step 2: Set Email Distribution to "All Users"

1. Go to Admin Portal → Settings
2. Find "Email Settings" section
3. Under "Email Distribution", select **"All Users"**
4. Click "Save Settings"

### Step 3: Test It!

1. Create a test prayer (or have someone submit one)
2. Go to Admin Portal → Prayers (Pending)
3. Click "Approve" on the prayer
4. **All active subscribers will receive the email!** ✅

---

## Managing Subscribers

### View Subscribers
- Admin Portal → Settings → Email Subscribers
- Search by name or email
- See subscription status (active/inactive)

### Deactivate a Subscriber
- Click the red X icon next to subscriber
- They'll be marked as `is_active = false`
- They won't receive emails anymore

### Reactivate a Subscriber
- Search for the subscriber
- If they're inactive, click to reactivate
- (You may need to add this UI - currently manual via database)

---

## Email Types You Can Send

Your system supports these automatic emails:

### 1. ✅ New Approved Prayer
- **Trigger:** Admin approves a prayer
- **Recipients:** All active subscribers (if `all_users` mode)
- **Contains:** Prayer details, link to app

### 2. ✅ New Approved Update
- **Trigger:** Admin approves a prayer update
- **Recipients:** All active subscribers (if `all_users` mode)
- **Contains:** Update content, prayer title, author

### 3. ✅ Admin Notifications
- **Trigger:** New prayer submitted, update submitted, etc.
- **Recipients:** Admins only
- **Contains:** Details for review

---

## Current Limitations & Solutions

### Limitation 1: Resend Test Mode
**Issue:** Your Resend API is in test mode (using onboarding@resend.dev)
**Current Behavior:** Can only send to `markdlarson@me.com`
**Solution:** 
1. Verify a domain in Resend (free)
2. Update `from` address in Edge Function
3. Remove recipient filtering

**How to Fix:**
```typescript
// In supabase/functions/send-notification/index.ts
// REMOVE these lines (around line 64-75):
const filteredRecipients = recipientList.filter(email => 
  email.toLowerCase().trim() === allowedTestEmail.toLowerCase()
);

// REPLACE with:
const filteredRecipients = recipientList;
```

### Limitation 2: Email Volume
**Current:** Resend free tier = 3,000 emails/month
**If you have:** 
- 100 subscribers
- 10 prayers approved/month
- = 1,000 emails/month ✅ (within limit)

**If you need more:**
- Upgrade Resend ($20/mo for 50,000 emails)
- Or use Mailchimp for mass emails (see MAILCHIMP_SETUP.md)

---

## Testing the System

### Test with Your Email Only

1. **Add yourself as subscriber:**
   ```sql
   INSERT INTO email_subscribers (name, email, is_active)
   VALUES ('Test User', 'your-email@example.com', true);
   ```

2. **Set distribution to all users:**
   - Admin Portal → Settings → Email Distribution → "All Users"

3. **Approve a test prayer:**
   - You should receive the email!

### Test Email Format

The email includes:
- ✅ Professional HTML formatting
- ✅ Prayer title in green header
- ✅ Description with nice styling
- ✅ "View Prayer" button linking to your app
- ✅ Mobile-responsive design

---

## Comparison: Current System vs. Mailchimp

| Feature | Current (Resend) | Mailchimp |
|---------|------------------|-----------|
| **Purpose** | Instant notifications | Newsletter campaigns |
| **Trigger** | Automatic (on approval) | Manual send |
| **Cost** | Free (3k/month) | Free (500 contacts, 1k sends) |
| **Setup** | ✅ Already done! | Need to set up |
| **Best For** | Real-time prayer alerts | Weekly prayer digest |
| **Analytics** | Basic | Advanced (open rates, etc.) |

**Recommendation:**
- ✅ **Use current system** for instant "new prayer approved" emails
- 📧 **Add Mailchimp** for weekly prayer list digests (optional)

---

## Quick Start Checklist

- [ ] Add email subscribers (Admin Portal → Settings → Email Subscribers)
- [ ] Set email distribution to "All Users" (Admin Portal → Settings)
- [ ] Verify domain in Resend (to send to any email, not just test)
- [ ] Update Edge Function to remove test recipient filtering
- [ ] Test by approving a prayer
- [ ] Monitor email deliverability

---

## Frequently Asked Questions

**Q: Will subscribers get an email EVERY time I approve a prayer?**
A: Yes, if `email_distribution` is set to "All Users". You can change to "Admin Only" anytime.

**Q: Can subscribers unsubscribe?**
A: Currently manual (admin deactivates them). You can add an unsubscribe link in emails.

**Q: How do I know if emails were sent?**
A: Check browser console for errors. You can also add a `notification_log` table to track sends.

**Q: Can I customize the email template?**
A: Yes! Edit `generateApprovedPrayerHTML()` in `src/lib/emailNotifications.ts`

**Q: What if I have 500+ subscribers?**
A: Consider Mailchimp for better subscriber management and analytics.

**Q: Do updates also go to subscribers?**
A: Yes! There's a separate `sendApprovedUpdateNotification()` function.

---

## Next Steps

1. **To use it NOW:**
   - Add subscribers
   - Set distribution to "All Users"  
   - Approve a prayer
   - ✅ Emails sent!

2. **To remove test limitations:**
   - Verify domain in Resend
   - Update Edge Function
   - Redeploy: `supabase functions deploy send-notification`

3. **For weekly digests:**
   - See `MAILCHIMP_SETUP.md`
   - Set up separate campaign system

---

## Summary

✅ **You already have automatic email notifications to all subscribers!**

Just:
1. Add subscribers to `email_subscribers` table
2. Set `email_distribution` to "All Users" in Admin Settings
3. Approve prayers as normal
4. Everyone gets notified automatically!

The system is ready to use - you just need to add your subscribers and flip the switch!
