console.log("comments.js is loaded");

const express = require('express');
const router = express.Router();
const pool = require('./db'); // Import the database connection
const { authenticate } = require('./authentication'); // Corrected import

// POST endpoint to create a new comment
router.post('/comments', authenticate, async (req, res) => {
    const { title, content, user_id, post_id } = req.body;
  
    try {
        const newComment = await pool.query(
            'INSERT INTO Comments (title, content, user_id, post_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, content, user_id, post_id]
        );
        res.status(201).json(newComment.rows[0]);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET endpoint to fetch a single comment by comment_id
router.get('/comments/:comment_id', authenticate, async (req, res) => {
    const { comment_id } = req.params;
  
    try {
        const commentQuery = await pool.query(
            'SELECT * FROM Comments WHERE id = $1',
            [comment_id]
        );
  
        if (commentQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
  
        const comment = commentQuery.rows[0];
  
        res.json(comment);
    } catch (error) {
        console.error('Error fetching comment data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT endpoint to update an existing comment by comment_id
router.put('/comments/:comment_id', authenticate, async (req, res) => {
    const { comment_id } = req.params;
    const { title, content } = req.body;
  
    try {
        const updatedComment = await pool.query(
            'UPDATE Comments SET title = $1, content = $2 WHERE id = $3 RETURNING *',
            [title, content, comment_id]
        );
  
        if (updatedComment.rowCount === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
  
        res.json(updatedComment.rows[0]);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE endpoint to remove a comment by comment_id
router.delete('/comments/:comment_id', authenticate, async (req, res) => {
    const { comment_id } = req.params;
  
    try {
        const deletedComment = await pool.query(
            'DELETE FROM Comments WHERE id = $1',
            [comment_id]
        );
  
        if (deletedComment.rowCount === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
  
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route for replying to a comment
router.post('/comments/reply', authenticate, async (req, res) => {
    const { title, content, user_id, post_id, parent_comment_id } = req.body;

    try {
        // Insert the reply into the Comments table
        const reply = await pool.query(
            'INSERT INTO Comments (title, content, user_id, post_id, parent_comment_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, content, user_id, post_id, parent_comment_id]
        );
        res.status(201).json(reply.rows[0]);
    } catch (error) {
        console.error('Error creating comment reply:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;