const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');
const { initDatabase } = require('./database/initDb');
const { requirePerm } = require('./middleware/auth');
const { uploadsDir, uploadImage } = require('./utils/uploads');

// Rutas modulares
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const familiasRoutes = require('./routes/familias.routes');
const materialesRoutes = require('./routes/materiales.routes');
const requisicionesRoutes = require('./routes/requisiciones.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware global
app.use(cors());
app.use(express.json());

// Servir públicamente la carpeta de imágenes y PDFs subidos
app.use('/uploads', express.static(uploadsDir));

// Subida directa de imagen desde PC
app.post('/api/upload', requirePerm('puede_editar', 'puede_crear'), (req, res) => {
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

// Montar routers modulares de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/familias', familiasRoutes);
app.use('/api/materiales', materialesRoutes);
app.use('/api/requisiciones', requisicionesRoutes);

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
