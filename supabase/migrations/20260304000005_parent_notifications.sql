-- Migration: Parent Notifications Table
-- Description: Stores notifications for parents about LMS sync events
-- Requirements: 9.1, 9.2, 9.3, 9.4

CREATE TYPE parent_notification_type AS ENUM (
  'connection_authorized',
  'connection_disconnected',
  'sync_success',
  'sync_failed',
  'connection_blocked',
  'connection_restored',
  'new_assignments'
);

CREATE TABLE parent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notification_type parent_notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_title CHECK (LENGTH(title) > 0),
  CONSTRAINT valid_message CHECK (LENGTH(message) > 0)
);

-- Indexes for performance
CREATE INDEX idx_parent_notifications_parent_id ON parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_student_id ON parent_notifications(student_id);
CREATE INDEX idx_parent_notifications_is_read ON parent_notifications(is_read);
CREATE INDEX idx_parent_notifications_created_at ON parent_notifications(created_at DESC);
CREATE INDEX idx_parent_notifications_type ON parent_notifications(notification_type);

-- RLS Policies
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- Parents can view their own notifications
CREATE POLICY "Parents can view their own notifications"
  ON parent_notifications FOR SELECT
  USING (parent_id = auth.uid());

-- Parents can update their own notifications (mark as read)
CREATE POLICY "Parents can update their own notifications"
  ON parent_notifications FOR UPDATE
  USING (parent_id = auth.uid());

-- System can create notifications (service role only)
CREATE POLICY "Service role can create notifications"
  ON parent_notifications FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Comments
COMMENT ON TABLE parent_notifications IS 'Stores notifications for parents about LMS sync events and connection status changes';
COMMENT ON COLUMN parent_notifications.notification_type IS 'Type of notification: connection events, sync results, or new assignments';
COMMENT ON COLUMN parent_notifications.metadata IS 'Additional context like connection_id, provider, assignment_count, etc.';
COMMENT ON COLUMN parent_notifications.is_read IS 'Whether parent has viewed this notification';
