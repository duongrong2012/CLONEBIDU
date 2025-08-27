const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Voucher = require('../Models/voucher.model');
const { VOUCHER_TARGET } = require('../Utils/constant');

// Load environment variables
dotenv.config();

/**
 * Seeder to backfill the new `target` field for existing vouchers
 * - Sets target = ORDER_DISCOUNT for all vouchers missing the field
 */
async function updateVoucherTarget() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const filterMissingTarget = {
      $or: [{ target: { $exists: false } }, { target: null }],
    };

    const totalVouchers = await Voucher.countDocuments();
    const missingCount = await Voucher.countDocuments(filterMissingTarget);
    console.log(`📊 Total vouchers: ${totalVouchers}`);
    console.log(`📌 Vouchers missing target: ${missingCount}`);

    if (missingCount === 0) {
      console.log('✅ All vouchers already have target field. No update needed.');
      return;
    }

    const result = await Voucher.updateMany(filterMissingTarget, {
      $set: { target: VOUCHER_TARGET.ORDER_DISCOUNT },
    });

    console.log(
      `✅ Successfully updated ${result.modifiedCount} vouchers with target=${VOUCHER_TARGET.ORDER_DISCOUNT}`
    );

    const remaining = await Voucher.countDocuments(filterMissingTarget);
    if (remaining === 0) {
      console.log('✅ Verification successful: All vouchers now have target field');
    } else {
      console.log(`⚠️  Warning: ${remaining} vouchers still missing target field`);
    }
  } catch (error) {
    console.error('❌ Error updating voucher target:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

if (require.main === module) {
  updateVoucherTarget();
}

module.exports = updateVoucherTarget;
