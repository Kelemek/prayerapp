# Backup Verification System

The verify workflow has been updated to work with the API-based backup method.

## What It Does

The verification workflow checks:
- ✅ Recent backup workflow runs (last 10)
- ✅ Successful backup count
- ✅ Most recent backup is within 48 hours
- ✅ Backup artifacts exist and are accessible
- ✅ Artifacts have not expired
- ✅ Creates a verification report

## Schedule

Runs **weekly on Mondays at 3 AM CST** (9 AM UTC)

## How It Works

1. **Check Recent Backups**: Queries GitHub API for last 10 backup workflow runs
2. **Verify Timing**: Ensures a successful backup exists within the last 48 hours
3. **Check Artifacts**: Verifies the most recent backup has artifacts available
4. **Verify Access**: Confirms artifacts can be accessed and haven't expired
5. **Generate Report**: Creates a verification report with backup status

## Manual Verification

To run verification manually:
1. Go to **Actions** tab
2. Click **"Verify Backup Integrity"**
3. Click **"Run workflow"**
4. Click **"Run workflow"** button

## Verification Report

After each run, download the verification report:
1. Click the workflow run
2. Scroll to **Artifacts** section
3. Download **"backup-verification-report"**

The report shows:
- Total successful backups checked
- Latest artifact size
- Recent backup dates
- Overall system status

## Troubleshooting

**"No successful backup runs found"**
- Check if daily backup workflow is running
- Verify GitHub secrets are correct

**"No backup found from the last 48 hours"**
- Daily backup may have failed
- Check the backup workflow logs

**"Artifact has expired"**
- Artifacts expire after 30 days
- This is normal for older backups
- Recent backups should not be expired

## What Changed from PostgreSQL Method

**Before** (PostgreSQL):
- Checked `backups/` folder for `.sql.gz` files
- Verified file compression integrity
- Checked for PostgreSQL dump content

**After** (API Method):
- Queries GitHub API for workflow runs
- Checks artifact availability
- Verifies artifacts haven't expired
- No longer checks local files (artifacts aren't stored in repo)

---

**Status**: ✅ Updated for API method  
**Schedule**: Weekly on Mondays at 3 AM CST  
**Last Updated**: October 18, 2025
