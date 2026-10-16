-- Run once against the existing TiDB/MySQL database before deploying this change.
-- Nullable checkout_session_id field allows COD orders and historical orders to remain valid without a PayMongo session.
ALTER TABLE orders
    ADD COLUMN checkout_session_id VARCHAR(255) NULL AFTER payment_status,
    ADD INDEX idx_orders_checkout_session (checkout_session_id);

