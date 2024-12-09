const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database successfully!');
});

pool.on('error', (err) => {
  console.error('Error connecting to the database:', err);
});

module.exports = pool;
