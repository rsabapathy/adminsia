const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    label: { type: String },
    category: {
      type: String,
      enum: ['single-origin', 'espresso', 'decaf', 'sampler'],
      required: true,
    },
    price: { type: Number, required: true },
    size: { type: String, default: '250g' },
    notes: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    stock: { type: Number, default: null },          // null = unlimited
    lowStockThreshold: { type: Number, default: 5 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
