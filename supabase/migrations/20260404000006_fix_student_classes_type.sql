-- Fix student_classes type constraint
-- Remove nursing-specific type constraint, make column optional with default
ALTER TABLE public.student_classes DROP CONSTRAINT IF EXISTS student_classes_type_check;
ALTER TABLE public.student_classes ALTER COLUMN type DROP NOT NULL;
ALTER TABLE public.student_classes ALTER COLUMN type SET DEFAULT 'other';
