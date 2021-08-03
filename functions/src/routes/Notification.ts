const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/Notification');
const tokenVerifier = require('../middleware/verifyToken')

router.post('/', tokenVerifier.validateFirebaseIdToken, NotificationController.Notification);

router.post('/test', NotificationController.NotificationTest);

export default router