const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('./db');
const { authenticate } = require('./authentication');
const Joi = require('joi');

const router = express.Router();

const saltRounds = 10;
const jwtSecret = process.env.JWT_KEY;

// User Registration
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    // Check if user already exists
    const existingUserQuery = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUserQuery.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username;',
            [username, email, hashedPassword]
        );
        
        const token = jwt.sign({ userId: newUser.rows[0].id }, process.env.JWT_KEY);
        res.status(201).json({ token, username: newUser.rows[0].username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Password Reset Request
router.post('/password-reset', async (req, res) => {
    const { email } = req.body;
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userQuery.rows[0];

    if (!user) {
        return res.status(404).json({ error: 'User with that email does not exist' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const tokenExpiration = Date.now() + 3600000; // 1 hour from now

    await pool.query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3', [resetToken, tokenExpiration, user.id]);
    // Send reset token via email (implementation depends on your email service)

    res.json({ message: 'Password reset token has been sent to your email' });
});

// Password Reset (Token Verification and Password Update)
router.post('/password-reset/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const userQuery = await pool.query('SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2', [token, Date.now()]);
    const user = userQuery.rows[0];

    if (!user) {
        return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await pool.query('UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', [hashedPassword, user.id]);

    res.json({ message: 'Your password has been updated' });
});

// Fetch user profile
router.get('/profile', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
        const userProfile = await pool.query('SELECT username, bio, profile_picture_url FROM users WHERE id = $1', [userId]);
        if (userProfile.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(userProfile.rows[0]);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { bio, profilePictureUrl } = req.body;

    // Define Joi schema for profile update validation
    const schema = Joi.object({
        bio: Joi.string().max(500), // example limit of 500 characters
        profilePictureUrl: Joi.string().uri().max(2048) // example max URI length
    });

    // Validate request data
    const { error, value } = schema.validate({ bio, profilePictureUrl });
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        await pool.query('UPDATE users SET bio = $1, profile_picture_url = $2 WHERE id = $3', [value.bio, value.profilePictureUrl, userId]);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;