const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  ...env.db,
  max: 10
});

module.exports = pool;
