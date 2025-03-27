const paypal = require('@paypal/checkout-server-sdk');

function paypalClient() {
    return new paypal.core.PayPalHttpClient(
        new paypal.core.SandboxEnvironment(
            process.env.PAYPAL_CLIENT_ID,
            process.env.PAYPAL_SECRET
        )
    );
}

async function createPayment(amount) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: { currency_code: 'USD', value: amount }
        }]
    });

    const response = await paypalClient().execute(request);
    return response.result.id;
}

async function capturePayment(orderId) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    const response = await paypalClient().execute(request);
    return response.result;
}

module.exports = { createPayment, capturePayment };