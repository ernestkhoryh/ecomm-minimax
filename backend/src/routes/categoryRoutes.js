const express = require('express');
const { listCategories, createCategory } = require('../controllers/categoryController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', listCategories);
router.post('/', auth(['admin', 'super_admin']), createCategory);

module.exports = router;
