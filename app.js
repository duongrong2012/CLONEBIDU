require('dotenv').config();
require('./dd-trace-init');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./Utils/swagger');

// Import routes
const {
  authBuyerRoutes,
  buyerRoutes,
  authAdminRoutes,
  sellerRoutes,
  paymentRoutes,
  demoRoutes,
} = require('./Routes');
const uploadRoute = require('./Routes/upload.route');
const adminRoutes = require('./Routes/admin.route');

// Import middlewares
const { errorHandler, requestLogger } = require('./Middlewares');
const logger = require('./Utils/logger');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static('public'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
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
app.use('/demo', demoRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info({ message: 'Connected to MongoDB' });
    // Start server
    app.listen(PORT, () => {
      logger.info({ message: 'Server started', port: PORT });
      logger.info({
        message: 'API documentation enabled',
        docs_url: `http://localhost:${PORT}/api-docs`,
      });
    });
  })
  .catch(error => {
    logger.error({
      message: 'MongoDB connection error',
      error_message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  });

// Error handling middleware
app.use(errorHandler);
