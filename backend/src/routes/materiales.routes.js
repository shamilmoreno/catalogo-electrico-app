const express = require('express');
const { pool } = require('../config/db');
const { requirePerm } = require('../middleware/auth');
const { uploadPdf, removeOldUploadFile } = require('../utils/uploads');

const router = express.Router();

// GET /api/materiales - Obtener todos los materiales
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        titulo,
        categoria,
        descripcion,
        especificaciones,
        titulo AS t,
        categoria AS c,
        descripcion AS d,
        especificaciones AS s,
        imagen_url,
        datasheet_url,
        norma_tecnica,
        nivel_tension,
        material_base,
        proveedor_nombre,
        proveedor_contacto,
        proveedor_url,
        precio_referencia,
        en_stock,
        created_at,
        updated_at
      FROM materiales
      ORDER BY id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar materiales en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'Error al consultar la base de datos PostgreSQL.',
      details: error.message,
    });
  }
});

// POST /api/materiales - Crear nuevo material
router.post('/', requirePerm('puede_crear'), async (req, res) => {
  const {
    titulo,
    categoria,
    descripcion,
    especificaciones,
    imagen_url,
    datasheet_url,
    norma_tecnica,
    nivel_tension,
    material_base,
    proveedor_nombre,
    proveedor_contacto,
    proveedor_url,
    precio_referencia,
    en_stock = true,
  } = req.body;

  if (!titulo || !titulo.trim() || !categoria || !categoria.trim()) {
    return res.status(400).json({
      error: 'Los campos "titulo" y "categoria" son obligatorios.',
    });
  }

  try {
    const cleanImg = imagen_url && imagen_url.trim() !== '' ? imagen_url.trim() : null;
    const cleanPdf = datasheet_url && datasheet_url.trim() !== '' ? datasheet_url.trim() : null;
    const cleanProvUrl = proveedor_url && proveedor_url.trim() !== '' ? proveedor_url.trim() : null;
    const cleanPrecio =
      precio_referencia !== undefined && precio_referencia !== '' && precio_referencia !== null
        ? Number(precio_referencia)
        : null;
    const cleanDesc =
      descripcion && descripcion.trim() !== ''
        ? descripcion.trim()
        : 'Material o componente eléctrico especializado para instalaciones de infraestructura y redes.';
    const cleanSpecs =
      especificaciones && especificaciones.trim() !== ''
        ? especificaciones.trim()
        : 'Detalles técnicos específicos de dimensiones, diámetros, calibres y tolerancias indicados en la descripción para su correcta aplicación.';

    const result = await pool.query(
      `INSERT INTO materiales
         (titulo, categoria, descripcion, especificaciones, imagen_url, datasheet_url, norma_tecnica, nivel_tension, material_base, proveedor_nombre, proveedor_contacto, proveedor_url, precio_referencia, en_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING
         id,
         titulo,
         categoria,
         descripcion,
         especificaciones,
         titulo AS t,
         categoria AS c,
         descripcion AS d,
         especificaciones AS s,
         imagen_url,
         datasheet_url,
         norma_tecnica,
         nivel_tension,
         material_base,
         proveedor_nombre,
         proveedor_contacto,
         proveedor_url,
         precio_referencia,
         en_stock,
         created_at,
         updated_at`,
      [
        titulo.trim().toUpperCase(),
        categoria.trim(),
        cleanDesc,
        cleanSpecs,
        cleanImg,
        cleanPdf,
        norma_tecnica || null,
        nivel_tension || null,
        material_base || null,
        proveedor_nombre ? proveedor_nombre.trim() : 'Distribuidor Autorizado de Materiales Eléctricos',
        proveedor_contacto ? proveedor_contacto.trim() : null,
        cleanProvUrl,
        cleanPrecio,
        Boolean(en_stock),
      ]
    );

    res.status(201).json({
      message: 'Material creado exitosamente en PostgreSQL.',
      material: result.rows[0],
    });
  } catch (error) {
    console.error('Error al crear material en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo crear el material en PostgreSQL.',
      details: error.message,
    });
  }
});

