-- Add category column to robots table
-- This column stores the robot category (general, chess, drone, arm, etc.)

ALTER TABLE robots ADD COLUMN category VARCHAR(50) DEFAULT 'general';

-- Update existing robots to have 'general' category
UPDATE robots SET category = 'general' WHERE category IS NULL;
