-- Add rejection_reason field to rex table
ALTER TABLE rex ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
