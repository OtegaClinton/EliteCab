const paypal = require('@paypal/checkout-server-sdk');

// Configure PayPal client
function paypalClient() {
    return new paypal.core.PayPalHttpClient(
        new paypal.core.SandboxEnvironment(
            process.env.PAYPAL_CLIENT_ID, 
            process.env.PAYPAL_SECRET
        )
    );
}

module.exports = paypalClient;