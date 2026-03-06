-- Migration: Dual AI Orchestration - parsed_content table
-- Requirements: 1.6, 4.3
-- Description: Stores Markdown content extracted from images by Gemini Pro Vision

CREATE TABLE IF NOT EXISTS parsed_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_upload_id UUID NOT NULL REFERENCES manual_uploads(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  markdown_content TEXT NOT NULL,
  token_count INTEGER,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  gemini_model_version TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed')
  ),
  CONSTRAINT valid_token_count CHECK (token_count >= 0)
);

-- Indexes for performance
CREATE INDEX idx_parsed_content_manual_upload ON parsed_content(manual_upload_id);
CREATE INDEX idx_parsed_content_student ON parsed_content(student_id);
CREATE INDEX idx_parsed_content_status ON parsed_content(processing_status);

-- Row Level Security (RLS)
ALTER TABLE parsed_content ENABLE ROW LEVEL SECURITY;

-- Students can view their own parsed content
CREATE POLICY "Students can view their own parsed content"
  ON parsed_content FOR SELECT
  USING (student_id = auth.uid());

-- Service role can manage all parsed content
CREATE POLICY "Service role can manage parsed content"
  ON parsed_content FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Comments for documentation
COMMENT ON TABLE parsed_content IS 'Stores Markdown content extracted from student-uploaded images using Gemini Pro Vision';
COMMENT ON COLUMN parsed_content.markdown_content IS 'Extracted content formatted as Markdown with text, formulas, and diagrams';
COMMENT ON COLUMN parsed_content.token_count IS 'Number of tokens in the markdown content for cost tracking';
COMMENT ON COLUMN parsed_content.processing_status IS 'Current status: pending, processing, completed, or failed';
COMMENT ON COLUMN parsed_content.gemini_model_version IS 'Version of Gemini model used for processing (e.g., gemini-1.5-pro-vision)';
COMMENT ON COLUMN parsed_content.processing_time_ms IS 'Time taken to process the image in milliseconds';
