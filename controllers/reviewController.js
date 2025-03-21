const Review = require('../models/review');

exports.addReview = async (req, res) => {
    try {
        const { rideId, userId, rating, comment } = req.body;
        const review = new Review({ rideId, userId, rating, comment });
        await review.save();
        res.json({ success: true, review });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};