const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/Transaction');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/', tokenVerifier.validateFirebaseIdToken, TransactionController.Transaction);

export default router