-- Run once against the existing TiDB/MySQL database before deploying this change.
-- This preserves all historical orders; their size remains NULL.
ALTER TABLE order_items ADD COLUMN size VARCHAR(20) NULL AFTER product_name;
