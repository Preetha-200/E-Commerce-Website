const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { convertCurrency, getCurrencyFromRegion } = require('./utils');
const app = express();
require('dotenv').config();
const pgSession = require('connect-pg-simple')(session);

// ---------------- Database Configuration ---------------- //

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// ---------------- Middleware ---------------- //
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: 'D11P^2004-april',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    },
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global middleware to access session in all views
app.use((req, res, next) => {
    console.log("Current session:", req.session);
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    res.locals.region = req.session.user ? req.session.user.region : 'USD'; // Set region in res.locals
    next();
});

//------------------------ SEARCH -------------------------//

app.get('/search', async (req, res) => {
    const queryRaw = req.query.query || '';
    const query = queryRaw.toLowerCase().trim();

    const region = req.session.user ? req.session.user.region : 'United States';
    const currency = getCurrencyFromRegion(region);

    let currencySymbol = '$';
    switch (currency) {
        case 'INR': currencySymbol = '₹'; break;
        case 'GBP': currencySymbol = '£'; break;
        case 'EUR': currencySymbol = '€'; break;
        case 'CAD': currencySymbol = 'C$'; break;
        case 'USD': default: currencySymbol = '$'; break;
    }

    try {

        // ===============================
        // 1️⃣ CATEGORY DETECTION
        // ===============================
        const menKeywords = ["men", "man", "mans", "mens", "men's", "men’s"];
        const womenKeywords = ["woman","women", "women's", "woman's", "womens", "womans"];
        const alarmClockKeywords = ["alarm clock", "alarm clocks"];
        const smartWatchKeywords = ["smart watch", "smartwatch", "smart watches", "smartwatches"];
        const wallClockKeywords = ["wall clock", "wall clocks"];

        let detectedCategory = null;

        if (womenKeywords.some(k => query.includes(k))) {
            detectedCategory = " Women’s Watch";
        } else if (menKeywords.some(k => query.includes(k))) {
            detectedCategory = "Men’s Watch";
        } else if (alarmClockKeywords.some(k => query.includes(k))) {
            detectedCategory = "Alarm Clock";
        } else if (smartWatchKeywords.some(k => query.includes(k))) {
            detectedCategory = "Smart Watch";
        } else if (wallClockKeywords.some(k => query.includes(k))) {
            detectedCategory = "Wall Clock";
        } else if (query === "watch" || query === "watches") {
            detectedCategory = "%watch%";
        } else if (query === "clock" || query === "clocks") {
            detectedCategory = "%clock%";
        }

        // ===============================
        // 2️⃣ MATERIAL DETECTION
        // ===============================
        const materialKeywords = ["stainless steel", "gold", "leather", "titanium", "plastic", "silver"];
        const matchedMaterial = materialKeywords.find(material => query.includes(material));

        // ===============================
        // 3️⃣ PRODUCT TYPE DETECTION
        // ===============================
        const analogKeywords = ["analog"];
        const digitalKeywords = ["digital"];
        const smartTypeKeywords = ["smart"];
        const automaticTypeKeywords = ["automatic", "automatics", "auto"];

        let detectedType = null;

        if (analogKeywords.some(k => query.includes(k))) {
            detectedType = "Analog";
        } else if (digitalKeywords.some(k => query.includes(k))) {
            detectedType = "Digital";
        } else if (smartTypeKeywords.some(k => query.includes(k))) {
            detectedType = "Smart";
        } else if (automaticTypeKeywords.some(k => query.includes(k))) {
            detectedType = "Automatic";
        }

        // ===============================
        // 4️⃣ BUILD DYNAMIC SQL
        // ===============================
        let sql = "SELECT * FROM products WHERE 1=1";
        let params = [];
        let paramIndex = 1;

        if (detectedCategory) {
            sql += ` AND p_category ILIKE $${paramIndex}`;
            params.push(detectedCategory.includes('%') ? detectedCategory : detectedCategory);
            paramIndex++;
        }

        if (matchedMaterial) {
            sql += ` AND Material ILIKE $${paramIndex}`;
            params.push(`%${matchedMaterial}%`);
            paramIndex++;
        }

        if (detectedType) {
            sql += ` AND Product_Type ILIKE $${paramIndex}`;
            params.push(`%${detectedType}%`);
            paramIndex++;
        }

        // Fallback if nothing detected
        if (!detectedCategory && !matchedMaterial && !detectedType && query) {
            sql += `
                AND (
                    p_category ILIKE $${paramIndex} OR 
                    p_description ILIKE $${paramIndex} OR 
                    p_features ILIKE $${paramIndex} OR 
                    Material ILIKE $${paramIndex} OR
                    Product_Type ILIKE $${paramIndex} OR  
                    Shape ILIKE $${paramIndex} OR 
                    Source ILIKE $${paramIndex} OR 
                    p_price::text ILIKE $${paramIndex} OR 
                    Product_Size ILIKE $${paramIndex} OR 
                    Connectivity ILIKE $${paramIndex} OR 
                    Dial_Color ILIKE $${paramIndex} OR 
                    Style ILIKE $${paramIndex} OR 
                    Brand ILIKE $${paramIndex}
                )
            `;
            params.push(`%${query}%`);
        }

        // ===============================
        // 5️⃣ EXECUTE QUERY
        // ===============================
        const result = await pool.query(sql, params);

        const products = [];

        for (const product of result.rows) {

            const convertedPrice = convertCurrency(product.p_price, 'USD', currency);

            const userEmail = req.session.user ? req.session.user.email : null;

            let isInWishlist = false;

            if (userEmail) {
                const wishlistCheck = await pool.query(
                    'SELECT 1 FROM wishlist WHERE product_id = $1 AND user_email = $2',
                    [product.id, userEmail]
                );
                isInWishlist = wishlistCheck.rows.length > 0;
            }

            products.push({
                ...product,
                convertedPrice,
                currencySymbol,
                isInWishlist,
                rating: parseFloat(product.rating) || 0,
            });
        }

        console.log("Final SQL:", sql);
        console.log("Params:", params);
        console.log("Products found:", products.length);

        res.render('products', {
            products,
            region,
            query: queryRaw,
            currencySymbol
        });

    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).send('Server Error');
    }
});


