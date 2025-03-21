const express = require('express');
const { addReview } = require('../controllers/reviewController');
const router = express.Router();

router.post('/review', addReview);

module.exports = router;