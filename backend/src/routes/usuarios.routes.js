const express = require('express');
const { pool } = require('../config/db');
const { hashPassword } = require('../database/initDb');
const { requirePerm } = require('../middleware/auth');

const router = express.Router();

// GET /api/usuarios - Listar todos los usuarios y sus permisos
router.get('/', requirePerm('puede_usuarios'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id, username, email, nombre_completo, cargo, rol,
         puede_crear, puede_editar, puede_eliminar,
         puede_computos, puede_exportar, puede_usuarios,
         activo, created_at
       FROM usuarios
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar usuarios:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los usuarios en PostgreSQL.' });
  }
});

// POST /api/usuarios - Crear nuevo usuario con rol y permisos
router.post('/', requirePerm('puede_usuarios'), async (req, res) => {
  const {
    username,
    email = '',
    password,
    nombre_completo,
    cargo = '',
    rol = 'VISOR',
    puede_crear = false,
    puede_editar = false,
    puede_eliminar = false,
    puede_computos = false,
    puede_exportar = false,
    puede_usuarios = false,
    activo = true,
  } = req.body;

  if (!username || !username.trim() || !password || !nombre_completo || !nombre_completo.trim()) {
    return res.status(400).json({
      error: 'Usuario, contraseña y nombre completo son obligatorios.',
    });
  }

  try {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
    const passHash = hashPassword(password);

    const result = await pool.query(
      `INSERT INTO usuarios
        (username, email, password_hash, nombre_completo, cargo, rol,
         puede_crear, puede_editar, puede_eliminar, puede_computos, puede_exportar, puede_usuarios, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING
         id, username, email, nombre_completo, cargo, rol,
         puede_crear, puede_editar, puede_eliminar,
         puede_computos, puede_exportar, puede_usuarios, activo, created_at`,
      [
        cleanUsername,
        cleanEmail,
        passHash,
        nombre_completo.trim(),
        cargo.trim(),
        rol,
        Boolean(puede_crear),
        Boolean(puede_editar),
        Boolean(puede_eliminar),
        Boolean(puede_computos),
        Boolean(puede_exportar),
        Boolean(puede_usuarios),
        Boolean(activo),
      ]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente en PostgreSQL.',
      usuario: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ese nombre de usuario ya existe.' });
    }
    console.error('Error al crear usuario:', error.message);
    res.status(500).json({ error: 'No se pudo crear el usuario en PostgreSQL.' });
  }
});

// PUT /api/usuarios/:id - Actualizar rol, permisos, datos o contraseña de un usuario
router.put('/:id', requirePerm('puede_usuarios'), async (req, res) => {
  const { id } = req.params;
  const {
    username,
    email = '',
    password,
    nombre_completo,
    cargo = '',
    rol = 'VISOR',
    puede_crear = false,
    puede_editar = false,
    puede_eliminar = false,
    puede_computos = false,
    puede_exportar = false,
    puede_usuarios = false,
    activo = true,
  } = req.body;

  if (!username || !username.trim() || !nombre_completo || !nombre_completo.trim()) {
    return res.status(400).json({
      error: 'El usuario y el nombre completo son obligatorios.',
    });
  }

  try {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
    let result;

    if (password && password.trim() !== '') {
      const passHash = hashPassword(password.trim());
      result = await pool.query(
        `UPDATE usuarios
         SET
           username = $1,
           email = $2,
           password_hash = $3,
           nombre_completo = $4,
           cargo = $5,
           rol = $6,
           puede_crear = $7,
           puede_editar = $8,
           puede_eliminar = $9,
           puede_computos = $10,
           puede_exportar = $11,
           puede_usuarios = $12,
           activo = $13
         WHERE id = $14
         RETURNING
           id, username, email, nombre_completo, cargo, rol,
           puede_crear, puede_editar, puede_eliminar,
           puede_computos, puede_exportar, puede_usuarios, activo, created_at`,
        [
          cleanUsername,
          cleanEmail,
          passHash,
          nombre_completo.trim(),
          cargo.trim(),
          rol,
          Boolean(puede_crear),
          Boolean(puede_editar),
          Boolean(puede_eliminar),
          Boolean(puede_computos),
          Boolean(puede_exportar),
          Boolean(puede_usuarios),
          Boolean(activo),
          id,
        ]
      );
    } else {
      result = await pool.query(
        `UPDATE usuarios
         SET
           username = $1,
           email = $2,
           nombre_completo = $3,
           cargo = $4,
           rol = $5,
           puede_crear = $6,
           puede_editar = $7,
           puede_eliminar = $8,
           puede_computos = $9,
           puede_exportar = $10,
           puede_usuarios = $11,
           activo = $12
         WHERE id = $13
         RETURNING
           id, username, email, nombre_completo, cargo, rol,
           puede_crear, puede_editar, puede_eliminar,
           puede_computos, puede_exportar, puede_usuarios, activo, created_at`,
        [
          cleanUsername,
          cleanEmail,
          nombre_completo.trim(),
          cargo.trim(),
          rol,
          Boolean(puede_crear),
          Boolean(puede_editar),
          Boolean(puede_eliminar),
          Boolean(puede_computos),
          Boolean(puede_exportar),
          Boolean(puede_usuarios),
          Boolean(activo),
          id,
        ]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({
      message: 'Usuario y permisos actualizados en PostgreSQL.',
      usuario: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso.' });
    }
    console.error('Error al actualizar usuario:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el usuario.' });
  }
});

// DELETE /api/usuarios/:id - Eliminar un usuario
router.delete('/:id', requirePerm('puede_usuarios'), async (req, res) => {
  const { id } = req.params;
  if (req.user && Number(req.user.id) === Number(id)) {
    return res.status(400).json({
      error: 'No puedes eliminar tu propia cuenta activa.',
    });
  }
  try {
    const checkAdmin = await pool.query('SELECT username FROM usuarios WHERE id = $1', [id]);
    if (
      checkAdmin.rowCount > 0 &&
      (checkAdmin.rows[0].username === 'admin' || checkAdmin.rows[0].username === 'shamilmoreno')
    ) {
      return res.status(400).json({
        error: 'No se puede eliminar la cuenta de Administrador Principal.',
      });
    }

    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, username',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({
      message: 'Usuario eliminado correctamente.',
      deleted: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el usuario.' });
  }
});

module.exports = router;
