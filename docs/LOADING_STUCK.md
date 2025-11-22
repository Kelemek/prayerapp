# Troubleshooting: Site Stuck on Loading Screen

If you see skeleton loaders that never finish loading, follow these steps:

## 1. Check Browser Console
Open the browser console (F12 or Right-click → Inspect → Console) and look for errors:
- Red error messages about Supabase
- Network errors
- CORS errors
- Environment variable errors

## 2. Common Causes

### Missing Environment Variables
The app requires these environment variables to be set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**On Vercel/Production:**
Make sure these are set in your deployment environment variables.

**Locally:**
Create a `.env` file in the root directory with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Network/Firewall Issues
- Check if the Supabase URL is accessible from the user's network
- Corporate firewalls may block certain domains
- VPNs can sometimes cause connection issues

### Browser Compatibility
- Clear browser cache and cookies
- Try incognito/private mode
- Update Chrome to the latest version
- Disable browser extensions temporarily

## 3. What to Check

1. **Console Logs**: Look for messages like:
   - "Supabase client initializing..."
   - "Loading timeout - please check your internet connection"
   - Any error messages in red

2. **Network Tab**: 
   - Open DevTools → Network
   - Refresh the page
   - Look for failed requests (red)
   - Check if Supabase API calls are going through

3. **Timeout Message**:
   - If loading takes > 15 seconds, an error message will appear
   - This indicates a connection problem

## 4. Solutions

### Quick Fixes:
- Refresh the page (Ctrl+R or Cmd+R)
- Clear cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)
- Try a different browser
- Check internet connection

### If Problem Persists:
1. Check Supabase dashboard for service status
2. Verify environment variables are correctly set
3. Check Supabase project is not paused/suspended
4. Review RLS (Row Level Security) policies on the `prayers` table
5. Ensure the `approval_status` column exists on the `prayers` table

## 5. Debug Mode

To enable debug logging, open the browser console and run:
```javascript
localStorage.setItem('debug', 'true')
```
Then reload the page. This will show more detailed logs.

## 6. Contact Support

If none of the above works, provide the following information:
- Browser version (Chrome, Firefox, etc.)
- Operating System (Windows, Mac, Linux)
- Any error messages from the console
- Screenshot of the Network tab showing failed requests
- Whether the issue happens in incognito mode
