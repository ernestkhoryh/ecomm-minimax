const { v4: uuid } = require('uuid');
const slugify = require('slugify');
const pool = require('../config/db');
const { buildPagination } = require('../utils/query');

async function listListings(req, res, next) {
  try {
    const { q, categoryId, minPrice, maxPrice, status = 'published', page, limit } = req.query;
    const pagination = buildPagination(page, limit);

    const where = ['l.status = ?'];
    const params = [status];

    if (q) {
      where.push('MATCH(l.title, l.description, l.brand, l.model) AGAINST(? IN NATURAL LANGUAGE MODE)');
      params.push(q);
    }

    if (categoryId) {
      where.push('l.category_id = ?');
      params.push(categoryId);
    }

    if (minPrice) {
      where.push('l.price >= ?');
      params.push(minPrice);
    }

    if (maxPrice) {
      where.push('l.price <= ?');
      params.push(maxPrice);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT l.*, c.name AS category_name,
       (SELECT url FROM listing_images li WHERE li.listing_id = l.id AND li.is_primary = TRUE LIMIT 1) AS primary_image
       FROM listings l
       LEFT JOIN categories c ON c.id = l.category_id
       ${whereClause}
       ORDER BY l.is_featured DESC, l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pagination.limit, pagination.offset]
    );

    return res.json({ success: true, data: rows, page: pagination.page, limit: pagination.limit });
  } catch (error) {
    return next(error);
  }
}

async function getListingById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT l.*, u.username AS seller_username, u.display_name AS seller_display_name,
       c.name AS category_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       LEFT JOIN categories c ON c.id = l.category_id
       WHERE l.id = ?`,
      [id]
    );

    const listing = rows[0];
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const [images] = await pool.query(
      'SELECT id, url, sort_order, is_primary FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC',
      [id]
    );

    await pool.query('UPDATE listings SET views_count = views_count + 1 WHERE id = ?', [id]);

    return res.json({ success: true, data: { ...listing, images } });
  } catch (error) {
    return next(error);
  }
}

async function createListing(req, res, next) {
  try {
    const {
      title,
      description,
      price,
      categoryId,
      priceType,
      condition,
      brand,
      model,
      locationCity,
      locationState,
      locationCountry,
      offersShipping,
      shippingFee,
      images
    } = req.body;

    if (!title || !description || price == null) {
      return res.status(400).json({ success: false, message: 'title, description and price are required' });
    }

    const id = uuid();
    const slug = `${slugify(title, { lower: true, strict: true })}-${id.slice(0, 8)}`;

    await pool.query(
      `INSERT INTO listings
      (id, seller_id, category_id, title, slug, description, price, price_type, \`condition\`, brand,
       model, location_city, location_state, location_country, offers_shipping, shipping_fee, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NOW())`,
      [
        id,
        req.user.id,
        categoryId || null,
        title,
        slug,
        description,
        price,
        priceType || 'fixed',
        condition || 'good',
        brand || null,
        model || null,
        locationCity || null,
        locationState || null,
        locationCountry || null,
        Boolean(offersShipping),
        shippingFee || null
      ]
    );

    if (Array.isArray(images) && images.length) {
      const imageValues = images.map((image, index) => [
        uuid(),
        id,
        image.url,
        index,
        index === 0
      ]);

      await pool.query(
        'INSERT INTO listing_images (id, listing_id, url, sort_order, is_primary) VALUES ?',
        [imageValues]
      );
    }

    return res.status(201).json({ success: true, data: { id, slug } });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listListings, getListingById, createListing };
