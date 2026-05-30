-- ==========================
-- PRODUCTS TABLE
-- ==========================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_img VARCHAR(255),
    product_img_s1 VARCHAR(255),
    product_img_s2 VARCHAR(255),
    product_img_s3 VARCHAR(255),
    Brand VARCHAR(255),
    Style VARCHAR(255),
    Product_Type VARCHAR(255),
    Color VARCHAR(255),
    Dial_color VARCHAR(255),
    Connectivity VARCHAR(255),
    Shape VARCHAR(255),
    Product_Size VARCHAR(255),
    Material VARCHAR(255),
    Source VARCHAR(255),
    p_description TEXT,
    p_features TEXT,
    p_category VARCHAR(255),
    p_price INT NOT NULL,
    rating DECIMAL(3,2) DEFAULT 4.0,
    rating_count INT DEFAULT 0
);

-- ==========================
-- USERS TABLE
-- ==========================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50),
    email VARCHAR(255) UNIQUE NOT NULL,
    region VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================
-- WISHLIST TABLE
-- ==========================
CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT,
    user_email VARCHAR(255),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT unique_product_user UNIQUE (product_id, user_email)
);

-- ==========================
-- REGION-CURRENCY TABLE
-- ==========================
CREATE TABLE region_currency_mapping (
    region VARCHAR(255) PRIMARY KEY,
    currency VARCHAR(3) NOT NULL
);

-- ==========================
-- REGION-CURRENCY DATA
-- ==========================
INSERT INTO region_currency_mapping (region, currency)
VALUES
('United States', 'USD'),
('India', 'INR'),
('United Kingdom', 'GBP'),
('Europe', 'EUR');

-- ==========================
-- ORDERS TABLE
-- ==========================
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantity INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending'
);

-- ==========================
-- UPDATE EXISTING USERS
-- ==========================
UPDATE users
SET currency =
    CASE region
        WHEN 'United States' THEN 'USD'
        WHEN 'India' THEN 'INR'
        WHEN 'United Kingdom' THEN 'GBP'
        WHEN 'Europe' THEN 'EUR'
        ELSE 'USD'
    END;

-- ==========================
-- SESSION TABLE
-- ==========================
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL
);

ALTER TABLE "session"
ADD CONSTRAINT "session_pkey"
PRIMARY KEY ("sid");

CREATE INDEX "IDX_session_expire"
ON "session" ("expire");