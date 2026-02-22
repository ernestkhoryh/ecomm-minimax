# Marketplace Backend (Express + MySQL)

Traditional Node.js backend to support the Vite frontend using an Express API and relational database schema.

## Important schema note

The backend SQL schema now **follows `database/schema.sql` exactly** and is mirrored at:

- `backend/sql/schema.mysql.sql`

This keeps backend schema definitions aligned with the canonical project schema.

## Features

- JWT auth (`/api/auth/register`, `/api/auth/login`)
- Category endpoints (`/api/categories`)
- Listing endpoints with pagination/search (`/api/listings`)

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Update environment config in `.env` (already committed in this backend folder).
3. Load schema:
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
