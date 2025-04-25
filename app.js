const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authBuyerRoutes = require("./Routes/auth-buyer.route");
const buyerRoutes = require('./Routes/buyer.route');
const sellerRoutes = require('./Routes/seller.route');
const authAdminRoutes = require('./Routes/auth-admin.route');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Routes
app.use('/auth-buyer', authBuyerRoutes);
app.use('/buyer', buyerRoutes);
app.use('/seller', sellerRoutes);
app.use('/auth-admin', authAdminRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors || null;

    res.status(statusCode).json({
        status: 'error',
        code: statusCode,
        message,
        errors,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}); 