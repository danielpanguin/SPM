-- Add "Archived" status to the status table
-- This allows managers and admins to archive tasks

INSERT INTO status (status)
VALUES ('Archived')
ON CONFLICT DO NOTHING;

-- Verify the status was added
SELECT id, status FROM status ORDER BY id;
