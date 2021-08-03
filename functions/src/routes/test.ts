const express = require('express');
const router = express.Router();
const authController = require('../controllers/test');

router.post('/', authController.testMessages);

export default router