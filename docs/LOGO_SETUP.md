# Logo System Setup Guide

## Overview
This guide explains how to set up the image-based logo system for light and dark mode support.

## Database Changes

### 1. Run the Migration
Execute the migration file to add the required columns to `admin_settings`:

```sql
-- supabase/migrations/20251123_add_use_logo_setting.sql
ALTER TABLE admin_settings ADD COLUMN use_logo boolean DEFAULT false NOT NULL;
ALTER TABLE admin_settings ADD COLUMN light_mode_logo_url text;
ALTER TABLE admin_settings ADD COLUMN dark_mode_logo_url text;
```

**Steps:**
- Go to Supabase Dashboard
- Navigate to SQL Editor
- Copy and paste the migration SQL
- Click "Run" to execute

Or via Supabase CLI:
```bash
supabase migration up
```

### 2. Create Storage Bucket

The system uses Supabase Storage bucket named `app-assets` to store logo images.

**Via Supabase Dashboard:**
1. Go to Storage section
2. Click "New bucket"
3. Name it: `app-assets`
4. Make it **Public** (toggle on)
5. Click "Create bucket"

**Storage Structure:**
```
app-assets/
  └── logos/
      ├── light-mode-logo-{timestamp}.png
      └── dark-mode-logo-{timestamp}.jpg
```

### 3. Set Storage Permissions (RLS)

In Supabase Dashboard > Storage > Policies for `app-assets` bucket:

**For Public Read Access:**
```sql
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'app-assets');
```

**For Admin Upload/Delete:**
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
USING (
  bucket_id = 'app-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'app-assets' 
  AND auth.role() = 'authenticated'
);
```

## Verification

After setup, verify the changes:

```sql
-- Check admin_settings columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_settings'
ORDER BY ordinal_position;
```

You should see:
- `use_logo` (boolean, default: false)
- `light_mode_logo_url` (text, nullable)
- `dark_mode_logo_url` (text, nullable)

## Usage

### Admin Settings
1. Navigate to Admin Portal → Settings → Branding
2. Toggle "Use logo instead of title/subtitle"
3. Upload light mode logo (appears in light theme)
4. Upload dark mode logo (appears in dark theme)
5. Preview images before saving
6. Click "Save Changes"

### Frontend Display
- When `use_logo = true`: Header displays logo images (light/dark based on theme)
- When `use_logo = false`: Header displays title and subtitle text
- Logo automatically switches based on document's dark mode class

### Image Recommendations
- **Format:** PNG, JPG, WEBP
- **Size:** 200-300px width recommended
- **Background:** Transparent background preferred for dark mode flexibility
- **Max file size:** 5MB

## API Endpoints Used

### Upload
```typescript
supabase.storage
  .from('app-assets')
  .upload(`logos/light-mode-logo-${timestamp}.${ext}`, file, {
    cacheControl: '3600',
    upsert: false
  })
```

### Delete
```typescript
supabase.storage
  .from('app-assets')
  .remove([`logos/light-mode-logo-${timestamp}.${ext}`])
```

### Database Update
```typescript
supabase
  .from('admin_settings')
  .update({
    use_logo: true,
    light_mode_logo_url: publicUrl,
    dark_mode_logo_url: publicUrl
  })
  .eq('id', 1)
```

## Troubleshooting

### "Failed to upload image"
- Check storage bucket exists and is public
- Verify storage RLS policies allow uploads
- Check file size (max 5MB)
- Verify file is valid image format

### "Logo not displaying"
- Confirm `use_logo = true` in admin_settings
- Check image URLs are correct and publicly accessible
- Verify storage bucket has public read access
- Check browser console for CORS errors

### "Changes not saving"
- Ensure database migration has been applied
- Check that admin_settings row with id=1 exists
- Verify RLS policies allow updates on admin_settings table

## File References

- Component: `src/components/AppLogo.tsx` - Logo display
- Admin UI: `src/components/AppBranding.tsx` - Upload interface
- Main app: `src/App.tsx` - Header integration
- Migration: `supabase/migrations/20251123_add_use_logo_setting.sql`