// ---------------- Utility Functions ---------------- //
const ensureLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        console.log("User not logged in, redirecting...");
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/signin');
    }
    next();
};

// ---------------- Sign-In Page ---------------- //

app.get('/signin', (req, res) => {
    if (req.session.user) {
        return res.redirect('/account'); // Redirect to account if the user is already logged in
    }
    res.render('signin');
});

app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Query to find the user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            // If no user is found, redirect to the sign-up page
            return res.redirect('/signup');
        }

        const user = result.rows[0];

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send('Invalid password.');
        }

        // Set session data after successful login
        req.session.user = {
            username: user.username,
            userpassword: user.password,
            email: user.email,
            region: user.region
        };

        console.log("Session user data:", req.session.user);
        res.redirect('/account'); // Redirect to the account page
    } catch (err) {
        console.error('Error during sign-in:', err);
        res.status(500).send('Server Error');
    }
});

// ---------------- Sign-Up Page ---------------- //

app.get('/signup', (req, res) => {
    if (req.session.user) {
        return res.redirect('/account');
    }
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, email, password, confirm_password, region } = req.body;

    try {
        if (password !== confirm_password) {
            return res.send('Passwords do not match. Please try again.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user data into the database
        await pool.query(
            `INSERT INTO users (username, email, password, region) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (email) DO NOTHING`,
            [username, email, hashedPassword, region]
        );

        req.session.user = { username, email, region }; // Store user details in session
        res.redirect('/account'); // Redirect to account page
    } catch (err) {
        console.error('Error during sign-up:', err);
        res.status(500).send('Server Error');
    }
});

// ---------------- Account Page ---------------- //

app.get('/account', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/signin'); // Redirect to sign-in if the user is not logged in
    }
    res.render('account', { user: req.session.user });
});

//---------------------- index ----------------------//

