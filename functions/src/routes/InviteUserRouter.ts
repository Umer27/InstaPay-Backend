const express = require('express');
const router = express.Router();
const InviteUserController = require('../controllers/InviteUser');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/', tokenVerifier.validateFirebaseIdToken, InviteUserController.inviteUser);

router.post('/test', InviteUserController.inviteUserTest);

export default router