const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    size: { type: String },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    email: { type: String, required: true },
    name: { type: String, required: true },
    address: {
      line1: { type: String, required: true },
      city: { type: String, required: true },
      postcode: { type: String, required: true },
      country: { type: String, default: 'UK' },
    },
    notes: { type: String },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'roasting', 'shipped', 'cancelled'],
      default: 'pending',
    },
    paymentProvider: {
      type: String,
      enum: ['stripe', 'paypal', 'applepay', 'demo'],
      default: 'demo',
    },
    paymentReference: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
