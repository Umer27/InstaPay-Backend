const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const validateFirebaseIdToken = require('../middleware/verifyToken');

router.post('/',validateFirebaseIdToken.validateFirebaseIdToken, authController.auth);

export default router