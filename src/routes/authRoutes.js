const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireUser } = require('../middleware/authUser');

const router = express.Router();

function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
  };
  const secret = process.env.JWT_SECRET || "dev-jwt-secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    const token = signToken(user);

    res.cookie("aurora_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// PUT /api/auth/me
router.put("/me", requireUser, async (req, res) => {
  try {
    const { name, email } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: req.user.sub },
    });

    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.sub,
      {
        name,
        email: email.toLowerCase().trim(),
      },
      { new: true }
    ).select("name email");

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error("Update profile error", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    
    res.cookie("aurora_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Logout route - clears the cookie
router.post("/logout", (req, res) => {
  res.clearCookie("aurora_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.json({ message: "Logged out" });
});

// GET /api/auth/me (requires aurora_token cookie)
router.get('/me', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('name email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error('Me error', err);
    res.status(500).json({ message: 'Failed to load user' });
  }
});

module.exports = router;
