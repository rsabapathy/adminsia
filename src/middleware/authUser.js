const jwt = require("jsonwebtoken");

function requireUser(req, res, next) {

  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = req.cookies?.aurora_token;

  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-jwt-secret");
    req.user = payload;
    next();
  } catch (err) {
    console.error("JWT VERIFY FAILED:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { requireUser };
