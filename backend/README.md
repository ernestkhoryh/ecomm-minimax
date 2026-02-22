# Marketplace Backend (Express + MySQL)

Traditional Node.js backend to support the Vite frontend using an Express API and MySQL database.

## Features

- JWT auth (`/api/auth/register`, `/api/auth/login`)
- Category endpoints (`/api/categories`)
- Listing endpoints with pagination/search (`/api/listings`)
- MySQL schema derived from `database/schema.sql` and adapted for MySQL enums/indexes

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Copy environment config:
   ```bash
   cp .env.example .env
   ```
3. Create tables:
   ```bash
   mysql -u <user> -p < backend/sql/schema.mysql.sql
   ```
4. Run the API:
   ```bash
   npm run dev
   ```

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

- IDs use UUID strings (`CHAR(36)`) to keep parity with frontend/Supabase-style entities.
- Full-text listing search uses MySQL `FULLTEXT` index + `MATCH ... AGAINST`.
