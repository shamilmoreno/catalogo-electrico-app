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
const PORT = parseInt(process.env.PORT || '3000', 10);

// Confiar en el proxy inverso de Railway / Render para detectar HTTPS correctamente
app.set('trust proxy', 1);

// Orígenes permitidos para CORS (soporta lista en variables de entorno + dominios corporativos en Render/Railway y desarrollo local)
const DEFAULT_ALLOWED_ORIGINS = [
  'https://catalogo-electrico-frontend.onrender.com',
  'https://catalogo-electrico-app-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const envOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
  process.env.ALLOWED_ORIGINS,
]
  .filter(Boolean)
  .flatMap((raw) => raw.split(','))
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOriginsSet = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

function isOriginAllowed(origin) {
  if (!origin) return true; // Peticiones server-to-server, healthchecks o curl
  const normalized = origin.trim().replace(/\/+$/, '');
  if (allowedOriginsSet.has(normalized)) return true;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    // Permitir subdominios de despliegue (Render, Railway, Vercel) y red local / localhost
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.up.railway.app') ||
      host.endsWith('.vercel.app')
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return process.env.CORS_ALLOW_ALL === 'true';
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Origen bloqueado: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Aplicar CORS globalmente y responder explícitamente a todas las peticiones preflight OPTIONS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Cabeceras de seguridad básicas
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '10mb' }));

// Servir públicamente la carpeta de imágenes y PDFs subidos
app.use('/uploads', express.static(uploadsDir));

// Endpoint raíz informativo y para healthcheck de plataforma (Railway/Render)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'catalogo-electrico-backend',
    message: 'API Catálogo Técnico de Materiales Eléctricos operativa.',
  });
});

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

// Manejador global de errores para evitar caídas y mantener cabeceras CORS en errores
app.use((err, req, res, next) => {
  console.error('Error no controlado en Express:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor.',
  });
});

async function initDatabaseWithRetry(retries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await initDatabase();
      console.log('Base de datos PostgreSQL verificada y lista.');
      return;
    } catch (err) {
      console.error(
        `Aviso [Intento ${attempt}/${retries}]: No se pudo inicializar PostgreSQL automáticamente:`,
        err.message || err.code || String(err)
      );
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

// Iniciar servidor inmediatamente en 0.0.0.0 para que Railway/Render responda preflights CORS sin demoras ni 502
app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Servidor Backend RBAC + CRUD + Cómputos ejecutándose en http://0.0.0.0:${PORT}`
  );
  initDatabaseWithRetry();
});
