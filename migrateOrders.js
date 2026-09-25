const mongoose = require('mongoose');
const uri = 'mongodb+srv://rabbinur-distributor:Uob22r9VhWgub9mF@cluster0.7mvqmtg.mongodb.net/mimisphere?appName=Cluster0';

async function migrate() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');
    
    const db = mongoose.connection.db;
    const successOrdersColl = db.collection('successorders');
    const ordersColl = db.collection('orders');
    const backupColl = db.collection('successorders_backup');
    
    const successOrders = await successOrdersColl.find({}).toArray();
    console.log('Found ' + successOrders.length + ' success orders.');
    
    if (successOrders.length > 0) {
      // 1. Backup
      await backupColl.deleteMany({});
      await backupColl.insertMany(successOrders);
      console.log('Backed up ' + successOrders.length + ' to successorders_backup.');
      
      // 2. Migrate
      let migrated = 0;
      let skipped = 0;
      for (const order of successOrders) {
        // Find by _id or order_id
        const exists = await ordersColl.findOne({ $or: [{ _id: order._id }, { order_id: order.order_id }] });
        if (!exists) {
          await ordersColl.insertOne(order);
          migrated++;
        } else {
          skipped++;
        }
      }
      console.log('Migration complete. Migrated: ' + migrated + ', Skipped (already exists): ' + skipped);
    } else {
      console.log('No success orders to migrate.');
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
migrate();
