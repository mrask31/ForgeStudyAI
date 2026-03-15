-- ============================================
-- Fix mutable search_path on all SECURITY DEFINER functions
-- Supabase security advisor flags functions without SET search_path
-- This migration adds SET search_path = '' to all affected functions
-- ============================================

-- 1. update_lms_connections_updated_at
CREATE OR REPLACE FUNCTION update_lms_connections_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. update_synced_assignments_updated_at
CREATE OR REPLACE FUNCTION update_synced_assignments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. update_manual_uploads_updated_at
CREATE OR REPLACE FUNCTION update_manual_uploads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. update_student_classes_updated_at
CREATE OR REPLACE FUNCTION update_student_classes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. update_student_profiles_updated_at
CREATE OR REPLACE FUNCTION update_student_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. update_saved_clips_updated_at
CREATE OR REPLACE FUNCTION update_saved_clips_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 7. update_study_topics_updated_at
CREATE OR REPLACE FUNCTION update_study_topics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. update_study_topic_items_updated_at
CREATE OR REPLACE FUNCTION update_study_topic_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. update_word_bank_updated_at
CREATE OR REPLACE FUNCTION update_word_bank_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. set_updated_at (email templates)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. set_learning_sources_updated_at
CREATE OR REPLACE FUNCTION set_learning_sources_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. set_learning_source_items_updated_at
CREATE OR REPLACE FUNCTION set_learning_source_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 13. set_email_events_updated_at
CREATE OR REPLACE FUNCTION set_email_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 14. update_updated_at_column (chat schema)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 15. update_chat_last_active
CREATE OR REPLACE FUNCTION update_chat_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

-- 16. generate_message_id
CREATE OR REPLACE FUNCTION generate_message_id(chat_id_val UUID, content_val TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN encode(digest(chat_id_val::text || content_val || NOW()::text, 'sha256'), 'hex');
END;
$$;

-- 17. generate_inbox_email
CREATE OR REPLACE FUNCTION generate_inbox_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_email TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INT;
BEGIN
  LOOP
    new_email := '';
    FOR i IN 1..8 LOOP
      new_email := new_email || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    new_email := new_email || '@inbox.forgestudy.com';
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE inbox_email = new_email) THEN
      RETURN new_email;
    END IF;
  END LOOP;
END;
$$;

-- 18. set_inbox_email_on_insert
CREATE OR REPLACE FUNCTION set_inbox_email_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.inbox_email IS NULL THEN
    NEW.inbox_email := generate_inbox_email();
  END IF;
  RETURN NEW;
END;
$$;

-- 19. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    'trialing',
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 20. is_trial_active
CREATE OR REPLACE FUNCTION public.is_trial_active(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  trial_end TIMESTAMPTZ;
BEGIN
  SELECT trial_ends_at INTO trial_end
  FROM public.profiles
  WHERE id = user_id;

  IF trial_end IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN trial_end > NOW();
END;
$$;

-- 21. get_trial_days_left
CREATE OR REPLACE FUNCTION public.get_trial_days_left(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  trial_end TIMESTAMPTZ;
  days_left INTEGER;
BEGIN
  SELECT trial_ends_at INTO trial_end
  FROM public.profiles
  WHERE id = user_id;

  IF trial_end IS NULL THEN
    RETURN 0;
  END IF;

  days_left := EXTRACT(DAY FROM (trial_end - NOW()));

  IF days_left < 0 THEN
    RETURN 0;
  END IF;

  RETURN days_left;
END;
$$;
