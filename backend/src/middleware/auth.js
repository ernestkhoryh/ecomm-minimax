const jwt = require('jsonwebtoken');
const env = require('../config/env');

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = jwt.verify(token, env.jwtSecret);
      req.user = payload;

      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  };
}

module.exports = auth;
