const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({});

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(404).json({ success: false, message: "Not Allowed" });
  }
  try {
    const decode = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decode;
    next();
  } catch (error) {
    res.status(500).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
