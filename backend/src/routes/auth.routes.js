const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { hashPassword, verifyPassword } = require('../database/initDb');
const { createAuthToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - Iniciar sesión (con usuario o correo) y obtener perfil + permisos
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Ingresa tu usuario/correo y contraseña.' });
  }

  try {
    const cleanUser = username.trim().toLowerCase();

    const result = await pool.query(
      `SELECT
         id, username, email, password_hash, nombre_completo, cargo, rol,
         puede_crear, puede_editar, puede_eliminar,
         puede_computos, puede_exportar, puede_usuarios, activo
       FROM usuarios
       WHERE LOWER(username) = $1 OR LOWER(email) = $1`,
      [cleanUser]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Usuario, correo o contraseña incorrectos.' });
    }

    const row = result.rows[0];
    if (!verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Usuario, correo o contraseña incorrectos.' });
    }

    if (!row.activo) {
      return res.status(403).json({
        error: 'Esta cuenta de usuario se encuentra desactivada. Contacta al Administrador.',
      });
    }

    // Migrar automáticamente hashes SHA-256 antiguos a scrypt con salt
    if (row.password_hash && !row.password_hash.startsWith('scrypt:')) {
      const upgradedHash = hashPassword(password);
      await pool
        .query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [upgradedHash, row.id])
        .catch(() => {});
    }

    const { password_hash, ...user } = row;
    const token = createAuthToken(user.id, user.username);
    res.json({
      message: `Bienvenido, ${user.nombre_completo}`,
      token,
      user,
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ error: 'Error al autenticar en PostgreSQL.' });
  }
});

// POST /api/auth/forgot-password - Solicitar código de recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({
      error: 'Ingresa tu correo electrónico o nombre de usuario registrado.',
    });
  }

  try {
    const cleanId = identifier.trim().toLowerCase();
    const result = await pool.query(
      `SELECT id, username, email, nombre_completo
       FROM usuarios
       WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
      [cleanId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'No se encontró ninguna cuenta asociada a ese correo o usuario.',
      });
    }

    const user = result.rows[0];
    const code = String(crypto.randomInt(100000, 1000000));

    await pool.query(
      `UPDATE usuarios
       SET reset_code = $1, reset_expires = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
       WHERE id = $2`,
      [code, user.id]
    );

    console.log(
      `[RECUPERACIÓN DE CLAVE] Usuario: ${user.username} (${user.email || 'sin correo'}) -> Código: ${code}`
    );

    res.json({
      message: `Código de recuperación generado para ${user.email || user.username}. Revisa la consola del servidor o solicita el código al Administrador.`,
      username: user.username,
      email: user.email || '',
    });
  } catch (error) {
    console.error('Error en forgot-password:', error.message);
    res.status(500).json({ error: 'Error al generar el código de recuperación.' });
  }
});

// POST /api/auth/reset-password - Verificar código y actualizar la nueva contraseña en PostgreSQL
router.post('/reset-password', async (req, res) => {
  const { identifier, reset_code, new_password } = req.body;
  if (!identifier || !reset_code || !new_password) {
    return res.status(400).json({
      error: 'Todos los campos (usuario/correo, código de verificación y nueva contraseña) son obligatorios.',
    });
  }

  if (String(new_password).trim().length < 5) {
    return res.status(400).json({
      error: 'La nueva contraseña debe tener al menos 5 caracteres.',
    });
  }

  try {
    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = String(reset_code).trim();

    const result = await pool.query(
      `SELECT id, username, email, reset_code, reset_expires
       FROM usuarios
       WHERE (LOWER(email) = $1 OR LOWER(username) = $1)`,
      [cleanId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = result.rows[0];
    if (!user.reset_code || user.reset_code !== cleanCode) {
      return res.status(400).json({
        error: 'El código de verificación es incorrecto.',
      });
    }

    if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({
        error: 'El código de recuperación ha expirado. Solicita uno nuevo.',
      });
    }

    const newHash = hashPassword(new_password.trim());
    await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, reset_code = NULL, reset_expires = NULL
       WHERE id = $2`,
      [newHash, user.id]
    );

    res.json({
      message: `La contraseña del usuario "${user.username}" ha sido actualizada exitosamente. Ya puedes iniciar sesión.`,
    });
  } catch (error) {
    console.error('Error en reset-password:', error.message);
    res.status(500).json({ error: 'No se pudo restablecer la contraseña en PostgreSQL.' });
  }
});

// GET /api/auth/me - Obtener sesión actual validando contra PostgreSQL
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
