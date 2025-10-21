# Smoke Tests for Preview Deployment

## Preview URL
Check your PR for the Netlify preview URL. It should look like:
- `https://deploy-preview-1--cp-church-prayer.netlify.app`
- Or check the PR comments for the exact URL

---

## Test Checklist

### ✅ 1. Basic Loading
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools (F12)
- [ ] CSS/styling loads correctly
- [ ] Dark/light mode toggle works (if applicable)

### ✅ 2. User Features (Public)
- [ ] **View Prayers**
  - [ ] Prayer list displays
  - [ ] Can scroll through prayers
  - [ ] Prayer cards show correctly

- [ ] **Create Prayer**
  - [ ] Click "Add Prayer" or equivalent button
  - [ ] Form appears
  - [ ] Can type prayer text
  - [ ] Can submit prayer
  - [ ] New prayer appears in list

- [ ] **Update Prayer**
  - [ ] Click edit on a prayer
  - [ ] Can modify text
  - [ ] Save works
  - [ ] Changes persist

- [ ] **Delete Prayer**
  - [ ] Click delete/trash icon
  - [ ] Confirmation appears
  - [ ] Prayer removed after confirmation

### ✅ 3. Admin Features
- [ ] **Admin Login**
  - [ ] Navigate to admin page (usually `/admin` or login button)
  - [ ] Can enter credentials
  - [ ] Login succeeds with correct credentials
  - [ ] Redirects to admin portal

- [ ] **Admin Portal**
  - [ ] Admin dashboard loads
  - [ ] Can see admin-only features
  - [ ] Navigation works

- [ ] **Backup Status** (if visible)
  - [ ] Backup section displays
  - [ ] Shows recent backups (if any)
  - [ ] Manual backup button visible
  - [ ] No errors in backup logs

- [ ] **Email Settings** (if applicable)
  - [ ] Email settings page loads
  - [ ] Can view current settings
  - [ ] Settings forms work

### ✅ 4. Supabase Connection
- [ ] **Database Connection**
  - [ ] Data loads from Supabase
  - [ ] CRUD operations work (Create, Read, Update, Delete)
  - [ ] No "unauthorized" or connection errors
  - [ ] Real-time updates work (if applicable)

### ✅ 5. Environment Variables Check
Open browser DevTools (F12) → Console tab, paste this:
```javascript
// This should NOT show your actual keys (they should be hidden)
console.log('Env check:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  // Should both show 'true' if properly configured
});
```

Expected output:
```
Env check: { hasSupabaseUrl: true, hasSupabaseKey: true }
```

If either shows `false`, the build didn't include environment variables.

### ✅ 6. Mobile Responsiveness (Quick Check)
- [ ] Resize browser window to phone size (or use DevTools device mode)
- [ ] Layout adapts to mobile
- [ ] Buttons/forms usable on small screen
- [ ] No horizontal scrolling

### ✅ 7. Performance Check
- [ ] Page loads in < 3 seconds
- [ ] No janky animations
- [ ] Smooth scrolling
- [ ] No memory leaks (leave page open 1-2 minutes, check if it slows down)

---

## Common Issues & Fixes

### ❌ "Error: Unauthorized" or "Invalid API key"
**Problem:** `VITE_SUPABASE_ANON_KEY` is wrong or missing
**Fix:** Update GitHub secret and re-run workflow

### ❌ "Network error" or "Failed to fetch"
**Problem:** `VITE_SUPABASE_URL` is wrong or Supabase is down
**Fix:** Verify URL in GitHub secrets matches Supabase dashboard

### ❌ Page loads but no data
**Problem:** RLS policies might be blocking access, or database is empty
**Fix:** Check Supabase dashboard → Table Editor → Authentication

### ❌ Admin login fails
**Problem:** Admin credentials not set up or wrong
**Fix:** Check Supabase → Authentication → Users

### ❌ Blank white page
**Problem:** Build error or env vars not loaded
**Fix:** Check Netlify build logs for errors

---

## Quick Test Script (Copy/Paste)

Run through these steps in order:

```
1. Open preview URL in browser
2. Open DevTools (F12) → Console tab
3. Check for any red errors
4. Create a test prayer: "Test prayer from PR preview"
5. Edit the prayer: "Edited test prayer"
6. Delete the prayer
7. Navigate to /admin (or click admin login)
8. Login with admin credentials
9. Check backup status displays
10. Log out
```

---

## Test Results Template

Copy this and fill it out:

```
## Smoke Test Results - PR #1

**Preview URL:** [paste URL here]
**Tested by:** [your name]
**Date:** October 18, 2025

### Results:
- [ ] ✅ Basic loading - PASS
- [ ] ✅ User features - PASS
- [ ] ✅ Admin features - PASS
- [ ] ✅ Supabase connection - PASS
- [ ] ✅ Environment variables - PASS
- [ ] ✅ Mobile responsive - PASS
- [ ] ✅ Performance - PASS

### Issues Found:
[List any issues or write "None"]

### Notes:
[Any additional observations]

### Decision:
- [ ] ✅ Ready to merge
- [ ] ❌ Needs fixes before merge
```

---

## After Testing

If all tests pass:
1. Comment test results on the PR
2. Merge PR to main
3. Monitor production deployment

If tests fail:
1. Document failures
2. Fix issues
3. Push fixes to test branch
4. Re-test when workflow completes
