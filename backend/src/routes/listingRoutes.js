const express = require('express');
const {
  listListings,
  getListingById,
  getListingBySlug,
  createListing,
  listMyListings,
  updateListing,
  deleteListing
} = require('../controllers/listingController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', listListings);
router.get('/mine', auth(), listMyListings);
router.get('/slug/:slug', getListingBySlug);
router.get('/:id', getListingById);
router.post('/', auth(), createListing);
router.patch('/:id', auth(), updateListing);
router.delete('/:id', auth(), deleteListing);

module.exports = router;
