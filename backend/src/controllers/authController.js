const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const pool = require('../config/db');
const env = require('../config/env');

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function register(req, res, next) {
  try {
    const { email, password, username, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username || null]
    );
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Email or username already exists' });
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, username, display_name, role)
       VALUES ($1, $2, $3, $4, $5, 'user')`,
      [id, email, passwordHash, username || null, displayName || null]
    );

    const user = { id, email, role: 'user' };

    return res.status(201).json({
      success: true,
      token: issueToken(user),
      user
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const rows = await pool.query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    const user = rows.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password || '', user.password_hash);

    if (!passwordMatches || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.json({
      success: true,
      token: issueToken(user),
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const rows = await pool.query(
      `SELECT id, email, username, display_name, avatar_url, role, is_active, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    const user = rows.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me };
