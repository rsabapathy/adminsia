const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { requireAdmin } = require('../middleware/authAdmin');

const router = express.Router();
const AdminUser = require('../models/AdminUser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
});

router.use(express.urlencoded({ extended: false }));

// ---------- Auth routes ----------

router.get('/login', (req, res) => {
  const error = req.query.error ? 'Invalid credentials' : '';
  res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sia Coffee Admin • Login</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 2rem; background: #f6f2ec; color: #2b2620; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
      .card { background: #fff; border-radius: 0.85rem; padding: 1.5rem 1.75rem; box-shadow: 0 10px 25px rgba(0,0,0,0.08); width: 100%; max-width: 360px; }
      label { display: block; font-size: 0.85rem; margin-bottom: 0.25rem; }
      input { width: 100%; padding: 0.4rem 0.5rem; border-radius: 0.4rem; border: 1px solid #ddcdb8; font-size: 0.9rem; margin-bottom: 0.75rem; }
      button { width: 100%; border-radius: 999px; border: none; padding: 0.5rem 0.75rem; background: #7a5f46; color: #fff; font-size: 0.9rem; cursor: pointer; }
      h1 { font-size: 1.3rem; margin-bottom: 0.75rem; }
      .error { color: #b83232; font-size: 0.8rem; margin-bottom: 0.5rem; }
      .hint { font-size: 0.75rem; color: #7a6b5c; margin-top: 0.75rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Sia Coffee Admin</h1>
      ${error ? `<div class="error">${error}</div>` : ''}
      <form method="POST" action="/admin/login">
        <label for="user">Username</label>
        <input id="user" name="username" autocomplete="username" />
        <label for="pass">Password</label>
        <input id="pass" name="password" type="password" autocomplete="current-password" />
        <button type="submit">Sign in</button>
      </form>
      <p class="hint">Credentials are set via <code>ADMIN_USER</code> and <code>ADMIN_PASS</code> env vars (dev-only).</p>
    </div>
  </body>
</html>`);
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const email = (username || '').toLowerCase().trim();

    const user = await AdminUser.findOne({ email });
    if (!user) {
      return res.redirect('/admin/login?error=1');
    }

    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) {
      return res.redirect('/admin/login?error=1');
    }

    req.session.isAdmin = true;
    req.session.adminRole = user.role;
    req.session.adminEmail = user.email;

    return res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Admin login error', err);
    return res.redirect('/admin/login?error=1');
  }
});

router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await AdminUser.findOne({ email: (email || '').toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role, email: user.email },
      process.env.JWT_SECRET || 'dev-jwt-secret',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});


// router.post('/login', (req, res) => {
//   const adminUser = process.env.ADMIN_USER || 'admin';
//   const adminPass = process.env.ADMIN_PASS || 'changeme123';

//   const { username, password } = req.body || {};

//   if (username === adminUser && password === adminPass) {
//     req.session.isAdmin = true;
//     return res.redirect('/admin/dashboard');
//   }

//   return res.redirect('/admin/login?error=1');
// });

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// ---------- Dashboard ----------

router.get('/', requireAdmin, (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', requireAdmin, async (req, res, next) => {
  try {
    const [productCount, orderCount] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
    ]);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({ createdAt: { $gte: sevenDaysAgo } });

    const byDay = {};
    recentOrders.forEach((o) => {
      const key = o.createdAt.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + o.subtotal;
    });

    const labels = Object.keys(byDay).sort();
    const data = labels.map((d) => byDay[d]);

    res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sia Coffee Admin • Dashboard</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 1.5rem; background: #f6f2ec; color: #2b2620; }
      header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
      nav a { margin-right: 1rem; text-decoration: none; color: #4b3b2a; }
      nav a.active { font-weight: 600; }
      .card { background: #fff; border-radius: 0.85rem; padding: 1rem 1.25rem; box-shadow: 0 10px 25px rgba(0,0,0,0.06); max-width: 640px; }
      .metric { font-size: 0.95rem; margin-bottom: 0.4rem; }
      .metric strong { font-size: 1.3rem; margin-right: 0.25rem; }
      form.logout { margin: 0; display: inline; }
      form.logout button { border: none; background: transparent; color: #7a5f46; cursor: pointer; font-size: 0.85rem; text-decoration: underline; }
    </style>
  </head>
  <body>
    <header>
      <h1>Sia Coffee Roast • Admin</h1>
      <nav>
        <a href="/admin/dashboard" class="active">Dashboard</a>
        <a href="/admin/products">Products</a>
        <a href="/admin/orders">Orders</a>
        <form method="POST" action="/admin/logout" class="logout">
          <button type="submit">Logout</button>
        </form>
      </nav>
    </header>
    <main>
      <div class="card">
        <h2>Overview</h2>
        <p class="metric"><strong>${productCount}</strong> products in catalogue</p>
        <p class="metric"><strong>${orderCount}</strong> orders stored</p>
        <p style="font-size: 0.85rem; color: #7a6b5c; margin-top: 0.75rem;">
          This is a lightweight HTML admin for quick dev checks. Add real auth + HTTPS before using anything like this in production.
        </p>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <canvas id="ordersChart" width="400" height="160"></canvas>
      <script>
        const labels = ${JSON.stringify(labels)};
        const data = ${JSON.stringify(data)};
        const ctx = document.getElementById('ordersChart').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Revenue (last 7 days, £)',
              data,
            }]
          },
        });
      </script>
    </main>
  </body>
</html>`);
  } catch (err) {
    next(err);
  }
});

// ---------- Product CRUD ----------

// List products with actions
router.get('/products', requireAdmin, async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: 1 });
    const rows = products
      .map(
        (p) => `<tr>
          <td>${p._id}</td>
          <td>${p.name}</td>
          <td>${p.slug}</td>
          <td>${p.category}</td>
          <td>£${p.price}</td>
          <td>${p.size}</td>
          <td>${p.isActive ? 'Yes' : 'No'}</td>
          <td>
            <a href="/admin/products/${p._id}/edit">Edit</a>
            <form method="POST" action="/admin/products/${p._id}/delete" style="display:inline;" onsubmit="return confirm('Delete this product?');">
              <button type="submit" style="border:none;background:none;color:#b83232;cursor:pointer;font-size:0.8rem;margin-left:0.25rem;">Delete</button>
            </form>
          </td>
        </tr>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sia Coffee Admin • Products</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 1.5rem; background: #f6f2ec; color: #2b2620; }
      header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
      nav a { margin-right: 1rem; text-decoration: none; color: #4b3b2a; }
      nav a.active { font-weight: 600; }
      table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 0.85rem; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); font-size: 0.85rem; }
      th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee3d2; text-align: left; vertical-align: top; }
      th { background: #f0e2cf; }
      tr:last-child td { border-bottom: none; }
      .hint { font-size: 0.8rem; color: #7a6b5c; margin-top: 0.5rem; }
      form.logout { margin: 0; display: inline; }
      form.logout button { border: none; background: transparent; color: #7a5f46; cursor: pointer; font-size: 0.85rem; text-decoration: underline; }
      .top-actions { margin-bottom: 0.75rem; display:flex; justify-content: flex-end; }
      .btn-small { display:inline-block; padding:0.35rem 0.7rem; border-radius:999px; background:#7a5f46; color:#fff; text-decoration:none; font-size:0.8rem; }
    </style>
  </head>
  <body>
    <header>
      <h1>Sia Coffee Roast • Admin</h1>
      <nav>
        <a href="/admin/dashboard">Dashboard</a>
        <a href="/admin/products" class="active">Products</a>
        <a href="/admin/orders">Orders</a>
        <form method="POST" action="/admin/logout" class="logout">
          <button type="submit">Logout</button>
        </form>
      </nav>
    </header>
    <main>
      <div class="top-actions">
        <a href="/admin/products/new" class="btn-small">+ New product</a>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Slug</th>
            <th>Category</th>
            <th>Price</th>
            <th>Size</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p class="hint">Edit, add or delete products for your shop. Deleting is permanent.</p>
    </main>
  </body>
</html>`);
  } catch (err) {
    next(err);
  }
});

