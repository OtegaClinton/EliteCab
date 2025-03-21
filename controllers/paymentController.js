const paypalClient = require('../config/paypal');

exports.chargePayment = async (req, res) => {
    try {
        const { amount, currency, source } = req.body;
        const charge = await paypal.charges.create({
            amount,
            currency,
            source,
            description: 'Ride Payment'
        });
        res.json({ success: true, charge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = paypalClient;