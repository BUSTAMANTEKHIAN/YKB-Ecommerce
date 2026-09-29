-- Run once against the existing TiDB/MySQL database before deploying.
-- New nullable fields keep all historical orders readable and unchanged.
ALTER TABLE orders
    ADD COLUMN shipping_name VARCHAR(200) NULL,
    ADD COLUMN shipping_email VARCHAR(254) NULL,
    ADD COLUMN shipping_phone VARCHAR(25) NULL,
    ADD COLUMN shipping_address VARCHAR(500) NULL,
    ADD COLUMN shipping_city VARCHAR(200) NULL,
    ADD COLUMN shipping_postal_code VARCHAR(20) NULL;
