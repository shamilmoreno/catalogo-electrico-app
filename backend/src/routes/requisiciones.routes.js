const express = require('express');
const { pool } = require('../config/db');
const { requirePerm } = require('../middleware/auth');

const router = express.Router();

// GET /api/requisiciones - Listar requisiciones guardadas con sus ítems y precio referencial
router.get('/', async (req, res) => {
  try {
    const reqResult = await pool.query(
      'SELECT * FROM requisiciones ORDER BY created_at DESC'
    );
    const itemsResult = await pool.query(
      `SELECT ri.*, m.precio_referencia
       FROM requisicion_items ri
       LEFT JOIN materiales m ON m.id = ri.material_id
       ORDER BY ri.id ASC`
    );

    const itemsByReq = {};
    for (const item of itemsResult.rows) {
      if (!itemsByReq[item.requisicion_id]) {
        itemsByReq[item.requisicion_id] = [];
      }
      itemsByReq[item.requisicion_id].push({
        id: item.id,
        material_id: item.material_id,
        title: item.titulo,
        category: item.categoria,
        unidad: item.unidad,
        cantidad: Number(item.cantidad),
        precio_referencia: item.precio_referencia != null ? Number(item.precio_referencia) : null,
        nota_tecnica: item.nota_tecnica || '',
      });
    }

    const data = reqResult.rows.map((r) => ({
      ...r,
      items: itemsByReq[r.id] || [],
    }));

    res.json(data);
  } catch (error) {
    console.error('Error al obtener requisiciones de PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudieron consultar las requisiciones en PostgreSQL.',
      details: error.message,
    });
  }
});

// POST /api/requisiciones - Guardar nueva requisición en PostgreSQL
router.post('/', requirePerm('puede_computos'), async (req, res) => {
  const {
    proyecto,
    solicitante = '',
    ubicacion = '',
    nivel_tension = '13.8 kV / BT',
    observaciones = '',
    items = [],
  } = req.body;

  if (!proyecto || !proyecto.trim()) {
    return res.status(400).json({
      error: 'El nombre del proyecto u obra es obligatorio.',
    });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'La requisición debe contener al menos un material.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const year = new Date().getFullYear();
    const maxRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 'REQ-\\d{4}-(\\d+)$') AS INTEGER)), 0) AS max_num
       FROM requisiciones
       WHERE codigo LIKE $1`,
      [`REQ-${year}-%`]
    );
    const nextNum = (Number(maxRes.rows[0]?.max_num) || 0) + 1;
    const codigo = `REQ-${year}-${String(nextNum).padStart(3, '0')}`;

    const reqInsert = await client.query(
      `INSERT INTO requisiciones (codigo, proyecto, solicitante, ubicacion, nivel_tension, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        codigo,
        proyecto.trim(),
        solicitante.trim(),
        ubicacion.trim(),
        nivel_tension.trim(),
        observaciones.trim(),
      ]
    );

    const createdReq = reqInsert.rows[0];
    const insertedItems = [];

    for (const item of items) {
      const itemRes = await client.query(
        `INSERT INTO requisicion_items
           (requisicion_id, material_id, titulo, categoria, unidad, cantidad, nota_tecnica)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          createdReq.id,
          item.material_id || item.id || null,
          item.title || item.titulo,
          item.category || item.categoria,
          item.unidad || 'PZA',
          Number(item.cantidad) || 1,
          (item.nota_tecnica || '').trim(),
        ]
      );
      const row = itemRes.rows[0];
      insertedItems.push({
        id: row.id,
        material_id: row.material_id,
        title: row.titulo,
        category: row.categoria,
        unidad: row.unidad,
        cantidad: Number(row.cantidad),
        precio_referencia: item.precio_referencia ?? null,
        nota_tecnica: row.nota_tecnica || '',
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: `Requisición ${codigo} guardada exitosamente en PostgreSQL.`,
      requisicion: {
        ...createdReq,
        items: insertedItems,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar requisición en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo guardar la requisición en PostgreSQL.',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

// PUT /api/requisiciones/:id - Actualizar una requisición existente
router.put('/:id', requirePerm('puede_computos'), async (req, res) => {
  const { id } = req.params;
  const {
    proyecto,
    solicitante = '',
    ubicacion = '',
    nivel_tension = '13.8 kV / BT',
    observaciones = '',
    items = [],
  } = req.body;

  if (!proyecto || !proyecto.trim()) {
    return res.status(400).json({
      error: 'El nombre del proyecto u obra es obligatorio.',
    });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'La requisición debe contener al menos un material.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqUpdate = await client.query(
      `UPDATE requisiciones
       SET
         proyecto = $1,
         solicitante = $2,
         ubicacion = $3,
         nivel_tension = $4,
         observaciones = $5
       WHERE id = $6
       RETURNING *`,
      [
        proyecto.trim(),
        solicitante.trim(),
        ubicacion.trim(),
        nivel_tension.trim(),
        observaciones.trim(),
        id,
      ]
    );

    if (reqUpdate.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Requisición no encontrada.' });
    }

    const updatedReq = reqUpdate.rows[0];
    await client.query('DELETE FROM requisicion_items WHERE requisicion_id = $1', [id]);

    const insertedItems = [];
    for (const item of items) {
      const itemRes = await client.query(
        `INSERT INTO requisicion_items
           (requisicion_id, material_id, titulo, categoria, unidad, cantidad, nota_tecnica)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          updatedReq.id,
          item.material_id || item.id || null,
          item.title || item.titulo,
          item.category || item.categoria,
          item.unidad || 'PZA',
          Number(item.cantidad) || 1,
          (item.nota_tecnica || '').trim(),
        ]
      );
      const row = itemRes.rows[0];
      insertedItems.push({
        id: row.id,
        material_id: row.material_id,
        title: row.titulo,
        category: row.categoria,
        unidad: row.unidad,
        cantidad: Number(row.cantidad),
        precio_referencia: item.precio_referencia ?? null,
        nota_tecnica: row.nota_tecnica || '',
      });
    }

    await client.query('COMMIT');

    res.json({
      message: `Requisición ${updatedReq.codigo} actualizada exitosamente en PostgreSQL.`,
      requisicion: {
        ...updatedReq,
        items: insertedItems,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar requisición en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo actualizar la requisición en PostgreSQL.',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

// DELETE /api/requisiciones/:id - Eliminar requisición
router.delete('/:id', requirePerm('puede_computos'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM requisiciones WHERE id = $1 RETURNING id, codigo, proyecto',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Requisición no encontrada.' });
    }
    res.json({
      message: 'Requisición eliminada correctamente de PostgreSQL.',
      deleted: result.rows[0],
    });
  } catch (error) {
    console.error('Error al eliminar requisición:', error.message);
    res.status(500).json({
      error: 'No se pudo eliminar la requisición.',
      details: error.message,
    });
  }
});

module.exports = router;
