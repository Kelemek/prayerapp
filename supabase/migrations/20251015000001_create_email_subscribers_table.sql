-- Create email_subscribers table for managing notification recipients
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on email for faster lookups
CREATE INDEX idx_email_subscribers_email ON email_subscribers(email);

-- Create index on is_active for filtering
CREATE INDEX idx_email_subscribers_active ON email_subscribers(is_active);

-- Enable RLS
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (admins) can read subscribers
CREATE POLICY "Authenticated users can read email subscribers"
  ON email_subscribers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users (admins) can insert subscribers
CREATE POLICY "Authenticated users can insert email subscribers"
  ON email_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users (admins) can update subscribers
CREATE POLICY "Authenticated users can update email subscribers"
  ON email_subscribers
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Only authenticated users (admins) can delete subscribers
CREATE POLICY "Authenticated users can delete email subscribers"
  ON email_subscribers
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER email_subscribers_updated_at
  BEFORE UPDATE ON email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_email_subscribers_updated_at();

-- Insert sample admin email (update this with your actual admin email)
INSERT INTO email_subscribers (name, email, is_active)
VALUES ('Admin', 'admin@example.com', true)
ON CONFLICT (email) DO NOTHING;
