const express = require('express');
const router = express.Router();
const getfriendsTransactionController = require('../controllers/getfriendsTransaction');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/',tokenVerifier.validateFirebaseIdToken, getfriendsTransactionController.getfriendsTransaction);

export default router