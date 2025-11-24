const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./Utils/swagger');

// Load environment variables
dotenv.config();

// Import routes
const {
  authBuyerRoutes,
  buyerRoutes,
  authAdminRoutes,
  sellerRoutes,
  paymentRoutes,
} = require('./Routes');
const uploadRoute = require('./Routes/upload.route');
const adminRoutes = require('./Routes/admin.route');

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

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/auth-buyer', authBuyerRoutes);
app.use('/buyer', buyerRoutes);
app.use('/auth-admin', authAdminRoutes);
app.use('/api/upload', uploadRoute);
app.use('/seller', sellerRoutes);
app.use('/admin', adminRoutes);
app.use('/payments', paymentRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });

// Error handling middleware
app.use(errorHandler);