app.get('/', async (req, res) => { 
    const region = req.session.user ? req.session.user.region : 'United States';
    const currency = getCurrencyFromRegion(region); // Get currency based on the region

    let currencySymbol = '$';
    switch (currency) {
        case 'INR': currencySymbol = '₹'; break;
        case 'GBP': currencySymbol = '£'; break;
        case 'EUR': currencySymbol = '€'; break;
        case 'CAD': currencySymbol = 'C$'; break;
        case 'USD': default: currencySymbol = '$'; break;
    }

    try {
        const newArrivalsResult = await pool.query('SELECT * FROM products ORDER BY RANDOM() LIMIT 10');
        const newArrivals = newArrivalsResult.rows.map(product => ({
            ...product,
            convertedPrice: convertCurrency(product.p_price, 'USD', currency),
            currencySymbol,
            rating: parseFloat(product.rating) || 0,
        }));

        let recommendedProducts = [];
        if (req.session.user && req.session.user.recentViews && req.session.user.recentViews.length > 0) {
            const recentProductId = req.session.user.recentViews[req.session.user.recentViews.length - 1];
            const categoryResult = await pool.query('SELECT p_category FROM products WHERE p_id = $1', [recentProductId]);
            
            if (categoryResult.rows.length > 0) {
                const category = categoryResult.rows[0].p_category;
                const recommendedResult = await pool.query(
                    'SELECT * FROM products WHERE p_category = $1 AND p_id != $2 ORDER BY RANDOM() LIMIT 10', 
                    [category, recentProductId]
                );

                recommendedProducts = recommendedResult.rows.map(product => ({
                    ...product,
                    convertedPrice: convertCurrency(product.p_price, 'USD', currency),
                    currencySymbol,
                    rating: parseFloat(product.rating) || 0,
                }));
            }
        } 
        if (recommendedProducts.length === 0) {
            const randomResult = await pool.query('SELECT * FROM products ORDER BY RANDOM() LIMIT 10');
            recommendedProducts = randomResult.rows.map(product => ({
                ...product,
                convertedPrice: convertCurrency(product.p_price, 'USD', currency),
                currencySymbol,
                rating: parseFloat(product.rating) || 0,
            }));
        }

        res.render('index', { newArrivals, recommendedProducts, region, currencySymbol });

    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).send('Server Error');
    }
});


// ------------------------ About -------------------------//

app.get('/about',(req, res) => {
    res.render('about');
});

// ------------------------ order -------------------------//

app.get('/my-order',(req, res) => {
    res.render('my-order');
});

//------------------------ Products -------------------------//

app.get('/products', async (req, res) => {
    const region = req.session.user ? req.session.user.region : 'United States';
    const category = req.query.category || ''; 
    const filters = req.query.filters || {};
    const brand = req.query.brand || null;
    const type = req.query.type || null;
    const style = req.query.style || null;
    const color = req.query.color || null;
    const size = req.query.size || null;
    const material = req.query.material || null;
    const sort = req.query.sort || null;
    const price = req.query.price || null;
    const currency = getCurrencyFromRegion(region);

    let currencySymbol = '$';
    switch (currency) {
        case 'INR': currencySymbol = '₹'; break;
        case 'GBP': currencySymbol = '£'; break;
        case 'EUR': currencySymbol = '€'; break;
        case 'CAD': currencySymbol = 'C$'; break;
        case 'USD': default: currencySymbol = '$'; break;
    }

    try {
        // Initialize query and queryParams here
        let query = 'SELECT * FROM products';
        let queryParams = [];
        let conditions = [];

        const category = req.query.category ? req.query.category.split(',') : []; 

        if (category.length > 0) {
            conditions.push(`p_category = ANY($${queryParams.length + 1}::text[])`);
            queryParams.push(category);
        }
        for (const key in filters) {
            if (filters[key] && filters[key].length > 0) {
                const filterValues = filters[key].split(',');  // Split the comma-separated values
        
                // Add the filter condition
                conditions.push(`"${key}" = ANY($${queryParams.length + 1}::text[])`);
                queryParams.push(filterValues);  // Add filter values as a parameter
            }
        }
        if (brand) {
            conditions.push(`Brand = $${queryParams.length + 1}`);
            queryParams.push(brand);
        }
        if (type) {
            console.log('Received type:', type);
            conditions.push(`LOWER(Product_Type) = LOWER($${queryParams.length + 1})`);
            queryParams.push(type.toLowerCase());
        }    
        if (style) {
            conditions.push(`Style = $${queryParams.length + 1}`);
            queryParams.push(style);
        }
        if (color) {
            conditions.push(`Color = $${queryParams.length + 1}`);
            queryParams.push(color);
        }
        if (size) {
            conditions.push(`Product_Size = $${queryParams.length + 1}`);
            queryParams.push(size);
        }
        if (material) {
            conditions.push(`Material = $${queryParams.length + 1}`);
            queryParams.push(material);
        }
        if (price) {
            if (price === 'below-5000') {
                conditions.push(`p_price < $${queryParams.length + 1}`);
                queryParams.push(5000);
            } else if (price === 'above-10000') {
                conditions.push(`p_price > $${queryParams.length + 1}`);
                queryParams.push(10000);
            }
        }

        // Add WHERE clause if there are conditions
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Apply sorting
        if (sort) {
            if (sort === 'low-to-high') {
                query += ' ORDER BY p_price ASC';
            } else if (sort === 'high-to-low') {
                query += ' ORDER BY p_price DESC';
            }
        } else {
            query += ' ORDER BY RANDOM()';
        }

        console.log('Final Query:', query);
        console.log('Query Params:', queryParams);

        const result = await pool.query(query, queryParams);

        const products = [];
        for (const product of result.rows) {
            const convertedPrice = convertCurrency(product.p_price, 'USD', currency);

            const userEmail = req.session.user ? req.session.user.email : null;

            const isInWishlistResult = await pool.query('SELECT * FROM wishlist WHERE product_id = $1 AND user_email = $2', [product.id, userEmail]);
            const isInWishlist = isInWishlistResult.rows.length > 0;

            products.push({
                ...product,
                convertedPrice,
                currencySymbol,
                isInWishlist,
                rating: parseFloat(product.rating) || 0,
            });
        }

        res.render('products', {  products, region, category, brand, type, style, color, size, material, query: req.query });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).send('Server Error');
    }
});

