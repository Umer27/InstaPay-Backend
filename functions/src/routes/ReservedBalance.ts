const express = require('express');
const router = express.Router();
const ReservedBalanceController = require('../controllers/ReservedBalance');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/',tokenVerifier.validateFirebaseIdToken, ReservedBalanceController.ReservedBalance);

export default router