require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const AdminUser = require('../src/models/AdminUser');

async function run() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aurora_roast';
  await connectDB(MONGO_URI);

  const email = process.env.ADMIN_USER_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_USER_PASSWORD || 'changeme123';

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    console.log('Admin user already exists:', email);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await AdminUser.create({
      email,
      passwordHash,
      role: 'superadmin',
    });
    console.log('Created admin user:', user.email);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