// PUT /api/materiales/:id - Actualizar material completo
router.put('/:id', requirePerm('puede_editar'), async (req, res) => {
  const { id } = req.params;
  const {
    titulo,
    categoria,
    descripcion,
    especificaciones,
    imagen_url,
    datasheet_url,
    norma_tecnica,
    nivel_tension,
    material_base,
    proveedor_nombre,
    proveedor_contacto,
    proveedor_url,
    precio_referencia,
    en_stock,
  } = req.body;

  if (!titulo || !titulo.trim() || !categoria || !categoria.trim()) {
    return res.status(400).json({
      error: 'Los campos "titulo" y "categoria" son obligatorios.',
    });
  }

  try {
    const prevRes = await pool.query(
      'SELECT imagen_url FROM materiales WHERE id = $1',
      [id]
    );
    const oldImgUrl = prevRes.rows[0]?.imagen_url;

    const cleanImg = imagen_url && imagen_url.trim() !== '' ? imagen_url.trim() : null;
    const cleanPdf = datasheet_url && datasheet_url.trim() !== '' ? datasheet_url.trim() : null;
    const cleanProvUrl = proveedor_url && proveedor_url.trim() !== '' ? proveedor_url.trim() : null;
    const cleanPrecio =
      precio_referencia !== undefined && precio_referencia !== '' && precio_referencia !== null
        ? Number(precio_referencia)
        : null;

    const result = await pool.query(
      `UPDATE materiales
       SET
         titulo = $1,
         categoria = $2,
         descripcion = $3,
         especificaciones = $4,
         imagen_url = $5,
         datasheet_url = COALESCE($6, datasheet_url),
         norma_tecnica = COALESCE($7, norma_tecnica),
         nivel_tension = COALESCE($8, nivel_tension),
         material_base = COALESCE($9, material_base),
         proveedor_nombre = $10,
         proveedor_contacto = $11,
         proveedor_url = $12,
         precio_referencia = $13,
         en_stock = $14,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING
         id,
         titulo,
         categoria,
         descripcion,
         especificaciones,
         titulo AS t,
         categoria AS c,
         descripcion AS d,
         especificaciones AS s,
         imagen_url,
         datasheet_url,
         norma_tecnica,
         nivel_tension,
         material_base,
         proveedor_nombre,
         proveedor_contacto,
         proveedor_url,
         precio_referencia,
         en_stock,
         updated_at`,
      [
        titulo.trim().toUpperCase(),
        categoria.trim(),
        (descripcion || '').trim(),
        (especificaciones || '').trim(),
        cleanImg,
        cleanPdf,
        norma_tecnica || null,
        nivel_tension || null,
        material_base || null,
        proveedor_nombre ? proveedor_nombre.trim() : null,
        proveedor_contacto ? proveedor_contacto.trim() : null,
        cleanProvUrl,
        cleanPrecio,
        en_stock !== undefined ? Boolean(en_stock) : true,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material no encontrado en PostgreSQL.' });
    }

    if (oldImgUrl && oldImgUrl !== cleanImg) {
      await removeOldUploadFile(oldImgUrl, id);
    }

    res.json({
      message: 'Material actualizado correctamente en PostgreSQL.',
      material: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar material en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo actualizar el material en PostgreSQL.',
      details: error.message,
    });
  }
});

// PATCH /api/materiales/:id/stock - Cambiar disponibilidad de stock
router.patch('/:id/stock', requirePerm('puede_editar'), async (req, res) => {
  const { id } = req.params;
  const { en_stock } = req.body;

  try {
    const result = await pool.query(
      `UPDATE materiales
       SET en_stock = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, titulo, en_stock, updated_at`,
      [Boolean(en_stock), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material no encontrado en PostgreSQL.' });
    }

    res.json({
      message: 'Estado de stock actualizado en PostgreSQL.',
      material: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar stock en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo actualizar el stock en PostgreSQL.',
      details: error.message,
    });
  }
});

// DELETE /api/materiales/:id - Eliminar material y limpiar archivos huérfanos
router.delete('/:id', requirePerm('puede_eliminar'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM materiales WHERE id = $1 RETURNING id, titulo, imagen_url, datasheet_url',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material no encontrado en PostgreSQL.' });
    }

    const deleted = result.rows[0];
    if (deleted.imagen_url) {
      await removeOldUploadFile(deleted.imagen_url, id);
    }
    if (deleted.datasheet_url) {
      await removeOldUploadFile(deleted.datasheet_url, id);
    }

    res.json({
      message: 'Material eliminado de PostgreSQL correctamente.',
      deleted,
    });
  } catch (error) {
    console.error('Error al eliminar material en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo eliminar el material en PostgreSQL.',
      details: error.message,
    });
  }
});

