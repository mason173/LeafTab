const jwt = require('jsonwebtoken');

const createAuthHelpers = ({ secretKey, adminApiKey }) => {
  const isAdminRequest = (req) => {
    if (!adminApiKey) return false;
    const key = req.headers['x-admin-key'];
    if (typeof key !== 'string') return false;
    return key === adminApiKey;
  };

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, secretKey, (err, user) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  return {
    isAdminRequest,
    authenticateToken,
  };
};

module.exports = {
  createAuthHelpers,
};
