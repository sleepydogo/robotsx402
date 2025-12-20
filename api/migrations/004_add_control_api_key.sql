-- Add control_api_key column to robots table
-- This column stores the API key for the robot's control API (encrypted/secure)
-- The API key is never exposed to end users for security

ALTER TABLE robots ADD COLUMN control_api_key VARCHAR(500);

-- Note: control_api_key is nullable since not all robots require API authentication
