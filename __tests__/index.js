/* eslint-env jest */
/**
 * Shared test utilities for API tests.
 * - createTestApp(): build an Express app with mounted routes and middlewares
 * - setupInMemoryMongo(): register Jest hooks to run MongoDB Memory Server
 * - clearDatabase(): utility to wipe collections
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { beforeAll, afterEach, afterAll } = require('@jest/globals');

const routes = require('../Routes');
const { errorHandler } = require('../Middlewares');
const uploadRoute = require('../Routes/upload.route');

/**
 * Create an in-memory Express app for tests.
 * - By default mounts only auth routes (fast startup).
 * - You can enable other route groups via options.
 * @param {{ mountAuth?: boolean, mountBuyer?: boolean, mountAdmin?: boolean, mountUpload?: boolean, mountPayments?: boolean }} [options]
 */
function createTestApp(options = {}) {
  const {
    mountAuth = true,
    mountBuyer = false,
    mountAdmin = false,
    mountUpload = false,
    mountPayments = false,
  } = options;
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  if (mountAuth) {
    app.use('/auth-buyer', routes.authBuyerRoutes);
    app.use('/auth-admin', routes.authAdminRoutes);
  }
  if (mountBuyer) {
    app.use('/buyer', routes.buyerRoutes);
  }
  if (mountAdmin) {
    app.use('/admin', routes.adminRoutes);
  }
  if (mountUpload) {
    app.use('/api/upload', uploadRoute);
  }
  if (mountPayments) {
    app.use('/payments', routes.paymentRoutes);
  }
  app.use(errorHandler);
  return app;
}

async function clearDatabase() {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (const col of collections) {
      await col.deleteMany({});
    }
  }
}

function setupInMemoryMongo() {
  let __mongoServer;
  beforeAll(async () => {
    // Use a replica set to support transactions (required by Product rating service)
    __mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    const uri = __mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (__mongoServer) {
      await __mongoServer.stop();
    }
  });
}

module.exports = {
  createTestApp,
  setupInMemoryMongo,
  clearDatabase,
};
