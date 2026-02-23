const { v4: uuid } = require('uuid');
const slugify = require('slugify');
const pool = require('../config/db');

async function listCategories(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC'
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const id = uuid();
    const slug = slugify(name, { lower: true, strict: true });

    await pool.query(
      `INSERT INTO categories (id, name, slug, description, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, slug, description || null, parentId || null, sortOrder || 0]
    );

    return res.status(201).json({ success: true, data: { id, name, slug } });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listCategories, createCategory };
