const express = require('express');
const router = express.Router();
const pool = require('./db'); // Import the database connection
const { authenticate } = require('./authentication'); // Assuming you've placed the middleware in authentication.js

// Define the route handler for creating an investment
router.post('/investments', async (req, res) => {
    // Extract data from the request body (e.g., amount, user_id, comment_id)
    const { amount, user_id, comment_id } = req.body;

    // Begin a transaction to ensure data integrity
    try {
        await pool.query('BEGIN');

        // Insert the investment into the CommentInvestments table
        const investmentResult = await pool.query(
            'INSERT INTO CommentInvestments (amount, user_id, comment_id) VALUES ($1, $2, $3) RETURNING *',
            [amount, user_id, comment_id]
        );

        // Update the comment's current value with the new investment
        const updateCommentValue = await pool.query(
            'UPDATE Comments SET current_value = current_value + $1 WHERE id = $2 RETURNING *',
            [amount, comment_id]
        );

        // Commit the transaction
        await pool.query('COMMIT');

        res.json({
            investment: investmentResult.rows[0],
            comment: updateCommentValue.rows[0]
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error creating investment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;