import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import config from './app/config';
import User from './app/modules/users/user.model';

async function createAdmin() {
  try {
    if (!config.database_url) {
      throw new Error('DATABASE_URL is not defined in .env');
    }
    await mongoose.connect(config.database_url as string);
    console.log('Connected to MongoDB');

    const usersToCreate = [
      {
        name: 'Muktar',
        email: 'muktar@mimisphere.com',
        password: '12345678',
        role: 'ADMIN',
        isVerified: true,
      },
      {
        name: 'Moderator',
        email: 'moderator@mimisphere.com',
        password: '12345678',
        role: 'ADMIN', // Set as ADMIN so they have full dashboard & API access
        isVerified: true,
      },
    ];

    for (const userData of usersToCreate) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        existingUser.name = userData.name;
        existingUser.password = hashedPassword;
        existingUser.role = userData.role as any;
        existingUser.isVerified = userData.isVerified;
        await existingUser.save();
        console.log(`✅ User updated: ${userData.email} (${userData.role})`);
      } else {
        const newUser = await User.create({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role as any,
          isVerified: userData.isVerified,
        });
        console.log(`✅ User created: ${userData.email} (${userData.role})`);
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
