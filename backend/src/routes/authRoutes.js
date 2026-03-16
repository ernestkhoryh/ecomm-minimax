const express = require('express');
const { register, login, googleLogin, me } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', auth(), me);

module.exports = router;
