# Microsoft Clarity Setup Guide

Microsoft Clarity provides session replays, heatmaps, and crash detection - all permanently free.

## Quick Setup (5 minutes)

### 1. Create Clarity Project

1. Go to https://clarity.microsoft.com
2. Sign in with Microsoft account (or create one - free)
3. Click **New project**
4. Enter project name: `Prayer App`
5. Click **Create**
6. Copy your **Project ID** (looks like: `abc123xyz`)

### 2. Add Project ID to Environment

Add to `.env.local`:
```
VITE_CLARITY_PROJECT_ID=your_project_id_here
```

Example:
```
VITE_CLARITY_PROJECT_ID=p8x9q2k5r
```

### 3. Restart Dev Server

```bash
npm run dev
```

That's it! Clarity is now active. You can start recording sessions.

## What You Get

### Session Replays
- Watch exactly what users see/do
- Includes: clicks, scrolls, form inputs, navigation
- Perfect for debugging reported issues
- Click a session to watch the replay

### Heatmaps
- See where users click most
- Identify confusing UI elements
- Find unused features
- Optimize layout based on user behavior

### Crash Detection
- Automatically captures sessions that crash
- See what user was doing before crash
- Invaluable for debugging production issues

### Rage Click Detection
- Detects users clicking repeatedly (frustration)
- Shows you where UX is confusing
- Helps prioritize fixes

## Viewing Data in Clarity Dashboard

1. Log in to https://clarity.microsoft.com
2. Select your project
3. **Sessions** tab - watch session replays
4. **Heatmaps** tab - see click patterns
5. **Crashes** tab - see error sessions
6. **Insights** tab - AI-powered recommendations

## Debugging with Clarity + Vercel Logs

**When user reports issue:**

1. **Clarity**: Watch session replay to see what happened
2. **Vercel logs**: Check for error messages
3. **Browser console**: See technical errors
4. **Together**: Get complete picture

Example workflow:
```
User: "Form submission failed"
↓
Clarity: Watch them click submit button → see loading state → blank page
↓
Vercel logs: See "Supabase connection timeout"
↓
Root cause: Database was slow, form timed out
↓
Fix: Add retry logic and timeout handling
```

## Privacy & Data

### What Clarity Records
- User interactions (clicks, scrolls, form fills)
- Page URLs and navigation
- Browser/device info
- Session duration

### What Clarity Does NOT Record
- Password fields (redacted)
- Credit card info (redacted)
- Sensitive input data (configurable)

### Data Retention
- Free tier: 7-30 days depending on plan
- Stored in Microsoft servers (enterprise grade)

## Advanced: Mask Sensitive Data

To hide sensitive information in replays:

```javascript
// Add this in clarity.ts if needed
window.clarity = window.clarity || function() { 
  (window.clarity.q = window.clarity.q || []).push(arguments) 
};

// Mask a specific element
clarity('set', 'mask', '.payment-input');

// Mask all inputs
clarity('set', 'mask', 'input[type="password"]');
clarity('set', 'mask', 'input[type="email"]');
```

## Troubleshooting

### Clarity not tracking sessions

**Check:**
1. Is `VITE_CLARITY_PROJECT_ID` set in `.env.local`?
2. Is dev server restarted? (`npm run dev`)
3. Is browser console showing any errors?
4. Check Clarity dashboard - might need to wait a few minutes for first session

### Sessions showing but no interactions

Usually means:
- First session might be partial
- Wait for another session to complete
- Try clicking around and see if actions appear in replay

### Privacy concerns

Clarity is safe for prayer apps:
- Doesn't record actual prayer text by default
- Can configure masking for sensitive fields
- GDPR compliant
- Used by 1000s of websites

## Free Tier Limits

- **Sessions recorded**: Unlimited for free tier
- **Data retention**: Depends on volume (typically 7-30 days free)
- **Features**: All core features included
- **Users**: Unlimited
- **Projects**: Multiple projects possible

## When to Upgrade

Upgrade to paid if you need:
- Longer data retention (30+ days)
- Advanced AI insights
- Custom integrations
- Priority support

For Prayer App, free tier should be perfect.

## Resources

- [Clarity Documentation](https://learn.microsoft.com/en-us/clarity/)
- [Session Replay Guide](https://learn.microsoft.com/en-us/clarity/session-replay)
- [Privacy & Security](https://learn.microsoft.com/en-us/clarity/privacy-and-compliance)

## Next Steps

1. ✅ Create Clarity project
2. ✅ Add Project ID to `.env.local`
3. ✅ Restart dev server
4. ✅ Log in to Clarity dashboard
5. ✅ Click around your app to generate a session
6. ✅ Watch your first session replay!

You now have:
- **Vercel logs** = error tracking
- **Clarity** = session replays
- **Together** = complete debugging toolkit (all free!)
