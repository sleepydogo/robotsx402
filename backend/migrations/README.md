# Database Migrations

This directory contains SQL migration files for the x402 Payment Platform database.

## Current Database
- **Type:** SQLite (Development)
- **File:** `backend/x402_platform.db`
- **Future:** PostgreSQL (Production - see DATABASE_URL in .env)

## Applying Migrations

### For SQLite (Development)

Run migrations manually using sqlite3:

```bash
cd backend
sqlite3 x402_platform.db < migrations/001_add_robot_interface_fields.sql
```

### For PostgreSQL (Production)

When migrating to PostgreSQL, use Alembic:

```bash
cd backend

# Initialize Alembic (first time only)
alembic init alembic

# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## Migration Files

### 001_add_robot_interface_fields.sql
- **Date:** 2025-12-17
- **Purpose:** Add AI-powered control interface fields to robots table
- **Changes:**
  - `control_api_url` VARCHAR(500) - URL of robot's control API
  - `video_stream_url` VARCHAR(500) - Optional video stream URL
  - `has_gps` INTEGER - Boolean flag for GPS tracking (0/1)
  - `gps_coordinates` JSON - GPS coordinates {"lat": float, "lng": float}
  - `interface_config` JSON - AI-generated control interface configuration

## Notes

- Always backup your database before running migrations
- Test migrations on development database first
- For PostgreSQL, ensure database connection is configured in `.env`
- Migration files are numbered sequentially: 001, 002, 003, etc.
