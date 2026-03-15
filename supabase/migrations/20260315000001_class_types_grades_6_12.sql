-- ============================================
-- Replace nursing class types with grades 6-12 subjects
-- ============================================

-- Drop the old CHECK constraint
ALTER TABLE student_classes DROP CONSTRAINT IF EXISTS student_classes_type_check;

-- Migrate existing nursing types to 'other'
UPDATE student_classes
SET type = 'other'
WHERE type IN ('fundamentals', 'med_surg', 'pharm', 'peds', 'ob', 'psych');

-- Add the new CHECK constraint with grades 6-12 subject types
ALTER TABLE student_classes
ADD CONSTRAINT student_classes_type_check
CHECK (type IN ('math', 'science', 'english', 'history', 'foreign_language', 'arts', 'elective', 'other'));
