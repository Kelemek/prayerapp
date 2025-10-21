import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envFile = readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function testVerificationSettings() {
  console.log('Testing verification settings...\n');
  
  // 1. Check current settings
  console.log('1. Checking current admin_settings...');
  const { data: currentData, error: selectError } = await supabase
    .from('admin_settings')
    .select('id, require_email_verification, verification_code_length, verification_code_expiry_minutes')
    .eq('id', 1)
    .maybeSingle();
  
  if (selectError) {
    console.error('❌ Error reading settings:', selectError);
    return;
  }
  
  console.log('Current settings:', currentData);
  console.log('');
  
  // 2. Try to update settings
  console.log('2. Attempting to update settings...');
  const { data: updateData, error: updateError } = await supabase
    .from('admin_settings')
    .upsert({
      id: 1,
      require_email_verification: true,
      verification_code_length: 8,
      verification_code_expiry_minutes: 30,
      updated_at: new Date().toISOString()
    })
    .select();
  
  if (updateError) {
    console.error('❌ Error updating settings:', updateError);
    return;
  }
  
  console.log('✅ Update successful:', updateData);
  console.log('');
  
  // 3. Verify the update
  console.log('3. Verifying update...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('admin_settings')
    .select('id, require_email_verification, verification_code_length, verification_code_expiry_minutes')
    .eq('id', 1)
    .single();
  
  if (verifyError) {
    console.error('❌ Error verifying settings:', verifyError);
    return;
  }
  
  console.log('Verified settings:', verifyData);
  
  // Check if values match
  if (verifyData.require_email_verification === true &&
      verifyData.verification_code_length === 8 &&
      verifyData.verification_code_expiry_minutes === 30) {
    console.log('✅ All settings saved correctly!');
  } else {
    console.log('❌ Settings did not save correctly');
  }
}

testVerificationSettings().catch(console.error);
