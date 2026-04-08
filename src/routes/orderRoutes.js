const express = require('express');
const { createOrder, getOrders } = require('../controllers/orderController');

const router = express.Router();

router.get('/', getOrders); // for admin / debugging
router.post('/', createOrder);

module.exports = router;
