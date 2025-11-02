-- Make your email an admin
-- Replace 'your-email@example.com' with your actual email address

-- Option 1: If you already exist in email_subscribers, just update
UPDATE email_subscribers 
SET is_admin = true 
WHERE email = 'markdlarson@me.com';

-- Option 2: If you don't exist, insert yourself as an admin
INSERT INTO email_subscribers (name, email, is_admin, is_active)
VALUES ('Mark Larson', 'markdlarson@me.com', true, true)
ON CONFLICT (email) 
DO UPDATE SET is_admin = true;

-- Verify it worked
SELECT email, name, is_admin, created_at 
FROM email_subscribers 
WHERE email = 'markdlarson@me.com';
