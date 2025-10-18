# 🔄 How to Restore Your Database (Simple Guide)

This guide is for **non-technical users** who need to restore the database from a backup.

## ⚠️ IMPORTANT WARNING

**Restoring will ERASE ALL current data and replace it with the backup!**

Make sure you really want to do this before proceeding.

---

## 📋 Step-by-Step Instructions

### Step 1: Find Your Backup

1. Go to your GitHub repository
2. Click the **"Actions"** tab at the top
3. Click **"Daily Database Backup (API Method)"** on the left
4. You'll see a list of backup runs - each one is a backup from a different date
5. Click on the backup you want to restore (usually the most recent one)
6. Look at the URL in your browser - it will look like:
   ```
   https://github.com/Kelemek/prayerapp/actions/runs/12345678
   ```
7. **Copy the number at the end** (e.g., `12345678`) - you'll need this!

### Step 2: Run the Restore

1. Stay on the **Actions** tab
2. Click **"Restore Database from Backup"** on the left
3. Click the gray **"Run workflow"** button (on the right side)
4. A form will appear:

   **Field 1: "Run ID of the backup workflow"**
   - Paste the number you copied from Step 1 (e.g., `12345678`)

   **Field 2: "Type RESTORE to confirm"**
   - Type exactly: `RESTORE` (in all caps)
   - This is a safety check to make sure you really want to do this

5. Click the green **"Run workflow"** button

### Step 3: Wait for Completion

1. The page will refresh
2. Click on the workflow run that just appeared at the top
3. Wait for it to finish (usually takes 1-2 minutes)
4. Look for a green checkmark ✅ - this means it worked!
5. If you see a red X ❌, something went wrong (see Troubleshooting below)

---

## ✅ Done!

Your database has been restored to the backup you selected.

All data in your app should now match what it was at the time of that backup.

---

## 🆘 Troubleshooting

### "No artifact found"
- The Run ID you entered might be wrong
- Go back to Step 1 and double-check the number from the URL

### "Confirmation failed"
- Make sure you typed `RESTORE` exactly (all uppercase, no spaces)

### Red X with other errors
- Check that your GitHub secrets are set up correctly
- Contact your technical administrator

---

## 📞 Need Help?

If you're stuck:
1. Take a screenshot of any error messages
2. Note which step you're on
3. Contact your technical administrator

---

## 📚 For Technical Users

See the full documentation:
- `BACKUP_README.md` - Overview
- `BACKUP_QUICK_START.md` - Quick reference
- `scripts/restore-database-json.sh` - Local restore script
