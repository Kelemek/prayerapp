# Simple Backup & Restore Guide (No GitHub Required!)

This guide is for **anyone** who needs to backup or restore the database without using GitHub.

---

## 💾 How to Create a Backup

### Step 1: Log in to Admin
1. Go to your prayer app
2. Click "Admin Login"
3. Enter your admin password

### Step 2: Go to Settings
1. Click the **"Settings"** tab at the top
2. Scroll down to find the **"Database Backup Status"** card

### Step 3: Click Manual Backup
1. Click the blue **"Manual Backup"** button
2. Wait a few seconds (you'll see "Backing up..." text)
3. A file will automatically download to your computer
4. The file will be named something like: `manual_backup_2025-10-18T14-30-00-000Z.json`

### Step 4: Keep the File Safe
- Save this file somewhere safe (like Google Drive, Dropbox, or external hard drive)
- This is your backup! You'll need it if you ever want to restore

**✅ Done! Your backup is saved.**

---

## 🔄 How to Restore from a Backup

### ⚠️ IMPORTANT WARNING
**Restoring will DELETE ALL current data and replace it with the backup!**

Make sure you really want to do this before proceeding.

### Step 1: Log in to Admin
1. Go to your prayer app
2. Click "Admin Login"
3. Enter your admin password

### Step 2: Go to Settings
1. Click the **"Settings"** tab at the top
2. Scroll down to find the **"Database Backup Status"** card

### Step 3: Click Restore
1. Click the orange **"Restore"** button
2. A dialog box will appear with a big warning

### Step 4: Select Your Backup File
1. Click **"Choose File"** (or the file input area)
2. Find your backup file (it ends in `.json`)
3. Select it

### Step 5: Confirm
1. A confirmation dialog will appear
2. It will show the filename and ask if you're sure
3. **READ THE WARNING!** This will erase all current data
4. If you're sure, click **"OK"**

### Step 6: Wait
1. You'll see "Restoring..." text
2. Wait for it to complete (usually 10-30 seconds)
3. The page will automatically refresh when done

**✅ Done! Your database has been restored.**

---

## 📋 Tips & Best Practices

### When to Create a Manual Backup

✅ **Before making big changes** - Backup before approving many prayers at once  
✅ **Before testing** - Backup before trying new features  
✅ **Weekly/Monthly** - Create regular backups for peace of mind  
✅ **Before restore** - Always backup current data before restoring an old backup!  

### Where to Keep Backups

✅ **Cloud Storage** - Google Drive, Dropbox, OneDrive  
✅ **External Drive** - USB drive, external hard drive  
✅ **Multiple Locations** - Keep copies in 2-3 different places  
❌ **Not on the same computer only** - If your computer fails, you lose the backup!  

### Backup File Information

- **Format:** JSON file (plain text, human-readable)
- **Size:** Usually 50-500 KB depending on data
- **Compressed:** Can be opened with any text editor
- **Safe:** Contains your prayer data but no passwords

---

## 🆘 Troubleshooting

### "Backup failed" error
- Check your internet connection
- Try refreshing the page and trying again
- Check the admin portal for error details

### "Restore failed" error
- Make sure you selected a valid backup file (.json)
- The file might be corrupted - try a different backup
- Check the browser console for error messages

### Backup button is gray/disabled
- Another backup is already in progress
- Wait for it to finish or refresh the page

### "Invalid backup file format" error
- You might have selected the wrong file
- Make sure it's a `.json` file downloaded from this app
- Try using a different backup file

---

## ℹ️ Additional Information

### Automated Backups
- The app automatically backs up every day at 2:00 AM CST
- These are stored in GitHub for 30 days
- Manual backups are in addition to these automated ones

### What Gets Backed Up
- All prayers and updates
- Prayer prompts and types
- Email subscribers
- User preferences
- All settings
- Everything in the database!

### What Doesn't Get Backed Up
- Your admin password (stored separately)
- Files/images (if you have any)
- System configurations

---

**Need more help?**  
- Check the backup status card in Settings tab
- See the full backup log for history
- Contact your technical administrator

**Last Updated:** October 18, 2025
