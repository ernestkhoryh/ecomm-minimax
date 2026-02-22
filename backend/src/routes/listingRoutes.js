const express = require('express');
const { listListings, getListingById, createListing } = require('../controllers/listingController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', listListings);
router.get('/:id', getListingById);
router.post('/', auth(), createListing);

module.exports = router;
