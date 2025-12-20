-- Migration: Add AI-powered control interface fields to robots table
-- Date: 2025-12-17
-- Description: Adds fields for robot control API URL, video streaming, GPS tracking, and AI-generated interface configuration

-- Add new columns to robots table
ALTER TABLE robots ADD COLUMN control_api_url VARCHAR(500);
ALTER TABLE robots ADD COLUMN video_stream_url VARCHAR(500);
ALTER TABLE robots ADD COLUMN has_gps INTEGER DEFAULT 0;
ALTER TABLE robots ADD COLUMN gps_coordinates JSON;
ALTER TABLE robots ADD COLUMN interface_config JSON;

-- Comments on new columns:
-- control_api_url: URL of the robot's control API for AI exploration
-- video_stream_url: Optional URL for robot's video stream
-- has_gps: Boolean flag (0/1) indicating if robot has GPS tracking
-- gps_coordinates: JSON object with {"lat": float, "lng": float}
-- interface_config: AI-generated JSON configuration for control interface
