-- Run once against the existing TiDB/MySQL database before deploying.
-- Nullable profile fields let existing accounts complete their address later.
ALTER TABLE users
    ADD COLUMN phone VARCHAR(25) NULL,
    ADD COLUMN address VARCHAR(500) NULL,
    ADD COLUMN city VARCHAR(200) NULL,
    ADD COLUMN postal_code VARCHAR(20) NULL;
