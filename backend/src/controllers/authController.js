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

async function verifyGoogleIdToken(idToken) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    return { error: 'Invalid Google token' };
  }

  const data = await response.json();

  if (!data.sub || !data.email) {
    return { error: 'Invalid Google token payload' };
  }

  if (String(data.email_verified) !== 'true') {
    return { error: 'Google email is not verified' };
  }

  if (env.googleClientId) {
    const allowedClientIds = env.googleClientId
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (allowedClientIds.length > 0 && !allowedClientIds.includes(data.aud)) {
      return { error: 'Google token audience mismatch' };
    }
  }

  return { data };
}

async function generateUniqueUsername(baseValue) {
  const normalized = String(baseValue || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

  const base = normalized || 'user';

  for (let index = 0; index < 25; index += 1) {
    const suffix = index === 0 ? '' : `_${Math.floor(Math.random() * 9000 + 1000)}`;
    const candidate = `${base}${suffix}`.slice(0, 20);
    const existing = await pool.query('SELECT id FROM users WHERE username = $1 LIMIT 1', [candidate]);
    if (!existing.rows[0]) {
      return candidate;
    }
  }

  return `${base.slice(0, 12)}_${Date.now().toString().slice(-6)}`;
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

async function googleLogin(req, res, next) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }

    const verified = await verifyGoogleIdToken(idToken);
    if (verified.error) {
      return res.status(401).json({ success: false, message: verified.error });
    }

    const google = verified.data;

    const existingByGoogleId = await pool.query(
      'SELECT id, email, role, is_active, google_id FROM users WHERE google_id = $1 LIMIT 1',
      [google.sub]
    );

    let user = existingByGoogleId.rows[0];

    if (!user) {
      const existingByEmail = await pool.query(
        'SELECT id, email, role, is_active, google_id FROM users WHERE email = $1 LIMIT 1',
        [google.email]
      );
      user = existingByEmail.rows[0];

      if (user) {
        await pool.query(
          `UPDATE users
           SET google_id = $2,
               email_verified = TRUE,
               display_name = COALESCE(display_name, $3),
               avatar_url = COALESCE(avatar_url, $4),
               last_login_at = NOW()
           WHERE id = $1`,
          [user.id, google.sub, google.name || null, google.picture || null]
        );
      } else {
        const id = uuid();
        const usernameSeed = (google.email || '').split('@')[0] || google.name || 'user';
        const username = await generateUniqueUsername(usernameSeed);

        const created = await pool.query(
          `INSERT INTO users (
            id, email, email_verified, username, display_name, avatar_url, google_id, role, is_active, last_login_at
          )
          VALUES ($1, $2, TRUE, $3, $4, $5, $6, 'user', TRUE, NOW())
          RETURNING id, email, role, is_active`,
          [id, google.email, username, google.name || null, google.picture || null, google.sub]
        );

        user = created.rows[0];
      }
    } else {
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    }

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
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

module.exports = { register, login, googleLogin, me };
