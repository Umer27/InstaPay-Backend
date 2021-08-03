const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/', tokenVerifier.validateFirebaseIdToken, verificationController.verification);

export default router