const express = require('express');
const router = express.Router();

// Simplified route returning an array of stock ideas
router.get('/', (req, res) => {
    // Mock array of stock ideas
    const mockStockIdeas = [
        { id: "1", name: "Stock 1", currentPrice: 100.0 },
        { id: "2", name: "Stock 2", currentPrice: 200.0 },
        // Add more mock data as needed
    ];

    res.json(mockStockIdeas);
});

module.exports = router;