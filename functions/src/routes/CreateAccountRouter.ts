const express = require('express');
const router = express.Router();
const CreateAccountController = require('../controllers/CreateAccount');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/', tokenVerifier.validateFirebaseIdToken, CreateAccountController.createAccount);

router.post('/test', CreateAccountController.createAccountTest);

export default router