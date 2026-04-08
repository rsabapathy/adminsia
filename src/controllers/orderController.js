const Order = require('../models/Order');
const Product = require('../models/Product');

async function createOrder(req, res, next) {
  try {
    const { email, name, address, notes, items, paymentProvider = 'demo', userId } = req.body;

    if (!email || !name || !address || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      return res.json({ message: 'Missing required fields' });
    }

    // Validate and build line items
    const productIds = items.map((i) => i.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } });

    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = items.map((item) => {
      const p = item.productId ? productMap.get(String(item.productId)) : null;
      const nameValue = item.name || (p && p.name);
      const priceValue = typeof item.price === 'number' ? item.price : (p && p.price);
      const sizeValue = item.size || (p && p.size);

      if (!nameValue || typeof priceValue !== 'number') {
        throw new Error('Invalid item: missing name or price');
      }

      return {
        product: p ? p._id : undefined,
        name: nameValue,
        price: priceValue,
        size: sizeValue,
        qty: item.qty || 1,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    const order = await Order.create({
      email,
      name,
      address,
      notes,
      items: orderItems,
      subtotal,
      paymentProvider,
      status: 'pending',
    });

    if (userId) {
      orderData.user = userId;
    }

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function getOrders(req, res, next) {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, getOrders };
