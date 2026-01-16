-- ============================================
-- LEARNING SOURCES + ITEMS (School-Aware RAG)
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create learning_sources table
CREATE TABLE IF NOT EXISTS public.learning_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.student_profiles(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('syllabus', 'weekly', 'photos', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create learning_source_items table
CREATE TABLE IF NOT EXISTS public.learning_source_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.learning_sources(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('text', 'file', 'photo', 'note')),
  file_url TEXT,
  mime_type TEXT,
  original_filename TEXT,
  extracted_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_sources_user_id ON public.learning_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sources_profile_id ON public.learning_sources(profile_id);
CREATE INDEX IF NOT EXISTS idx_learning_sources_type ON public.learning_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_learning_sources_created_at ON public.learning_sources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_source_items_source_id ON public.learning_source_items(source_id);
CREATE INDEX IF NOT EXISTS idx_learning_source_items_created_at ON public.learning_source_items(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.learning_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_source_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for learning_sources
DROP POLICY IF EXISTS "Users can view their own learning sources" ON public.learning_sources;
CREATE POLICY "Users can view their own learning sources"
  ON public.learning_sources
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own learning sources" ON public.learning_sources;
CREATE POLICY "Users can create their own learning sources"
  ON public.learning_sources
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own learning sources" ON public.learning_sources;
CREATE POLICY "Users can update their own learning sources"
  ON public.learning_sources
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own learning sources" ON public.learning_sources;
CREATE POLICY "Users can delete their own learning sources"
  ON public.learning_sources
  FOR DELETE
  USING (user_id = auth.uid());

-- 6. RLS Policies for learning_source_items
DROP POLICY IF EXISTS "Users can view their own learning source items" ON public.learning_source_items;
CREATE POLICY "Users can view their own learning source items"
  ON public.learning_source_items
  FOR SELECT
  USING (
    source_id IN (
      SELECT id FROM public.learning_sources WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own learning source items" ON public.learning_source_items;
CREATE POLICY "Users can create their own learning source items"
  ON public.learning_source_items
  FOR INSERT
  WITH CHECK (
    source_id IN (
      SELECT id FROM public.learning_sources WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own learning source items" ON public.learning_source_items;
CREATE POLICY "Users can update their own learning source items"
  ON public.learning_source_items
  FOR UPDATE
  USING (
    source_id IN (
      SELECT id FROM public.learning_sources WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own learning source items" ON public.learning_source_items;
CREATE POLICY "Users can delete their own learning source items"
  ON public.learning_source_items
  FOR DELETE
  USING (
    source_id IN (
      SELECT id FROM public.learning_sources WHERE user_id = auth.uid()
    )
  );

-- 7. updated_at triggers
CREATE OR REPLACE FUNCTION set_learning_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_learning_source_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_learning_sources_updated_at ON public.learning_sources;
CREATE TRIGGER set_learning_sources_updated_at
  BEFORE UPDATE ON public.learning_sources
  FOR EACH ROW
  EXECUTE FUNCTION set_learning_sources_updated_at();

DROP TRIGGER IF EXISTS set_learning_source_items_updated_at ON public.learning_source_items;
CREATE TRIGGER set_learning_source_items_updated_at
  BEFORE UPDATE ON public.learning_source_items
  FOR EACH ROW
  EXECUTE FUNCTION set_learning_source_items_updated_at();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('learning_sources', 'learning_source_items');
--
-- SELECT policyname FROM pg_policies WHERE tablename IN ('learning_sources', 'learning_source_items');
-- ============================================
