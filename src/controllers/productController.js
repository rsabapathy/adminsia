const Product = require('../models/Product');

async function getProducts(req, res, next) {
  try {
    const { category } = req.query;
    const query = { isActive: true }; // 👈 revert to this

    if (category && category !== 'all') {
      query.category = category;
    }

    const products = await Product.find(query).sort({ createdAt: 1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getProductBySlug(req, res, next) {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
      isDeleted: false,
    });
    if (!product) {
      res.status(404);
      return res.json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// simple seed route for dev only
async function seedProducts(req, res, next) {
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.json({ message: 'Products already seeded', count });
    }

    const docs = await Product.insertMany([
      {
        slug: 'solar-dawn-ethiopia',
        name: 'Solar Dawn — Ethiopia',
        label: 'Single origin',
        category: 'single-origin',
        price: 14,
        size: '250g',
        notes: 'Bergamot, jasmine and peach sweetness.',
        image: '/assets/img/product-ethiopia.png',
      },
      {
        slug: 'midnight-ember-espresso',
        name: 'Midnight Ember',
        label: 'Espresso blend',
        category: 'espresso',
        price: 13,
        size: '250g',
        notes: 'Chocolate, roasted hazelnut and syrupy body.',
        image: '/assets/img/product-espresso.png',
      },
      {
        slug: 'moonlight-decaf',
        name: 'Moonlight Decaf',
        label: 'Decaf',
        category: 'decaf',
        price: 13,
        size: '250g',
        notes: 'Swiss water processed with toffee and cocoa notes.',
        image: '/assets/img/product-decaf.png',
      },
      {
        slug: 'la-niebla-colombia',
        name: 'La Niebla — Colombia',
        label: 'Single origin',
        category: 'single-origin',
        price: 14,
        size: '250g',
        notes: 'Honey process with red fruit sweetness.',
        image: '/assets/img/product-sampler.png',
      },
      {
        slug: 'iyarkai-sampler-pack',
        name: 'Iyarkai Sampler Pack',
        label: 'Sampler',
        category: 'sampler',
        price: 18,
        size: '3 × 100g',
        notes: 'Three 100g bags of our current favourites.',
        image: '/assets/img/product-sampler.png',
      },
      {
        slug: 'cold-comet-blend',
        name: 'Cold Comet Blend',
        label: 'Espresso / cold brew',
        category: 'espresso',
        price: 13,
        size: '250g',
        notes: 'Cola, dark chocolate and orange peel complexity.',
        image: '/assets/img/product-espresso.png',
      },
    ]);

    res.json({ message: 'Seeded products', count: docs.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProducts, getProductBySlug, seedProducts };
