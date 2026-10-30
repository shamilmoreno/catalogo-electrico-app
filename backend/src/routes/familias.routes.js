const express = require('express');
const { pool } = require('../config/db');
const { requirePerm } = require('../middleware/auth');

const router = express.Router();

// GET /api/familias - Listar todas las familias con el conteo de materiales asociados
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        f.id,
        f.nombre,
        f.codigo,
        f.descripcion,
        f.proveedor_sugerido,
        f.color_badge,
        f.created_at,
        f.updated_at,
        COUNT(m.id)::int AS total_materiales
      FROM familias f
      LEFT JOIN materiales m ON LOWER(TRIM(m.categoria)) = LOWER(TRIM(f.nombre))
      GROUP BY f.id
      ORDER BY f.nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar familias en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudieron consultar las familias en PostgreSQL.',
      details: error.message,
    });
  }
});

// POST /api/familias - Crear nueva familia de materiales
router.post('/', requirePerm('puede_crear', 'puede_editar', 'puede_usuarios'), async (req, res) => {
  const {
    nombre,
    codigo = '',
    descripcion = '',
    proveedor_sugerido = '',
    color_badge = 'sky',
  } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      error: 'El nombre de la Familia es obligatorio.',
    });
  }

  try {
    const cleanNombre = nombre.trim();
    const autoCode =
      codigo && codigo.trim()
        ? codigo.trim().toUpperCase()
        : `FAM-${cleanNombre
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 3)
            .toUpperCase()}`;

    const result = await pool.query(
      `INSERT INTO familias (nombre, codigo, descripcion, proveedor_sugerido, color_badge)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        cleanNombre,
        autoCode,
        descripcion.trim() ||
          'Familia técnica de materiales eléctricos de infraestructura y distribución.',
        proveedor_sugerido.trim() ||
          'Distribuidor Autorizado de Materiales Eléctricos',
        color_badge || 'sky',
      ]
    );

    res.status(201).json({
      message: `Familia "${cleanNombre}" creada exitosamente en PostgreSQL.`,
      familia: { ...result.rows[0], total_materiales: 0 },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Ya existe una Familia registrada con ese nombre.',
      });
    }
    console.error('Error al crear familia:', error.message);
    res.status(500).json({
      error: 'No se pudo crear la familia en PostgreSQL.',
      details: error.message,
    });
  }
});

// PUT /api/familias/:id - Editar una familia y actualizar en cascada los materiales si cambia de nombre
router.put('/:id', requirePerm('puede_crear', 'puede_editar', 'puede_usuarios'), async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    codigo = '',
    descripcion = '',
    proveedor_sugerido = '',
    color_badge = 'sky',
  } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      error: 'El nombre de la Familia es obligatorio.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prevRes = await client.query('SELECT * FROM familias WHERE id = $1', [id]);
    if (prevRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Familia no encontrada.' });
    }

    const oldNombre = prevRes.rows[0].nombre;
    const newNombre = nombre.trim();
    const cleanCode =
      codigo && codigo.trim()
        ? codigo.trim().toUpperCase()
        : prevRes.rows[0].codigo;

    const updateRes = await client.query(
      `UPDATE familias
       SET
         nombre = $1,
         codigo = $2,
         descripcion = $3,
         proveedor_sugerido = $4,
         color_badge = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        newNombre,
        cleanCode,
        descripcion.trim(),
        proveedor_sugerido.trim(),
        color_badge || 'sky',
        id,
      ]
    );

    let updatedMaterialsCount = 0;
    if (oldNombre !== newNombre) {
      const matUpdate = await client.query(
        `UPDATE materiales
         SET categoria = $1, updated_at = CURRENT_TIMESTAMP
         WHERE LOWER(TRIM(categoria)) = LOWER(TRIM($2))`,
        [newNombre, oldNombre]
      );
      updatedMaterialsCount = matUpdate.rowCount;

      await client.query(
        `UPDATE requisicion_items
         SET categoria = $1
         WHERE LOWER(TRIM(categoria)) = LOWER(TRIM($2))`,
        [newNombre, oldNombre]
      );
    }

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS total FROM materiales WHERE LOWER(TRIM(categoria)) = LOWER(TRIM($1))',
      [newNombre]
    );

    await client.query('COMMIT');

    res.json({
      message: `Familia "${newNombre}" actualizada correctamente en PostgreSQL.`,
      familia: {
        ...updateRes.rows[0],
        total_materiales: countRes.rows[0].total,
      },
      old_nombre: oldNombre,
      updated_materials: updatedMaterialsCount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Ya existe otra Familia con ese nombre.',
      });
    }
    console.error('Error al actualizar familia:', error.message);
    res.status(500).json({
      error: 'No se pudo actualizar la familia en PostgreSQL.',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

// DELETE /api/familias/:id - Eliminar una familia (o reasignar materiales si se indica)
router.delete('/:id', requirePerm('puede_eliminar', 'puede_usuarios'), async (req, res) => {
  const { id } = req.params;
  const { reasignar_a } = req.query;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const famRes = await client.query('SELECT * FROM familias WHERE id = $1', [id]);
    if (famRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Familia no encontrada.' });
    }

    const fam = famRes.rows[0];
    const countRes = await client.query(
      'SELECT COUNT(*)::int AS total FROM materiales WHERE LOWER(TRIM(categoria)) = LOWER(TRIM($1))',
      [fam.nombre]
    );
    const totalMat = countRes.rows[0].total;

    if (totalMat > 0) {
      if (reasignar_a && reasignar_a.trim() !== '') {
        await client.query(
          `UPDATE materiales
           SET categoria = $1, updated_at = CURRENT_TIMESTAMP
           WHERE LOWER(TRIM(categoria)) = LOWER(TRIM($2))`,
          [reasignar_a.trim(), fam.nombre]
        );
        await client.query(
          `UPDATE requisicion_items
           SET categoria = $1
           WHERE LOWER(TRIM(categoria)) = LOWER(TRIM($2))`,
          [reasignar_a.trim(), fam.nombre]
        );
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `No se puede eliminar la familia "${fam.nombre}" porque tiene ${totalMat} materiales asociados. Reasigna primero los materiales o crea otra familia destino.`,
          total_materiales: totalMat,
        });
      }
    }

    await client.query('DELETE FROM familias WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.json({
      message: `Familia "${fam.nombre}" eliminada correctamente de PostgreSQL.`,
      deleted: fam,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar familia:', error.message);
    res.status(500).json({
      error: 'No se pudo eliminar la familia en PostgreSQL.',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;
