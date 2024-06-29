const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // For generating password reset tokens
const { pool } = require('./db');
const Joi = require('joi'); // Import Joi for validation
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const saltRounds = 10;
const jwtSecret = process.env.JWT_KEY;
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const usernameCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});


router.post('/storeContactInfo', authenticate, async (req, res) => {
  const userId = req.user.id;
  const { contact } = req.body;

  try {
      await pool.query('UPDATE users SET contact_info = $1 WHERE id = $2', [contact, userId]);
      res.json({ message: 'Contact information updated successfully' });
  } catch (error) {
      console.error('Error storing contact information:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send verification code via SMS
function sendSMSVerificationCode(to, code) {
  const body = `Your verification code is ${code}`;
  return twilioClient.messages.create({
      body: body,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER
  });
}

// Function to send verification code via Email
function sendEmailVerificationCode(to, code) {
  const message = {
      to: to,
      from: 'your_email@example.com', // Use a verified sender email address
      subject: 'Your Verification Code',
      text: `Your verification code is ${code}`,
      html: `<strong>Your verification code is ${code}</strong>`,
  };

  return sgMail.send(message);
}

// Send verification code endpoint
router.post('/sendVerificationCode', authenticate, async (req, res) => {
  const { contact, method } = req.body;
  const verificationCode = generateVerificationCode();

  try {
      if (method === 'sms') {
          await sendSMSVerificationCode(contact, verificationCode);
      } else if (method === 'email') {
          await sendEmailVerificationCode(contact, verificationCode);
      } else {
          return res.status(400).json({ error: 'Invalid method' });
      }
      res.json({ message: 'Verification code sent successfully' });
  } catch (error) {
      console.error('Error sending verification code:', error);
      res.status(500).json({ error: 'Failed to send verification code' });
  }
});

router.get('/check-username', async (req, res) => {
  const { username } = req.query;

  if (!username) {
      return res.status(400).json({ error: 'Username is required' });
  }

  try {
      const result = await pool.query('SELECT COUNT(*) FROM users WHERE username = $1', [username]);
      const isAvailable = result.rows[0].count === '0';
      res.json({ isAvailable: isAvailable });
  } catch (error) {
      console.error('Error checking username availability:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


// Joi schema for user registration validation
const registrationSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
});


// User registration
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Input validation (simple example, consider a library like joi)
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username;',
      [username, hashedPassword]
    );

    const token = jwt.sign({ userId: newUser.rows[0].id }, jwtSecret);
    res.status(201).json({ token, username: newUser.rows[0].username });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userQuery.rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user.id }, jwtSecret);
      res.json({ token, username: user.username });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Middleware for protected routes
const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).send({ error: 'No token provided' });
  }

  try {
    const data = jwt.verify(token, jwtSecret);
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [data.userId]);
    
    if (user.rows.length === 0) {
      return res.status(404).send({ error: 'User not found' });
    }
    
    req.user = user.rows[0];
    next();
  } catch (error) {
    res.status(401).send({ error: 'Not authorized to access this resource' });
  }
};

// Password reset request
router.post('/password-reset', async (req, res) => {
  const { email } = req.body;
  // Validate email here

  const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userQuery.rows[0];

  if (!user) {
    // You may want to use a more vague message in production
    return res.status(404).json({ error: 'User with that email does not exist' });
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  const tokenExpiration = Date.now() + 3600000; // 1 hour from now

  await pool.query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3', [resetToken, tokenExpiration, user.id]);

  // Here, you would send the resetToken to the user's email, typically via an email service provider

  res.json({ message: 'Password reset token has been sent to your email' });
});

// Password reset (token verification and password update)
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

module.exports = { router, authenticate };