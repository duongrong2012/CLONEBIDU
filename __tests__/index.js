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
const { MongoMemoryServer } = require('mongodb-memory-server');
const { beforeAll, afterEach, afterAll } = require('@jest/globals');

const routes = require('../Routes');
const { errorHandler } = require('../Middlewares');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth-buyer', routes.authBuyerRoutes);
  app.use('/auth-admin', routes.authAdminRoutes);
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
    __mongoServer = await MongoMemoryServer.create();
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
