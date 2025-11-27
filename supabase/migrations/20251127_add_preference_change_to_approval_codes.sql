-- Add 'preference-change' to the approval_codes approval_type constraint

-- Drop the existing constraint
ALTER TABLE approval_codes 
DROP CONSTRAINT IF EXISTS approval_codes_approval_type_check;

-- Add the new constraint with preference-change included
ALTER TABLE approval_codes 
ADD CONSTRAINT approval_codes_approval_type_check 
CHECK (approval_type IN ('prayer', 'update', 'deletion', 'status_change', 'preference-change'));
