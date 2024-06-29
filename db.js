require('dotenv').config();
const { Pool } = require('pg'); // Make sure you import the Pool class

// Configure the database connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

module.exports = pool; // Export the pool for use in other files