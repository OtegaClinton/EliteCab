const paypal = require('@paypal/checkout-server-sdk');
require('dotenv').config();

const env = process.env.PAYPAL_MODE === 'sandbox'
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

const paypalClient = new paypal.core.PayPalHttpClient(env);

module.exports = paypalClient;
// This code initializes the PayPal SDK with the appropriate environment (sandbox or live) based on the PAYPAL_MODE environment variable.
// It uses the client ID and secret from the environment variables to create a PayPal client instance.
