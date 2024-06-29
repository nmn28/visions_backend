require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const stocksRouter = require('./stocks');
const historicalPricesRouter = require('./historicalprices');
const commentsRouter = require('./comments');
const usersRouter = require('./users');
const { authenticate } = require('./authentication');
const wss = require('./realTimeMarket');

// // Logging the imported routers and middleware for debugging
// console.log('stocksRouter:', stocksRouter);
// console.log('historicalPricesRouter:', historicalPricesRouter);
// console.log('commentsRouter:', commentsRouter);
// console.log('usersRouter:', usersRouter);
// console.log('authenticate:', authenticate);

app.use(express.json());

// Public route (no authentication required)
app.use('/api/stocks', stocksRouter);

// Temporarily removing authenticate from these routes for debugging
app.use('/api/historical-prices', /* authenticate, */ historicalPricesRouter);
app.use('/api/comments', /* authenticate, */ commentsRouter);
app.use('/api/users', usersRouter); // If you've created users.js for handling user-related routes

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});