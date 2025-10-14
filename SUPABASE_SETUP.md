# Supabase Setup Instructions

Follow these steps to set up Supabase for your Church Prayer Manager app:

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or sign in to your account
3. Click "New Project"
4. Fill in your project details:
   - **Name**: Church Prayer Manager (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users

## 2. Set Up the Database

1. Once your project is created, go to the **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql` from this project
3. Paste it into the SQL Editor and click "Run"
4. This will create the necessary tables, indexes, and sample data

## 3. Get Your Project Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (something like `https://abcdefghijklmnop.supabase.co`)
   - **Project API Key** (anon public key)

## 4. Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 5. Test the Connection

1. Save the `.env` file
2. Restart your development server if it's running:
   ```bash
   npm run dev
   ```
3. Open your browser to `http://localhost:5173`
4. The app should now load prayers from Supabase
5. Try adding a new prayer request to test the connection

## 6. Verify Real-time Features

1. Open the app in two different browser windows
2. Add a prayer request in one window
3. You should see it appear in the other window automatically
4. Try updating prayer status or adding updates

## Database Schema Overview

The app uses two main tables:

### `prayers`
- Stores prayer requests with title, description, category, status, and requester
- Automatically tracks creation and update timestamps
- Supports categories: healing, guidance, thanksgiving, protection, family, finances, salvation, missions, other
- Status options: active, ongoing, answered, closed

### `prayer_updates`
- Stores updates/comments for each prayer request
- Linked to prayers via foreign key relationship
- Includes content, author, and timestamp

## Security Notes

- The current setup allows public read/write access for simplicity
- For production use, consider implementing authentication
- You can modify the Row Level Security (RLS) policies in Supabase for more restrictive access

## Troubleshooting

### "Connection Error" Message
- Verify your `.env` file has the correct Supabase URL and API key
- Make sure there are no extra spaces or quotes around the values
- Restart your development server after changing environment variables

### Missing Tables Error
- Make sure you ran the `supabase-schema.sql` in your Supabase SQL Editor
- Check that the tables were created in the **Table Editor** section

### Real-time Not Working
- Ensure your Supabase project has real-time enabled (it's on by default)
- Check the browser console for any WebSocket connection errors

## Next Steps

Once everything is working:
1. Consider adding authentication for user-specific features
2. Customize the database policies for your security needs
3. Deploy your app to a hosting service like Vercel, Netlify, or Supabase hosting
4. Share the app URL with your church community

## Support

If you encounter issues:
1. Check the Supabase documentation at [docs.supabase.com](https://docs.supabase.com)
2. Review the browser console for error messages
3. Verify your environment variables are correct
4. Make sure your Supabase project is active and not paused