app.get('/filters', async (req, res) => {
    const { category } = req.query;

    if (!category) {
        return res.redirect('/filter-category');
    }

    try {
        const columnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            AND column_name NOT IN ('p_category', 'p_description', 'p_features', 'product_img', 'product_img_s1', 'product_img_s2', 'product_img_s3', 'rating', 'rating_count', 'id', 'p_price')
        `;
        const columnsResult = await pool.query(columnQuery);
        const columns = columnsResult.rows.map(row => row.column_name);

        const filters = {};
        for (const column of columns) {
            const filterQuery = `SELECT DISTINCT "${column}" FROM products WHERE p_category = $1 AND "${column}" IS NOT NULL`;
            const filterValues = await pool.query(filterQuery, [category]);

            if (filterValues.rows.length > 0) {
                filters[column] = filterValues.rows.map(row => row[column]);
            }
        }

        const productCountQuery = `SELECT COUNT(*) FROM products WHERE p_category = $1`;
        const productCountResult = await pool.query(productCountQuery, [category]);
        const totalProducts = productCountResult.rows[0].count;

        res.render('filters', { columns: Object.keys(filters), filters, totalProducts, category });
    } catch (error) {
        console.error('Error loading filters:', error);
        res.status(500).send('Error loading filters');
    }
});

app.get('/filter-category', async (req, res) => {
    try {
        // Fetch distinct categories from your database
        const result = await pool.query('SELECT DISTINCT p_category FROM products');
        const categories = result.rows.map(row => row.p_category);

        // Render the filters-category view and pass the categories
        res.render('filter-category', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Error loading categories');
    }
});

app.post('/get-filtered-count', async (req, res) => {
    const { category, filters } = req.body;

    try {
        let query = `SELECT COUNT(*) FROM products WHERE p_category = $1`;
        let params = [category];
        let index = 2;

        for (const key in filters) {
            if (filters[key].length > 0) {
                query += ` AND "${key}" = ANY($${index}::text[])`;
                params.push(filters[key]);
                index++;
            }
        }

        // Log the query to verify it's correctly formed
        console.log(query, params);

        const countResult = await pool.query(query, params);
        res.json({ count: countResult.rows[0].count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ count: 0 });
    }
});



// ---------------- Product Details ---------------- //

app.get('/product-details', async (req, res) => {
    const productId = parseInt(req.query.id, 10); // Ensure productId is an integer

    // Validate product ID
    if (!productId || isNaN(productId)) {
        return res.status(400).send('Invalid Product ID');
    }

    if (!req.session.user) {
        return res.redirect('/signin');
    }

    const userEmail = req.session.user.email;
    const region = req.session.user ? req.session.user.region : 'United States';
    const currency = getCurrencyFromRegion(region);

    let currencySymbol = '$';
    switch (currency) {
        case 'INR': currencySymbol = '₹'; break;
        case 'GBP': currencySymbol = '£'; break;
        case 'EUR': currencySymbol = '€'; break;
        case 'CAD': currencySymbol = 'C$'; break;
        case 'USD': default: currencySymbol = '$'; break;
    }
    try {
        // Fetch the current product details
        const productResult = await pool.query(
            'SELECT id, product_img, product_img_s1, product_img_s2, product_img_s3, Brand, Style, Product_Type, Color, Dial_Color, Connectivity, Shape, Product_Size, Material, Source, p_description, p_features, p_category, p_price, rating, rating_count FROM products WHERE id = $1',
            [productId]
        );

        if (productResult.rows.length === 0) {
            return res.status(404).send('Product not found');
        }

        const product = productResult.rows[0];

        // Convert the product price based on the user's region
        const convertedPrice = convertCurrency(product.p_price, 'USD', currency);

        // Check if the product is in the wishlist
        const wishlistResult = await pool.query(
            'SELECT product_id FROM wishlist WHERE product_id = $1 AND user_email = $2',
            [productId, userEmail]
        );
        const isInWishlist = wishlistResult.rows.length > 0;

        // Fetch similar products
        const similarProductsResult = await pool.query(
            `SELECT id, product_img, product_img_s1, product_img_s2, product_img_s3, Brand, Style, Product_Type, Color, Dial_Color, Connectivity, Shape, Product_Size, Material, Source, p_description, p_features, p_category, p_price, rating, rating_count FROM products WHERE p_category = $1 AND id != $2 LIMIT 10`,
            [product.p_category, productId]
        );

        // Ensure up to 10 products are returned
        let similarProducts = similarProductsResult.rows.map(product => ({
            ...product,
            isInWishlist: false, // Initial assumption; adjust if needed
            convertedPrice: convertCurrency(product.p_price, 'USD', currency), // Convert price
        }));

        // Fetch additional products if less than 10 are retrieved
        if (similarProducts.length < 10) {
            const additionalProductsResult = await pool.query(
                `SELECT id, product_img, product_img_s1, product_img_s2, product_img_s3, Brand, Style, Product_Type, Color, Dial_Color, Connectivity, Shape, Product_Size, Material, Source, p_description, p_features, p_category, p_price, rating, rating_count FROM products WHERE id != $1 LIMIT $2`,
                [productId, 10 - similarProducts.length]
            );

            const additionalProducts = additionalProductsResult.rows.map(product => ({
                ...product,
                isInWishlist: false, // Initial assumption; adjust if needed
                convertedPrice: convertCurrency(product.p_price, 'USD', currency), // Convert price
            }));

            // Combine the similar products and additional products
            similarProducts = [...similarProducts, ...additionalProducts];
        }

        // Fetch recently viewed products
        let recentlyViewedProducts = [];
        if (req.session.recentlyViewed && req.session.recentlyViewed.length > 0) {
            const recentlyViewedIds = req.session.recentlyViewed.slice(-8); // Limit to last 5 viewed products
            const recentResults = await pool.query(
                'SELECT id, product_img, product_img_s1, product_img_s2, product_img_s3, Brand, Style, Product_Type, Color, Dial_Color, Connectivity, Shape, Product_Size, Material, Source, p_description, p_features, p_category, p_price, rating, rating_count FROM products WHERE id = ANY($1) LIMIT 8',
                [recentlyViewedIds]
            );
            recentlyViewedProducts = recentResults.rows.map(product => ({
                ...product,
                isInWishlist: wishlistResult.rows.some(wishlistproduct => wishlistproduct.product_id === product.id), // Check wishlist
                convertedPrice: convertCurrency(product.p_price, 'USD', currency), // Convert price
            }));
        }

        // Add current product to recently viewed (ensure no duplicates)
        req.session.recentlyViewed = req.session.recentlyViewed || [];
        if (!req.session.recentlyViewed.includes(productId)) {
            req.session.recentlyViewed.push(productId);
        }

        // Pass data to the template
        res.render('product-details', {
            product: { ...product, convertedPrice: convertedPrice || product.p_price },
            isInWishlist,
            similarProducts,
            recentlyViewedProducts,
            currencySymbol,
        });
    } catch (err) {
        console.error('Error fetching product details:', err);
        res.status(500).send('Server Error');
    }
});

// ---------------- Cart ---------------- //

app.post('/add-to-cart', (req, res) => {
    const { productId } = req.body;

    if (!req.session.cart) req.session.cart = [];

    const existingProduct = req.session.cart.find(item => item.productId == productId);

    if (existingProduct) {
        existingProduct.quantity += 1;
        return res.redirect('/cart');
    }

    pool.query('SELECT * FROM products WHERE id = $1', [productId], (err, result) => {
        if (err || result.rows.length === 0) {
            console.error(err || 'Product not found');
            return res.status(404).send('Product not found');
        }

        const product = result.rows[0];
        req.session.cart.push({
            productId: product.id,
            productBrand: product.Brand,
            productFeature: product.p_features,
            productPrice: product.p_price,
            product_img: product.product_img,
            quantity: 1, // Set default quantity to 1
        });

        res.redirect('/cart');
    });
});

app.post('/cart/update-quantity', (req, res) => {
    const { productId, quantity } = req.body;

    if (req.session.cart) {
        const product = req.session.cart.find(item => item.productId == productId);
        if (product) {
            const parsedQuantity = parseInt(quantity, 10);
            if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
                product.quantity = parsedQuantity; // Update the quantity in the cart
            }
        }
    }

    res.redirect('/cart'); // Redirect back to the cart page
});

app.get('/cart', async (req, res) => {
    const region = req.session.user ? req.session.user.region : 'United States';
    const currency = getCurrencyFromRegion(region);

    let currencySymbol = '$';
    switch (currency) {
        case 'INR': currencySymbol = '₹'; break;
        case 'GBP': currencySymbol = '£'; break;
        case 'EUR': currencySymbol = '€'; break;
        case 'CAD': currencySymbol = 'C$'; break;
        case 'USD': default: currencySymbol = '$'; break;
    }

    const cart = req.session.cart || [];
    const convertedCart = cart.map(product => {
        const originalPrice = product.productPrice || 0;
        const convertedPrice = convertCurrency(originalPrice, 'USD', currency);

        return {
            ...product,
            convertedPrice,
            totalPrice: convertedPrice * product.quantity,
            currencySymbol,
        };
    });

    let similarProducts = [];
    if (cart.length > 0) {
        const productIds = cart.map(product => product.productId);
        const productCategory = cart[0].productCategory; // Assume same category for simplicity

        console.log('Product IDs:', productIds); // Log the product IDs
        console.log('Product Category:', productCategory); // Log the product category

        // Query to find similar products by category
        const query = `
            SELECT * FROM products
            WHERE p_category = $1 AND id NOT IN (SELECT unnest($2::int[]))
            ORDER BY RANDOM()
            LIMIT 10;
        `;
        const result = await pool.query(query, [productCategory, productIds]);

        if (result.rows.length > 0) {
            // Apply currency conversion to each similar product
            similarProducts = result.rows.map(product => {
                const originalPrice = product.p_price || 0;
                const convertedPrice = convertCurrency(originalPrice, 'USD', currency);

                return {
                    ...product,
                    convertedPrice,
                    currencySymbol,
                };
            });
        } else {
            // If no similar products, fallback to random products
            const randomQuery = 'SELECT * FROM products ORDER BY RANDOM() LIMIT 7';
            const randomResult = await pool.query(randomQuery);

            // Apply currency conversion to each random product
            similarProducts = randomResult.rows.map(product => {
                const originalPrice = product.p_price || 0;
                const convertedPrice = convertCurrency(originalPrice, 'USD', currency);

                return {
                    ...product,
                    convertedPrice,
                    currencySymbol,
                };
            });
        }

    } else {
        // If no products in the cart, display 10 random products
        const randomQuery = 'SELECT * FROM products ORDER BY RANDOM() LIMIT 7';
        const randomResult = await pool.query(randomQuery);

        // Apply currency conversion to each random product
        similarProducts = randomResult.rows.map(product => {
            const originalPrice = product.p_price || 0;
            const convertedPrice = convertCurrency(originalPrice, 'USD', currency);

            return {
                ...product,
                convertedPrice,
                currencySymbol,
            };
        });
    }

    console.log('Similar or Random Products:', similarProducts); // Log final similar or random products

    const message = req.session.message || null;
    req.session.message = null; // Clear the message after displaying

    res.render('cart', { cart: convertedCart, currencySymbol, message, similarProducts });
});

app.post('/cart/remove', (req, res) => {
    console.log('Product ID to remove:', req.body.productId);
    const { productId } = req.body;

    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(product => product.productId != productId); // Match the exact property name
    }

    res.redirect('/cart');
});

//----------------- Wishlist ------------------//

app.get('/wishlist', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/signin'); // Redirect to sign-in if not logged in
    }
    const userEmail = req.session.user.email; // Get the user's email from session
    const region = req.session.user.region || 'United States';
    const currency = getCurrencyFromRegion(region);
    let currencySymbol = '$';
    switch (currency) {
        case 'INR': currencySymbol = '₹'; break;
        case 'GBP': currencySymbol = '£'; break;
        case 'EUR': currencySymbol = '€'; break;
        case 'CAD': currencySymbol = 'C$'; break;
        case 'USD': default: currencySymbol = '$'; break;
    }
    try {
        const result = await pool.query(`
            SELECT p.id, p.product_img, p.product_img_s1, p.product_img_s2, p.product_img_s3, p.Brand, p.Style, p.Product_Type, p.Color, p.Dial_Color, 
                   p.Connectivity, p.Shape, p.Product_Size, p.Material, p.Source, p.p_description, p.p_features, p.p_category, p.p_price, 
                   p.rating, p.rating_count, w.user_email AS isInWishlist
            FROM products p
            JOIN wishlist w ON p.id = w.product_id
            WHERE w.user_email = $1`, [userEmail]);
        const products = result.rows.map(product => {
            const convertedPrice = convertCurrency(product.p_price, 'USD', currency);
            return {
                ...product,
                convertedPrice,
                currencySymbol,
                isInWishlist: true, // Mark products as in wishlist
            };
        });
        res.render('wishlist', { products }); // Render the wishlist page with the products
    } catch (err) {
        console.error('Error fetching wishlist:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/toggle-wishlist', async (req, res) => {
    const { productId, isInWishlist } = req.body;
    const userEmail = req.session.user.email;
    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }
    try {
        if (isInWishlist) {
            await pool.query('DELETE FROM wishlist WHERE product_id = $1 AND user_email = $2', [productId, userEmail]);
            return res.json({ success: true, message: 'Product removed from wishlist' });
        } else {
            await pool.query('INSERT INTO wishlist (product_id, user_email) VALUES ($1, $2)', [productId, userEmail]);
            return res.json({ success: true, message: 'Product added to wishlist' });
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});


// ------------------BUY NOW------------------//

function getCurrencySymbol(currency) {
    switch (currency) {
        case 'INR': return '₹';
        case 'GBP': return '£';
        case 'EUR': return '€';
        case 'CAD': return 'C$';
        case 'USD': default: return '$';
    }
}

app.post('/order-confirmation', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/signin');
    }

    const { productId, productName, productFeature, productImage, productPrice, productRating } = req.body;
    const region = req.session.user.region;
    const currency = getCurrencyFromRegion(region);
    const deliveryCharge = convertCurrency(20, 'USD', currency);
    const totalAmount = Math.round(parseFloat(productPrice) + deliveryCharge);

    // Calculate delivery date (7 days from today)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    const formattedDeliveryDate = deliveryDate.toDateString(); // Example format: "Mon Feb 12 2025"

    res.render('order-confirmation', {
        productId,
        productName,
        productFeature,
        productImage,
        productPrice,
        productRating,
        deliveryCharge,
        totalAmount,
        currencySymbol: getCurrencySymbol(currency),
        deliveryDate: formattedDeliveryDate
    });
});

app.post('/payment', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/signin');
    }

    const { totalAmount } = req.body;
    const region = req.session.user.region;
    const currency = getCurrencyFromRegion(region);

    res.render('payment', {
        totalAmount,
        currencySymbol: getCurrencySymbol(currency)
    });
});

app.post('/place-order', (req, res) => {
    const { paymentMethod, cardNumber, upiId } = req.body;
    if (!paymentMethod) {
        return res.redirect('/payment');
    }
    res.render('order-success', { message: 'Order placed successfully!' });
});

// -------------------- LOG OUT -------------------//
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
});

// ---------------- Server Setup ---------------- //
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
