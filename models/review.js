const express = require('express');
const { addReview } = require('../controllers/rideController');
const router = express.Router();

router.post('/review', addReview);

module.exports = router;