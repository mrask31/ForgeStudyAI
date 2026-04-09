-- Add test date column to student_classes
ALTER TABLE public.student_classes ADD COLUMN IF NOT EXISTS next_test_date timestamptz;
