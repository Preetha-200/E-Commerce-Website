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

CREATE TABLE wishlist (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT,
  user_email VARCHAR(255),
  FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT unique_product_user UNIQUE (product_id, user_email)
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE region_currency_mapping (
    region VARCHAR(255) PRIMARY KEY,
    currency VARCHAR(3) NOT NULL
);
INSERT INTO region_currency_mapping (region, currency) VALUES
('United States', 'USD'),
('India', 'INR'),
('United Kingdom', 'GBP'),
('Europe', 'EUR');
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'wishlist';

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantity INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

ALTER TABLE users
ADD COLUMN region VARCHAR(255);
ALTER TABLE users
ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';

UPDATE users
SET currency = (
    CASE region
        WHEN 'United States' THEN 'USD'
        WHEN 'India' THEN 'INR'
        WHEN 'United Kingdom' THEN 'GBP'
        WHEN 'Europe' THEN 'EUR'
        ELSE 'USD' -- Default fallback
    END
);

CREATE TABLE "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

ALTER TABLE users
ADD COLUMN email VARCHAR(255) UNIQUE NOT NULL;


SELECT p.id, p.product_img, p.product_img_s1,  p.product_img_s2,  p.product_img_s3, p.Brand, p.Style, p.Product_Type, p.Color, p.Dial_color, p.Connectivity, p.p_shape, p.Product_Size, p.Material, p.Source, p.p_description, p.p_features ,p.p_category, p.p_price, p.rating, p.rating_count



