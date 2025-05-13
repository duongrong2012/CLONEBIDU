const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const {
  authBuyerRoutes,
  buyerRoutes,
  sellerRoutes,
  authAdminRoutes,
  adminRoutes,
} = require('./Routes');

// Import middlewares
const { errorHandler } = require('./Middlewares');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Routes
app.use('/auth-buyer', authBuyerRoutes);
app.use('/buyer', buyerRoutes);
app.use('/seller', sellerRoutes);
app.use('/auth-admin', authAdminRoutes);
app.use('/admin', adminRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });

// Error handling middleware
app.use(errorHandler);
