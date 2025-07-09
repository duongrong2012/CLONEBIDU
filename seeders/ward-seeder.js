require('dotenv').config();
const mongoose = require('mongoose');
const Ward = require('../Models/ward.model');
const fs = require('fs');
const path = require('path');

/**
 * Seeder script to import wards from ward.json into MongoDB
 */
async function seedWards() {
  try {
    const dataPath = path.join(__dirname, '../JSON/ward.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const wardsObj = JSON.parse(rawData);
    const wards = Object.values(wardsObj);

    await mongoose.connect(process.env.MONGO_URI);
    await Ward.deleteMany({});
    await Ward.insertMany(wards);
    console.log('Wards seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Ward seeding failed:', err);
    process.exit(1);
  }
}

seedWards();
