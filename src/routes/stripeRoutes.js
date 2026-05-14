const express = require("express");
const Stripe = require("stripe");
const Order = require("../models/Order");

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", async (req, res, next) => {
  try {
    const {
      name,
      email,
      address,
      notes,
      items,
      userId,
    } = req.body;

    if (!name || !email || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Missing required checkout fields" });
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty || 1),
      0
    );

    const order = await Order.create({
      user: userId || undefined,
      name,
      email,
      address,
      notes,
      items: items.map((item) => ({
        product: item.productId || undefined,
        name: item.name,
        price: Number(item.price),
        size: item.size,
        qty: Number(item.qty || 1),
      })),
      subtotal,
      paymentProvider: "stripe",
      status: "pending",
    });

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          description: item.size || "",
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: Number(item.qty || 1),
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: lineItems,
      metadata: {
        orderId: order._id.toString(),
        userId: userId || "",
      },
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
    });

    order.paymentReference = session.id;
    await order.save();

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;