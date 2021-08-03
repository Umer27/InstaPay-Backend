const express = require('express');
const router = express.Router();
const verifyCodeController = require('../controllers/verifyCode');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/', tokenVerifier.validateFirebaseIdToken, verifyCodeController.verifyCode);

export default router