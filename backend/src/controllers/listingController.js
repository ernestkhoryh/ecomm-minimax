const { v4: uuid } = require('uuid');
const slugify = require('slugify');
const pool = require('../config/db');
const { buildPagination } = require('../utils/query');

async function listListings(req, res, next) {
  try {
    const { q, categoryId, minPrice, maxPrice, status = 'published', page, limit } = req.query;
    const pagination = buildPagination(page, limit);

    const where = [];
    const params = [];

    params.push(status);
    where.push(`l.status = $${params.length}`);

    if (q) {
      params.push(`%${q}%`);
      const qIndex = params.length;
      where.push(
        `(l.title ILIKE $${qIndex} OR l.description ILIKE $${qIndex} OR COALESCE(l.brand, '') ILIKE $${qIndex} OR COALESCE(l.model, '') ILIKE $${qIndex})`
      );
    }

    if (categoryId) {
      params.push(categoryId);
      where.push(`l.category_id = $${params.length}`);
    }

    if (minPrice) {
      params.push(minPrice);
      where.push(`l.price >= $${params.length}`);
    }

    if (maxPrice) {
      params.push(maxPrice);
      where.push(`l.price <= $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(pagination.limit);
    const limitIndex = params.length;
    params.push(pagination.offset);
    const offsetIndex = params.length;

    const result = await pool.query(
      `SELECT l.*, c.name AS category_name,
       (SELECT url FROM listing_images li WHERE li.listing_id = l.id AND li.is_primary = TRUE LIMIT 1) AS primary_image
       FROM listings l
       LEFT JOIN categories c ON c.id = l.category_id
       ${whereClause}
       ORDER BY l.is_featured DESC, l.created_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    return res.json({ success: true, data: result.rows, page: pagination.page, limit: pagination.limit });
  } catch (error) {
    return next(error);
  }
}

async function getListingById(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await pool.query(
      `SELECT l.*, u.username AS seller_username, u.display_name AS seller_display_name,
       c.name AS category_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       LEFT JOIN categories c ON c.id = l.category_id
       WHERE l.id = $1`,
      [id]
    );

    const listing = rows.rows[0];
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const images = await pool.query(
      'SELECT id, url, sort_order, is_primary FROM listing_images WHERE listing_id = $1 ORDER BY sort_order ASC',
      [id]
    );

    await pool.query('UPDATE listings SET views_count = views_count + 1 WHERE id = $1', [id]);

    return res.json({ success: true, data: { ...listing, images: images.rows } });
  } catch (error) {
    return next(error);
  }
}

async function getListingBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const rows = await pool.query(
      `SELECT l.*, u.username AS seller_username, u.display_name AS seller_display_name,
       u.avatar_url AS seller_avatar_url, u.created_at AS seller_created_at,
       c.name AS category_name, c.slug AS category_slug
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       LEFT JOIN categories c ON c.id = l.category_id
       WHERE l.slug = $1`,
      [slug]
    );

    const listing = rows.rows[0];
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const images = await pool.query(
      'SELECT id, url, sort_order, is_primary FROM listing_images WHERE listing_id = $1 ORDER BY sort_order ASC',
      [listing.id]
    );

    await pool.query('UPDATE listings SET views_count = views_count + 1 WHERE id = $1', [listing.id]);

    return res.json({ success: true, data: { ...listing, images: images.rows } });
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
      itemCondition,
      brand,
      model,
      locationCity,
      locationState,
      locationCountry,
      offersShipping,
      shippingFee,
      images,
      status
    } = req.body;

    if (!title || !description || price == null) {
      return res.status(400).json({ success: false, message: 'title, description and price are required' });
    }

    const id = uuid();
    const slug = `${slugify(title, { lower: true, strict: true })}-${id.slice(0, 8)}`;

    await pool.query(
      `INSERT INTO listings
      (id, seller_id, category_id, title, slug, description, price, price_type, item_condition, brand,
       model, location_city, location_state, location_country, offers_shipping, shipping_fee, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        CASE WHEN $17 = 'published' THEN NOW() ELSE NULL END)`,
      [
        id,
        req.user.id,
        categoryId || null,
        title,
        slug,
        description,
        price,
        priceType || 'fixed',
        itemCondition || 'good',
        brand || null,
        model || null,
        locationCity || null,
        locationState || null,
        locationCountry || null,
        Boolean(offersShipping),
        shippingFee || null,
        status || 'published'
      ]
    );

    if (Array.isArray(images) && images.length) {
      const values = [];
      const placeholders = images.map((image, index) => {
        const base = values.length;
        values.push(uuid(), id, image.url, index, index === 0);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
      });

      await pool.query(
        `INSERT INTO listing_images (id, listing_id, url, sort_order, is_primary)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    return res.status(201).json({ success: true, data: { id, slug } });
  } catch (error) {
    return next(error);
  }
}

async function listMyListings(req, res, next) {
  try {
    const rows = await pool.query(
      `SELECT l.*, c.name AS category_name,
       (SELECT url FROM listing_images li WHERE li.listing_id = l.id AND li.is_primary = TRUE LIMIT 1) AS primary_image
       FROM listings l
       LEFT JOIN categories c ON c.id = l.category_id
       WHERE l.seller_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, data: rows.rows });
  } catch (error) {
    return next(error);
  }
}

async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      categoryId,
      priceType,
      itemCondition,
      brand,
      model,
      locationCity,
      locationState,
      locationCountry,
      meetupLocation,
      offersShipping,
      shippingFee,
      shippingDetails,
      status
    } = req.body;

    const existing = await pool.query('SELECT id, seller_id, status FROM listings WHERE id = $1', [id]);
    const row = existing.rows[0];

    if (!row) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (row.seller_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const nextStatus = status || row.status;
    const shouldSetPublishedAt = row.status !== 'published' && nextStatus === 'published';

    await pool.query(
      `UPDATE listings SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       price = COALESCE($4, price),
       category_id = COALESCE($5, category_id),
       price_type = COALESCE($6, price_type),
       item_condition = COALESCE($7, item_condition),
       brand = COALESCE($8, brand),
       model = COALESCE($9, model),
       location_city = COALESCE($10, location_city),
       location_state = COALESCE($11, location_state),
       location_country = COALESCE($12, location_country),
       meetup_location = COALESCE($13, meetup_location),
       offers_shipping = COALESCE($14, offers_shipping),
       shipping_fee = COALESCE($15, shipping_fee),
       shipping_details = COALESCE($16, shipping_details),
       status = COALESCE($17, status),
       published_at = CASE WHEN $18 THEN NOW() ELSE published_at END
       WHERE id = $1`,
      [
        id,
        title || null,
        description || null,
        price ?? null,
        categoryId || null,
        priceType || null,
        itemCondition || null,
        brand || null,
        model || null,
        locationCity || null,
        locationState || null,
        locationCountry || null,
        meetupLocation || null,
        typeof offersShipping === 'boolean' ? offersShipping : null,
        shippingFee ?? null,
        shippingDetails || null,
        status || null,
        shouldSetPublishedAt
      ]
    );

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function deleteListing(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [id]);
    const row = existing.rows[0];

    if (!row) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (row.seller_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await pool.query('DELETE FROM listings WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listListings,
  getListingById,
  getListingBySlug,
  createListing,
  listMyListings,
  updateListing,
  deleteListing
};
