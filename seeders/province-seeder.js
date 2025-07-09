require('dotenv').config();
const mongoose = require('mongoose');
const Province = require('../Models/province.model');
const fs = require('fs');
const path = require('path');

/**
 * Seeder script to import provinces from province.json into MongoDB
 */
async function seedProvinces() {
  try {
    const dataPath = path.join(__dirname, '../JSON/province.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const provincesObj = JSON.parse(rawData);
    const provinces = Object.values(provincesObj);

    await mongoose.connect(process.env.MONGO_URI);
    await Province.deleteMany({});
    await Province.insertMany(provinces);
    console.log('Provinces seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Province seeding failed:', err);
    process.exit(1);
  }
}

seedProvinces();
