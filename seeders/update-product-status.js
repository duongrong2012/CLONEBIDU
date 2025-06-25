const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { PRODUCT_STATUS } = require('../Utils/constant');

// Load environment variables
dotenv.config();

/**
 * Seeder to update all existing products to have status = PENDING
 * This is needed after adding the status field to the Product model
 */
async function updateProductStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Import Product model
    const Product = require('../Models/product.model');

    // Find all products that don't have status field or have status as undefined/null
    const productsToUpdate = await Product.find({
      $or: [{ status: { $exists: false } }, { status: null }, { status: undefined }],
    });

    console.log(`📊 Found ${productsToUpdate.length} products that need status update`);

    if (productsToUpdate.length === 0) {
      console.log('✅ All products already have status field. No update needed.');
      return;
    }

    // Update all products to have status = PENDING
    const updateResult = await Product.updateMany(
      {
        $or: [{ status: { $exists: false } }, { status: null }, { status: undefined }],
      },
      {
        $set: {
          status: PRODUCT_STATUS.PENDING,
          rejectedReason: null,
        },
      }
    );

    console.log(`✅ Successfully updated ${updateResult.modifiedCount} products`);
    console.log(`📝 Products updated with status: ${PRODUCT_STATUS.PENDING}`);

    // Verify the update
    const remainingProducts = await Product.find({
      $or: [{ status: { $exists: false } }, { status: null }, { status: undefined }],
    });

    if (remainingProducts.length === 0) {
      console.log('✅ Verification successful: All products now have status field');
    } else {
      console.log(
        `⚠️  Warning: ${remainingProducts.length} products still don't have status field`
      );
    }

    // Show summary of all product statuses
    const statusSummary = await Product.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    console.log('\n📈 Product Status Summary:');
    statusSummary.forEach(item => {
      console.log(`   ${item._id || 'NO_STATUS'}: ${item.count} products`);
    });
  } catch (error) {
    console.error('❌ Error updating product status:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  updateProductStatus();
}

module.exports = updateProductStatus;
