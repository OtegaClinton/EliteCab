const axios = require('axios');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const introspection = await axios.post(
      process.env.OAUTH_INTROSPECT_URL,
      new URLSearchParams({ token }), // if required
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );

    if (!introspection.data.active) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = introspection.data; // Optional: add user info to request
    next();
  } catch (err) {
    console.error('OAuth2 validation failed:', err.response?.data || err.message);
    return res.status(401).json({ error: 'Token validation failed' });
  }
};
