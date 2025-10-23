-- Create task_audit_log table for tracking status changes
CREATE TABLE IF NOT EXISTS task_audit_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_audit_log_task_id ON task_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_user_id ON task_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_changed_at ON task_audit_log(changed_at DESC);

-- Add comment for documentation
COMMENT ON TABLE task_audit_log IS 'Audit log for tracking task changes, especially status changes';
COMMENT ON COLUMN task_audit_log.action IS 'Type of action performed (e.g., status_change)';
COMMENT ON COLUMN task_audit_log.old_value IS 'Previous value before change';
COMMENT ON COLUMN task_audit_log.new_value IS 'New value after change';
