const express = require("express");
const ContactMessage = require("../models/ContactMessage");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { name, email, topic, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      topic,
      message,
    });

    res.status(201).json({
      message: "Message sent successfully.",
      contactMessage,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
