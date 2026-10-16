-- ==============================================================================
-- YKB Clothing Development Seed Data (Safe, Synthetic Test Records)
-- All passwords are: Password123!
-- Bcrypt Hash: $2b$10$OlG3PtWtw0BB20dAB9eKJe1mAdmZrpjQwcUUDI8Ht3L0el3ySMMD.
-- ==============================================================================

-- Test Accounts
INSERT INTO `users` (`id`, `fullname`, `email`, `password`, `role`, `phone`, `address`, `city`, `postal_code`, `created_at`) VALUES
(1, 'Demo Owner', 'owner@ykbdemo.local', '$2b$10$OlG3PtWtw0BB20dAB9eKJe1mAdmZrpjQwcUUDI8Ht3L0el3ySMMD.', 'owner', '+639170000001', '123 Fashion Blvd', 'Makati City', '1200', '2026-01-01 00:00:00'),
(2, 'Demo Admin', 'admin@ykbdemo.local', '$2b$10$OlG3PtWtw0BB20dAB9eKJe1mAdmZrpjQwcUUDI8Ht3L0el3ySMMD.', 'admin', '+639170000002', '456 Urban Ave', 'Taguig City', '1630', '2026-01-01 00:00:00'),
(3, 'Demo Customer', 'customer@ykbdemo.local', '$2b$10$OlG3PtWtw0BB20dAB9eKJe1mAdmZrpjQwcUUDI8Ht3L0el3ySMMD.', 'user', '+639170000003', '789 Streetwear St', 'Quezon City', '1100', '2026-01-01 00:00:00')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- Sample Products
INSERT INTO `products` (`id`, `name`, `brand`, `category`, `description`, `price`, `stock`, `image`, `created_at`) VALUES
(1, 'Cartoon Astronaut T-shirt', 'Adidas', 'Shirt', 'Premium Cotton Shirt', 780.00, 20, 'images/products/p1.jpg', '2026-01-01 00:00:00'),
(2, 'DBTK Trippy Shirt', 'DBTK', 'Shirt', 'Streetwear Shirt', 1250.00, 15, 'images/products/p2.jpg', '2026-01-01 00:00:00'),
(3, 'Nike Vintage Hoodie', 'Nike', 'Hoodie', 'Red Vintage Streetwear Hoodie', 450.00, 10, 'images/products/p4.webp', '2026-01-01 00:00:00'),
(4, 'Sweater For Women', 'Nike', 'Women', 'Premium sweatshirt for women', 1299.00, 12, 'images/products/n4.jpg', '2026-01-01 00:00:00'),
(5, 'Magic 8-Ball & Dice Charm Keychain', 'Accessories', 'Accessories', 'Silver-tone bag charm with miniature 8-ball and star pendant', 280.00, 30, 'images/products/p1.jpg', '2026-01-01 00:00:00')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

