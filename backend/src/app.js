const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { pool } = require('./config/db');
const { initDatabase, hashPassword } = require('./database/initDb');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'corpoelec_catalogo_secret_2026_key';

// Utilidades de Token firmado (HMAC-SHA256 sin dependencias externas)
function createAuthToken(userId, username) {
  const payload = Buffer.from(
    JSON.stringify({ id: userId, username, iat: Date.now() })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Carpeta local donde se guardan las fotos y datasheets PDF subidos desde la PC
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Configuración de Multer para guardar archivos en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const baseName = path
      .basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const uniqueName = `${baseName || 'archivo'}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMime = /^image\/(jpeg|jpg|png|webp|gif|svg\+xml|bmp)$/;
    if (allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF, SVG).'));
    }
  },
});

const uploadPdf = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Formato no válido. Solo se permiten archivos PDF (.pdf) para la Hoja de Datos.'));
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Servir públicamente la carpeta de imágenes y PDFs subidos
app.use('/uploads', express.static(uploadsDir));

// ============================================================================
// ENDPOINTS DE AUTENTICACIÓN Y GESTIÓN DE USUARIOS / ROLES (RBAC)
// ============================================================================

// POST /api/auth/login - Iniciar sesión (con usuario o correo) y obtener perfil + permisos
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Ingresa tu usuario/correo y contraseña.' });
  }

  try {
    const cleanUser = username.trim().toLowerCase();
    const passHash = hashPassword(password);

    const result = await pool.query(
      `SELECT
         id, username, email, nombre_completo, cargo, rol,
         puede_crear, puede_editar, puede_eliminar,
         puede_computos, puede_exportar, puede_usuarios, activo
       FROM usuarios
       WHERE (LOWER(username) = $1 OR LOWER(email) = $1) AND password_hash = $2`,
      [cleanUser, passHash]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Usuario, correo o contraseña incorrectos.' });
    }

    const user = result.rows[0];
    if (!user.activo) {
      return res.status(403).json({
        error: 'Esta cuenta de usuario se encuentra desactivada. Contacta al Administrador.',
      });
    }

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
app.post('/api/auth/forgot-password', async (req, res) => {
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
    const code = String(Math.floor(100000 + Math.random() * 900000));

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
      message: `Código de recuperación generado para ${user.email || user.username}.`,
      username: user.username,
      email: user.email || '',
      reset_code_preview: code,
    });
  } catch (error) {
    console.error('Error en forgot-password:', error.message);
    res.status(500).json({ error: 'Error al generar el código de recuperación.' });
  }
});

// POST /api/auth/reset-password - Verificar código y actualizar la nueva contraseña en PostgreSQL
app.post('/api/auth/reset-password', async (req, res) => {
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
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const decoded = verifyAuthToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Sesión no válida o expirada.' });
  }

  try {
    const result = await pool.query(
      `SELECT
         id, username, email, nombre_completo, cargo, rol,
         puede_crear, puede_editar, puede_eliminar,
         puede_computos, puede_exportar, puede_usuarios, activo
       FROM usuarios
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rowCount === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar sesión.' });
  }
});

