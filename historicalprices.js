const express = require('express');
const router = express.Router();
const { pool } = require('./db'); // Ensure this path is correct
// const { authenticate } = require('./authentication'); // Temporarily commented out for debugging

// Read historical prices for a specific stock
router.get('/stocks/:stock_id/historical-prices', /* authenticate, */ async (req, res) => {
    const { stock_id } = req.params;

    try {
        const historicalPrices = await pool.query(
            'SELECT * FROM historicalprices WHERE stock_id = $1 ORDER BY date DESC',
            [stock_id]
        );

        if (historicalPrices.rowCount === 0) {
            return res.status(404).json({ error: 'No historical prices found for the given stock ID' });
        }

        res.json(historicalPrices.rows);
    } catch (error) {
        console.error('Error retrieving historical prices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new historical price entry
router.post('/stocks/:stock_id/historical-prices', /* authenticate, */ async (req, res) => {
    const { stock_id } = req.params;
    const { date, open_price, close_price, high_price, low_price, volume } = req.body;

    try {
        const newHistoricalPrice = await pool.query(
            'INSERT INTO historicalprices (stock_id, date, open_price, close_price, high_price, low_price, volume) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [stock_id, date, open_price, close_price, high_price, low_price, volume]
        );

        res.status(201).json(newHistoricalPrice.rows[0]);
    } catch (error) {
        console.error('Error adding historical price:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a historical price entry
router.put('/stocks/:stock_id/historical-prices/:id', /* authenticate, */ async (req, res) => {
    const { stock_id, id } = req.params;
    const { date, open_price, close_price, high_price, low_price, volume } = req.body;

    try {
        const updatedHistoricalPrice = await pool.query(
            'UPDATE historicalprices SET date = $1, open_price = $2, close_price = $3, high_price = $4, low_price = $5, volume = $6 WHERE id = $7 AND stock_id = $8 RETURNING *',
            [date, open_price, close_price, high_price, low_price, volume, id, stock_id]
        );

        if (updatedHistoricalPrice.rowCount === 0) {
            return res.status(404).json({ error: 'Historical price not found' });
        }

        res.json(updatedHistoricalPrice.rows[0]);
    } catch (error) {
        console.error('Error updating historical price:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a historical price entry
router.delete('/stocks/:stock_id/historical-prices/:id', /* authenticate, */ async (req, res) => {
    const { stock_id, id } = req.params;

    try {
        const deletedHistoricalPrice = await pool.query(
            'DELETE FROM historicalprices WHERE id = $1 AND stock_id = $2',
            [id, stock_id]
        );

        if (deletedHistoricalPrice.rowCount === 0) {
            return res.status(404).json({ error: 'Historical price not found' });
        }

        res.status(200).json({ message: 'Historical price deleted successfully' });
    } catch (error) {
        console.error('Error deleting historical price:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;