// New product form
router.get('/products/new', requireAdmin, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sia Coffee Admin • New Product</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 1.5rem; background: #f6f2ec; color: #2b2620; }
      header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
      nav a { margin-right: 1rem; text-decoration: none; color: #4b3b2a; }
      nav a.active { font-weight: 600; }
      .card { background: #fff; border-radius: 0.85rem; padding: 1rem 1.25rem; box-shadow: 0 10px 25px rgba(0,0,0,0.06); max-width: 640px; }
      label { display:block; font-size:0.85rem; margin-bottom:0.15rem; }
      input, textarea, select { width:100%; padding:0.4rem 0.5rem; border-radius:0.4rem; border:1px solid #ddcdb8; font-size:0.9rem; margin-bottom:0.6rem; }
      textarea { min-height: 80px; }
      .actions { display:flex; gap:0.5rem; margin-top:0.5rem; }
      .btn { border-radius:999px; border:none; padding:0.5rem 0.9rem; background:#7a5f46; color:#fff; font-size:0.9rem; cursor:pointer; }
      .btn-secondary { border-radius:999px; border:1px solid #c9b49a; padding:0.5rem 0.9rem; background:#fff; color:#4b3b2a; font-size:0.9rem; text-decoration:none; display:inline-flex; align-items:center; }
      form.logout { margin: 0; display:inline; }
      form.logout button { border: none; background: transparent; color: #7a5f46; cursor: pointer; font-size: 0.85rem; text-decoration: underline; }
    </style>
  </head>
  <body>
    <header>
      <h1>Sia Coffee Roast • Admin</h1>
      <nav>
        <a href="/admin/dashboard">Dashboard</a>
        <a href="/admin/products" class="active">Products</a>
        <a href="/admin/orders">Orders</a>
        <form method="POST" action="/admin/logout" class="logout">
          <button type="submit">Logout</button>
        </form>
      </nav>
    </header>
    <main>
      <div class="card">
        <h2>New product</h2>
        <form method="POST" action="/admin/products/new" enctype="multipart/form-data">
          <label for="name">Name</label>
          <input id="name" name="name" required />

          <label for="slug">Slug (URL-friendly, e.g. solar-dawn-ethiopia)</label>
          <input id="slug" name="slug" required />

          <label for="label">Label (short description)</label>
          <input id="label" name="label" />

          <label for="category">Category</label>
          <select id="category" name="category" required>
            <option value="single-origin">single-origin</option>
            <option value="espresso">espresso</option>
            <option value="decaf">decaf</option>
            <option value="sampler">sampler</option>
          </select>

          <label for="price">Price (e.g. 13.5)</label>
          <input id="price" name="price" type="number" step="0.01" required />

          <label for="size">Size (e.g. 250g)</label>
          <input id="size" name="size" value="250g" />

          <label for="notes">Notes</label>
          <textarea id="notes" name="notes"></textarea>

          <label for="image">Image path (e.g. /assets/img/product-espresso.png)</label>
          <input id="image" name="image" />

          <label>
            <input type="checkbox" name="isActive" checked />
            Active (show in shop)
          </label>
          
          <label for="imageFile">Upload image (optional)</label>
          <input id="imageFile" name="imageFile" type="file" accept="image/*" />

          <label for="stock">Stock (leave blank for unlimited)</label>
          <input id="stock" name="stock" type="number" min="0" />

          <div class="actions">
            <button type="submit" class="btn">Create product</button>
            <a href="/admin/products" class="btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </main>
  </body>
</html>`);
});

// Handle new product creation
router.post('/products/new', requireAdmin, upload.single('imageFile'), async (req, res, next) => {
  try {
    const { name, slug, label, category, price, size, notes, image, isActive, stock } = req.body;
    const parsedStock = stock === '' || stock === undefined ? null : parseInt(stock, 10);

    let imagePath = image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const product = new Product({
      name,
      slug,
      label,
      category,
      price: parseFloat(price),
      size: size || '250g',
      notes,
      image: imagePath,
      isActive: !!isActive,
      stock: parsedStock, 
    });

    await product.save();
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});



// Edit product form
router.get('/products/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) {
      return res.redirect('/admin/products');
    }

    const checked = p.isActive ? 'checked' : '';
    const options = ['single-origin', 'espresso', 'decaf', 'sampler']
      .map(
        (c) =>
          `<option value="${c}" ${p.category === c ? 'selected' : ''}>${c}</option>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sia Coffee Admin • Edit Product</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 1.5rem; background: #f6f2ec; color: #2b2620; }
      header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
      nav a { margin-right: 1rem; text-decoration: none; color: #4b3b2a; }
      nav a.active { font-weight: 600; }
      .card { background: #fff; border-radius: 0.85rem; padding: 1rem 1.25rem; box-shadow: 0 10px 25px rgba(0,0,0,0.06); max-width: 640px; }
      label { display:block; font-size:0.85rem; margin-bottom:0.15rem; }
      input, textarea, select { width:100%; padding:0.4rem 0.5rem; border-radius:0.4rem; border:1px solid #ddcdb8; font-size:0.9rem; margin-bottom:0.6rem; }
      textarea { min-height: 80px; }
      .actions { display:flex; gap:0.5rem; margin-top:0.5rem; }
      .btn { border-radius:999px; border:none; padding:0.5rem 0.9rem; background:#7a5f46; color:#fff; font-size:0.9rem; cursor:pointer; }
      .btn-secondary { border-radius:999px; border:1px solid #c9b49a; padding:0.5rem 0.9rem; background:#fff; color:#4b3b2a; font-size:0.9rem; text-decoration:none; display:inline-flex; align-items:center; }
      form.logout { margin: 0; display:inline; }
      form.logout button { border: none; background: transparent; color: #7a5f46; cursor: pointer; font-size: 0.85rem; text-decoration: underline; }
    </style>
  </head>
  <body>
    <header>
      <h1>Sia Coffee Roast • Admin</h1>
      <nav>
        <a href="/admin/dashboard">Dashboard</a>
        <a href="/admin/products" class="active">Products</a>
        <a href="/admin/orders">Orders</a>
        <form method="POST" action="/admin/logout" class="logout">
          <button type="submit">Logout</button>
        </form>
      </nav>
    </header>
    <main>
      <div class="card">
        <h2>Edit product</h2>
        <form method="POST" action="/admin/products/${p._id}/edit" enctype="multipart/form-data">
          <label for="name">Name</label>
          <input id="name" name="name" value="${p.name}" required />

          <label for="slug">Slug</label>
          <input id="slug" name="slug" value="${p.slug}" required />

          <label for="label">Label</label>
          <input id="label" name="label" value="${p.label || ''}" />

          <label for="category">Category</label>
          <select id="category" name="category" required>
            ${options}
          </select>

          <label for="price">Price</label>
          <input id="price" name="price" type="number" step="0.01" value="${p.price}" required />

          <label for="size">Size</label>
          <input id="size" name="size" value="${p.size || ''}" />

          <label for="notes">Notes</label>
          <textarea id="notes" name="notes">${p.notes || ''}</textarea>

          <label for="image">Image path</label>
          <input id="image" name="image" value="${p.image || ''}" />

          <label>
            <input type="checkbox" name="isActive" ${checked} />
            Active (show in shop)
          </label>

          <label for="imageFile">Upload new image (optional)</label>
          <input id="imageFile" name="imageFile" type="file" accept="image/*" />
          
          <label for="stock">Stock</label>
          <input id="stock" name="stock" type="number" min="0" value="${p.stock ?? ''}" />

          <div class="actions">
            <button type="submit" class="btn">Save changes</button>
            <a href="/admin/products" class="btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </main>
  </body>
</html>`);
  } catch (err) {
    next(err);
  }
});

// Handle product update
router.post('/products/:id/edit', requireAdmin, upload.single('imageFile'), async (req, res, next) => {
  try {
    const { name, slug, label, category, price, size, notes, image, isActive, stock } = req.body;
    const parsedStock = stock === '' || stock === undefined ? null : parseInt(stock, 10);

    const update = {
      name,
      slug,
      label,
      category,
      price: parseFloat(price),
      size: size || '250g',
      notes,
      isActive: !!isActive,
      stock: parsedStock, 
    };

    if (req.file) {
      update.image = `/uploads/${req.file.filename}`;
    } else if (image) {
      update.image = image;
    }

    await Product.findByIdAndUpdate(req.params.id, update, { runValidators: true });

    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});


// Handle product delete
router.post('/products/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, {
      isActive: false,
      isDeleted: true,
    });
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});

// ---------- Orders list (read-only) ----------
router.post('/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.id, { status });
    res.redirect(`/admin/orders/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});


router.get('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const o = await Order.findById(req.params.id).populate('items.product');
    if (!o) return res.redirect('/admin/orders');

    const statusOptions = ['pending', 'paid', 'roasting', 'shipped', 'cancelled']
      .map(
        (s) =>
          `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
      )
      .join('');

    const itemsRows = o.items
      .map(
        (it) => `<tr>
          <td>${it.name}</td>
          <td>${it.size || ''}</td>
          <td>${it.qty}</td>
          <td>£${it.price}</td>
          <td>£${it.price * it.qty}</td>
        </tr>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Order ${o._id}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 1.5rem; background: #f6f2ec; color: #2b2620; }
      header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
      nav a { margin-right: 1rem; text-decoration: none; color: #4b3b2a; }
      nav a.active { font-weight: 600; }
      .card { background: #fff; border-radius: 0.85rem; padding: 1rem 1.25rem; box-shadow: 0 10px 25px rgba(0,0,0,0.06); max-width: 860px; }
      table { border-collapse: collapse; width: 100%; font-size:0.85rem; margin-top:0.75rem; }
      th, td { padding: 0.45rem 0.6rem; border-bottom: 1px solid #eee3d2; text-align:left; }
      th { background:#f0e2cf; }
      .meta { font-size:0.9rem; margin-bottom:0.5rem; }
      label { display:block; font-size:0.8rem; margin-bottom:0.15rem; }
      select { padding:0.3rem 0.4rem; border-radius:0.4rem; border:1px solid #ddcdb8; font-size:0.9rem; }
      .actions { margin-top:0.6rem; }
      .btn { border-radius:999px; border:none; padding:0.4rem 0.8rem; background:#7a5f46; color:#fff; font-size:0.85rem; cursor:pointer; }
    </style>
  </head>
  <body>
    <header>
      <h1>Aurora Roast • Admin</h1>
      <nav>
        <a href="/admin/dashboard">Dashboard</a>
        <a href="/admin/products">Products</a>
        <a href="/admin/orders" class="active">Orders</a>
        <form method="POST" action="/admin/logout" style="display:inline;">
          <button type="submit" style="border:none;background:transparent;color:#7a5f46;cursor:pointer;font-size:0.85rem;text-decoration:underline;">Logout</button>
        </form>
      </nav>
    </header>
    <main>
      <div class="card">
        <h2>Order ${o._id}</h2>
        <div class="meta">
          <div><strong>Name:</strong> ${o.name}</div>
          <div><strong>Email:</strong> ${o.email}</div>
          <div><strong>Status:</strong> ${o.status}</div>
          <div><strong>Payment:</strong> ${o.paymentProvider}</div>
          <div><strong>Subtotal:</strong> £${o.subtotal}</div>
        </div>

        <form method="POST" action="/admin/orders/${o._id}/status">
          <label for="status">Update status</label>
          <select id="status" name="status">${statusOptions}</select>
          <div class="actions">
            <button type="submit" class="btn">Save status</button>
          </div>
        </form>

        <h3>Items</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>
    </main>
  </body>
</html>`);
  } catch (err) {
    next(err);
  }
});


router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    const rows = orders
      .map(
        (o) => `<tr>
          <td>${o._id}</td>
          <td>${o.name}</td>
          <td>${o.email}</td>
          <td>${o.status}</td>
          <td>${o.paymentProvider}</td>
          <td>£${o.subtotal}</td>
          <td>${o.createdAt.toISOString().slice(0, 10)}</td>
          <td><a href="/admin/orders/${o._id}">Edit</a></td>
        </tr>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sia Coffee Admin • Orders</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 1.5rem; background: #f6f2ec; color: #2b2620; }
      header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
      nav a { margin-right: 1rem; text-decoration: none; color: #4b3b2a; }
      nav a.active { font-weight: 600; }
      table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 0.85rem; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); font-size: 0.85rem; }
      th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee3d2; text-align: left; }
      th { background: #f0e2cf; }
      tr:last-child td { border-bottom: none; }
      .hint { font-size: 0.8rem; color: #7a6b5c; margin-top: 0.5rem; }
      form.logout { margin: 0; display:inline; }
      form.logout button { border: none; background: transparent; color: #7a5f46; cursor: pointer; font-size: 0.85rem; text-decoration: underline; }
    </style>
  </head>
  <body>
    <header>
      <h1>Sia Coffee Roast • Admin</h1>
      <nav>
        <a href="/admin/dashboard">Dashboard</a>
        <a href="/admin/products">Products</a>
        <a href="/admin/orders" class="active">Orders</a>
        <form method="POST" action="/admin/logout" class="logout">
          <button type="submit">Logout</button>
        </form>
      </nav>
    </header>
    <main>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Subtotal</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p class="hint">Demo-only admin. Add proper authentication & HTTPS before using in production.</p>
    </main>
  </body>
</html>`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;


