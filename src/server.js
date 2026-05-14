
const Stripe = require('stripe');
const stripeRoutes = require("./routes/stripeRoutes");
const Order = require("./models/Order");
// const stripe = process.env.STRIPE_SECRET_KEY
//   ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
//   : null;
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
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://siacoffee.co.uk';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'dev-secret';

// Connect to DB
connectDB(MONGO_URI);

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(morgan('dev'));

// User auth routes
app.use('/api/auth', authRoutes);

// Stripe webhook (raw body)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Stripe webhook signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata && session.metadata.orderId;

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            status: "paid",
            paymentProvider: "stripe",
            paymentReference: session.id,
          });
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api/stripe", stripeRoutes);
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
  console.log(`🚀 Sia Coffee API running on http://localhost:${PORT}`);
});


// Now, when you create a Stripe Checkout session from your frontend or backend, you can set:

// metadata: {
//   orderId: '<mongo order id>',
// }

// and the webhook will mark that order as paid.

