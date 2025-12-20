-- Add rental_plans column to robots table
-- This column stores rental plans as JSON array
-- Example: [{"duration_minutes": 30, "price": 5.0, "name": "30 min Plan"}]

ALTER TABLE robots ADD COLUMN rental_plans TEXT;

-- Update existing robots to have a default rental plan based on their current price
-- Assuming current price is per second, create a 10-minute default plan
UPDATE robots SET rental_plans = json_array(
    json_object(
        'duration_minutes', 10,
        'price', CAST(price AS REAL) * 600,
        'name', '10 minutes'
    )
) WHERE rental_plans IS NULL;
