const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../Models/product.model');

// Load environment variables
dotenv.config();

/**
 * Seeder: Ensure legacy Product documents have variant fields initialized as empty arrays
 * - Adds missing fields: variantGroups: [], variantCombinations: []
 * - If fields exist but are not arrays, set them to []
 */
async function updateProductVariantsToEmpty() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Product.updateMany(
      {
        $or: [
          { variantGroups: { $exists: false } },
          { variantCombinations: { $exists: false } },
          { variantGroups: { $not: { $type: 'array' } } },
          { variantCombinations: { $not: { $type: 'array' } } },
        ],
      },
      {
        $set: {
          variantGroups: [],
          variantCombinations: [],
        },
      }
    );

    console.log(`🛠️ Updated documents: ${result.modifiedCount}`);
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

if (require.main === module) {
  updateProductVariantsToEmpty();
}

module.exports = updateProductVariantsToEmpty;
