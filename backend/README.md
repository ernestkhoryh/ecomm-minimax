# Marketplace Backend (Express + PostgreSQL)

Traditional Node.js backend to support the Vite frontend using an Express API and PostgreSQL schema.

## Schema

- PostgreSQL backend schema: `backend/sql/schema.postgresql.sql`
- Canonical project schema: `database/schema.sql`

SELECT datname FROM pg_database;

SELECT tablename
FROM pg_tables
WHERE schemaname = 'public';

## Features

- JWT auth (`/api/auth/register`, `/api/auth/login`)
- Category endpoints (`/api/categories`)
- Listing endpoints with pagination/search (`/api/listings`)
- PostgreSQL-compatible schema and queries

## Setup

1. Install dependencies:

bash
cd backend
npm install

2.Configure environment variables in `backend/.env`:

bash
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=marketplace
DB_SSL=false
PORT=4000
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

3.Create the database and apply schema:

bash
createdb marketplace
psql -d marketplace -f backend/sql/schema.postgresql.sql

"C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -p 5432 -U postgres marketplace

"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d marketplace -f
"C:\Users\ernes\test-folder\ecomm-minimax\backend\sql\schema.postgresql.sql"

4.Run the API:

bash
npm run dev

## API Summary

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/categories`
- `POST /api/categories` (admin/super_admin)
- `GET /api/listings`
- `GET /api/listings/:id`
- `POST /api/listings` (authenticated)

## Notes

- IDs are UUIDs (PostgreSQL `UUID` type).
- Listing search uses PostgreSQL `ILIKE` filtering across title/description/brand/model.
