const express = require('express');
const tradeService = require('../services/tradeService');
const router = express.Router();

router.post('/', tradeService.executeTrade);
// ...other trade management routes

module.exports = router;