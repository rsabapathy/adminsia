const express = require('express');
const { createOrder, getOrders } = require('../controllers/orderController');

const router = express.Router();
const { requireUser } = require("../middleware/authUser");
const Order = require("../models/Order");

router.get('/', getOrders); // for admin / debugging
router.post('/', createOrder);
router.get("/mine", requireUser, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.sub })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
