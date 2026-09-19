import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL as string);
  const Category = mongoose.model('Category_fix', new mongoose.Schema({}, { strict: false, collection: 'categories' }));
  await Category.updateOne({ slug: 'womens-collection' }, { $set: { order: 1 } });
  await Category.updateOne({ slug: 'mens-fashion' }, { $set: { order: 2 } });
  console.log('Fixed category orders');
  await mongoose.disconnect();
}
run();
