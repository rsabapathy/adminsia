require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');

async function run() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aurora_roast';
  await connectDB(MONGO_URI);

  console.log('Clearing existing demo orders...');
  await Order.deleteMany({});

  const products = await Product.find({}).sort({ createdAt: 1 });
  if (!products.length) {
    console.log('No products found. Seed products first with GET /api/products/seed or create some manually.');
    process.exit(0);
  }

  const findBySlug = (slug) => products.find((p) => p.slug === slug);

  const solar = findBySlug('solar-dawn-ethiopia') || products[0];
  const ember = findBySlug('midnight-ember-espresso') || products[1] || products[0];
  const sampler = findBySlug('aurora-sampler-pack') || products[2] || products[0];

  const demoOrders = [
    {
      email: 'jess@example.com',
      name: 'Jess Example',
      address: {
        line1: '123 Brew Street',
        city: 'London',
        postcode: 'E1 2AB',
        country: 'UK',
      },
      notes: 'If I am not home, leave with neighbour.',
      paymentProvider: 'demo',
      status: 'paid',
      items: [
        {
          product: solar._id,
          name: solar.name,
          price: solar.price,
          size: solar.size,
          qty: 2,
        },
        {
          product: ember._id,
          name: ember.name,
          price: ember.price,
          size: ember.size,
          qty: 1,
        },
      ],
    },
    {
      email: 'mario@cafebravo.co.uk',
      name: 'Cafe Bravo',
      address: {
        line1: '45 Market Lane',
        city: 'Bristol',
        postcode: 'BS1 5AA',
        country: 'UK',
      },
      notes: 'Wholesale order for the bar, please roast slightly darker.',
      paymentProvider: 'demo',
      status: 'roasting',
      items: [
        {
          product: sampler._id,
          name: sampler.name,
          price: sampler.price,
          size: sampler.size,
          qty: 3,
        },
      ],
    },
  ];

  for (const o of demoOrders) {
    o.subtotal = o.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  const created = await Order.insertMany(demoOrders);
  console.log(`Inserted ${created.length} demo orders.`);
  await mongoose.connection.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