// PUT /api/materiales/:id/imagen - Actualizar foto del material
router.put('/:id/imagen', requirePerm('puede_editar'), async (req, res) => {
  const { id } = req.params;
  const { imagen_url } = req.body;

  try {
    const prevRes = await pool.query('SELECT imagen_url FROM materiales WHERE id = $1', [id]);
    const oldImgUrl = prevRes.rows[0]?.imagen_url;

    const cleanUrl = imagen_url && imagen_url.trim() !== '' ? imagen_url.trim() : null;
    const result = await pool.query(
      `UPDATE materiales
       SET imagen_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, titulo, categoria, descripcion, especificaciones, imagen_url, datasheet_url, en_stock, updated_at`,
      [cleanUrl, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material no encontrado en PostgreSQL.' });
    }

    if (oldImgUrl && oldImgUrl !== cleanUrl) {
      await removeOldUploadFile(oldImgUrl, id);
    }

    res.json({
      message: 'URL de imagen actualizada en PostgreSQL correctamente.',
      material: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar imagen por ID en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo actualizar la imagen en PostgreSQL.',
      details: error.message,
    });
  }
});

// POST /api/materiales/:id/upload-datasheet - Subir archivo PDF de ficha técnica
router.post('/:id/upload-datasheet', requirePerm('puede_editar'), (req, res) => {
  uploadPdf.single('datasheet')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        error: err.message || 'Error al subir el archivo PDF.',
      });
    }
    if (!req.file) {
      return res.status(400).json({
        error: 'No se seleccionó ningún archivo PDF.',
      });
    }

    const { id } = req.params;
    const pdfUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    try {
      const prevRes = await pool.query('SELECT datasheet_url FROM materiales WHERE id = $1', [id]);
      const oldPdfUrl = prevRes.rows[0]?.datasheet_url;

      const result = await pool.query(
        `UPDATE materiales
         SET datasheet_url = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, titulo, categoria, datasheet_url, updated_at`,
        [pdfUrl, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Material no encontrado en PostgreSQL.' });
      }

      if (oldPdfUrl && oldPdfUrl !== pdfUrl) {
        await removeOldUploadFile(oldPdfUrl, id);
      }

      res.status(201).json({
        message: 'Hoja de datos PDF subida y asociada al material en PostgreSQL.',
        datasheet_url: pdfUrl,
        material: result.rows[0],
      });
    } catch (dbErr) {
      console.error('Error guardando datasheet_url en PostgreSQL:', dbErr.message);
      res.status(500).json({
        error: 'No se pudo guardar el enlace del PDF en PostgreSQL.',
        details: dbErr.message,
      });
    }
  });
});

// PUT /api/materiales/:id/datasheet - Actualizar o quitar URL de datasheet PDF
router.put('/:id/datasheet', requirePerm('puede_editar'), async (req, res) => {
  const { id } = req.params;
  const { datasheet_url } = req.body;

  try {
    const prevRes = await pool.query('SELECT datasheet_url FROM materiales WHERE id = $1', [id]);
    const oldPdfUrl = prevRes.rows[0]?.datasheet_url;

    const cleanUrl = datasheet_url && datasheet_url.trim() !== '' ? datasheet_url.trim() : null;
    const result = await pool.query(
      `UPDATE materiales
       SET datasheet_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, titulo, datasheet_url, updated_at`,
      [cleanUrl, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material no encontrado en PostgreSQL.' });
    }

    if (oldPdfUrl && oldPdfUrl !== cleanUrl) {
      await removeOldUploadFile(oldPdfUrl, id);
    }

    res.json({
      message: 'Ficha técnica PDF actualizada en PostgreSQL.',
      material: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar datasheet_url en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo actualizar el datasheet en PostgreSQL.',
      details: error.message,
    });
  }
});

module.exports = router;
