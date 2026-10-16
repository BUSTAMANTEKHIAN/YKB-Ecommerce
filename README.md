# YKB Clothing E-Commerce

Premium Streetwear E-Commerce platform built with vanilla HTML, CSS, JavaScript frontend and Node.js / Express 5 backend with TiDB Cloud (MySQL 8.0+) database.

---

> [!WARNING]
> **SECURITY ADVISORY — CREDENTIAL ROTATION NOTICE**  
> Prior versions of the repository included historical database dumps containing user records and bcrypt password hashes. If you had accounts created prior to October 2026, or if any database credentials were shared, **rotate your database passwords, JWT secrets, PayMongo API keys, and Cloudinary API credentials immediately**. Users whose emails appeared in legacy test dumps must change their passwords.

---

## Architecture

- **Frontend:** Vanilla HTML, CSS, and JavaScript in `client/`
- **Backend:** Node.js, Express 5, CommonJS in `server/`
- **Database:** TiDB Cloud / MySQL-compatible database via `mysql2` with TLS 1.2
- **Authentication:** JWT (HMAC-SHA256) and bcrypt
- **Payments:** PayMongo Checkout Sessions (GCash, Card, QRPh) and Cash on Delivery (COD)
- **Media:** Cloudinary

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+ recommended)
- MySQL 8.0+ or TiDB Cloud instance

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env and supply your local database credentials and test API keys
npm run dev
```

### 3. Database Setup & Migrations
1. Create the database:
   ```sql
   CREATE DATABASE ykb_clothing;
   ```
2. Import the clean schema:
   ```bash
   mysql -u <user> -p ykb_clothing < server/database/ykb_clothing.sql
   ```
3. Run migrations sequentially from `server/database/migrations/`:
   - `001_order_item_sizes.sql`
   - `002_order_shipping_fields.sql`
   - `003_user_shipping_profile.sql`
   - `004_order_checkout_session.sql`
4. (Optional) Load synthetic seed data for local testing:
   ```bash
   mysql -u <user> -p ykb_clothing < server/database/seed_fake_data.sql
   ```

### 4. Configuration
See [`server/.env.example`](file:///server/.env.example) for all supported configuration flags.
`JWT_SECRET` must be set to a cryptographically secure string of at least 32 characters.