// GET /api/usuarios - Listar todos los usuarios y sus permisos (para el panel de administración)
app.get('/api/usuarios', async (req, res) => {
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
app.post('/api/usuarios', async (req, res) => {
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
app.put('/api/usuarios/:id', async (req, res) => {
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
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
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

// ============================================================================
// ENDPOINTS DE SUBIDA DE IMÁGENES Y PDF DESDE PC
// ============================================================================

app.post('/api/upload', (req, res) => {
  uploadImage.single('imagen')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: err.message || 'Error al subir el archivo de imagen.',
      });
    }
    if (!req.file) {
      return res.status(400).json({
        error: 'No se recibió ningún archivo de imagen.',
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({
      message: 'Imagen subida correctamente desde tu PC.',
      url: fileUrl,
      filename: req.file.filename,
    });
  });
});

app.post('/api/materiales/:id/upload-datasheet', (req, res) => {
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

app.put('/api/materiales/:id/datasheet', async (req, res) => {
  const { id } = req.params;
  const { datasheet_url } = req.body;

  try {
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

// ============================================================================
// ENDPOINTS DE FAMILIAS DE MATERIALES (CRUD COMPLETO EN POSTGRESQL)
// ============================================================================

// GET /api/familias - Listar todas las familias con el conteo de materiales asociados
app.get('/api/familias', async (req, res) => {
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
app.post('/api/familias', async (req, res) => {
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
app.put('/api/familias/:id', async (req, res) => {
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

    // Si cambió el nombre de la familia, actualizar automáticamente todos los materiales y requisiciones asociadas
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
app.delete('/api/familias/:id', async (req, res) => {
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

// ============================================================================
// ENDPOINTS DE MATERIALES (CRUD)
// ============================================================================

app.get('/api/materiales', async (req, res) => {
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

app.post('/api/materiales', async (req, res) => {
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

app.put('/api/materiales/:id', async (req, res) => {
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

app.patch('/api/materiales/:id/stock', async (req, res) => {
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

app.delete('/api/materiales/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM materiales WHERE id = $1 RETURNING id, titulo',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material no encontrado en PostgreSQL.' });
    }

    res.json({
      message: 'Material eliminado de PostgreSQL correctamente.',
      deleted: result.rows[0],
    });
  } catch (error) {
    console.error('Error al eliminar material en PostgreSQL:', error.message);
    res.status(500).json({
      error: 'No se pudo eliminar el material en PostgreSQL.',
      details: error.message,
    });
  }
});

app.put('/api/materiales/:id/imagen', async (req, res) => {
  const { id } = req.params;
  const { imagen_url } = req.body;

  try {
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

// ============================================================================
// ENDPOINTS DE CÓMPUTOS MÉTRICOS / REQUISICIONES (PostgreSQL)
// ============================================================================

app.get('/api/requisiciones', async (req, res) => {
  try {
    const reqResult = await pool.query(
      'SELECT * FROM requisiciones ORDER BY created_at DESC'
    );
    const itemsResult = await pool.query(
      'SELECT * FROM requisicion_items ORDER BY id ASC'
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

app.post('/api/requisiciones', async (req, res) => {
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

    const countRes = await client.query('SELECT COUNT(*)::int AS total FROM requisiciones');
    const nextNum = (countRes.rows[0].total || 0) + 1;
    const year = new Date().getFullYear();
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

app.delete('/api/requisiciones/:id', async (req, res) => {
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

// Endpoint de salud y estado de PostgreSQL
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query(
      'SELECT COUNT(*)::int AS total, COUNT(imagen_url)::int AS con_imagen, COUNT(datasheet_url)::int AS con_pdf FROM materiales'
    );
    const reqRes = await pool.query('SELECT COUNT(*)::int AS total_req FROM requisiciones');
    const usrRes = await pool.query('SELECT COUNT(*)::int AS total_users FROM usuarios');
    res.json({
      status: 'ok',
      database: 'PostgreSQL connected (db_catalogo)',
      total_items: dbRes.rows[0].total,
      items_with_custom_image: dbRes.rows[0].con_imagen,
      items_with_datasheet_pdf: dbRes.rows[0].con_pdf,
      saved_requisiciones: reqRes.rows[0].total_req,
      total_users: usrRes.rows[0].total_users,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'PostgreSQL disconnected',
      details: error.message,
    });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor Backend RBAC + CRUD + Cómputos (PostgreSQL - db_catalogo) en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Aviso: No se pudo inicializar PostgreSQL automáticamente:', err.message);
    app.listen(PORT, () => {
      console.log(`Servidor Backend ejecutándose en http://localhost:${PORT}`);
    });
  });
