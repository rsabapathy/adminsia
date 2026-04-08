
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;
const bodyParser = require('body-parser');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const path = require('path');
const authRoutes = require('./routes/authRoutes');


const app = express();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aurora_roast';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'dev-secret';

// Connect to DB
connectDB(MONGO_URI);

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(morgan('dev'));

// User auth routes
app.use('/api/auth', authRoutes);

// Stripe webhook (raw body)
app.post(
  '/webhooks/stripe',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // You decide: either create an order here, or
      // store orderId in session.metadata.orderId and update existing order
      const orderId = session.metadata && session.metadata.orderId;
      if (orderId) {
        const Order = require('./models/Order');
        await Order.findByIdAndUpdate(orderId, {
          status: 'paid',
          paymentProvider: 'stripe',
          paymentReference: session.id,
        });
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());

// Session for admin login
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Healthcheck
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok', timestamp: new Date().toISOString() });
// });

// API routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


// Admin routes (HTML, with login)
app.use('/admin', adminRoutes);

// Error handlers (API)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Iyarkai Roast API running on http://localhost:${PORT}`);
});


// Now, when you create a Stripe Checkout session from your frontend or backend, you can set:

// metadata: {
//   orderId: '<mongo order id>',
// }

// and the webhook will mark that order as paid.

