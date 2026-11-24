const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('../config/db');

// Carpeta local donde se guardan/cachean las fotos y datasheets PDF subidos (backend/uploads)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

function getMimeTypeFromFilename(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.bmp':
      return 'image/bmp';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

// Guardar archivo subido en PostgreSQL (tabla archivos_subidos) para persistencia ante redeploys en Render/Railway
async function saveFileToDb(filename, mimeType, filePathOrBuffer) {
  if (!filename) return;
  const safeFilename = path.basename(filename);
  const buffer = Buffer.isBuffer(filePathOrBuffer)
    ? filePathOrBuffer
    : await fs.promises.readFile(filePathOrBuffer);
  const resolvedMime = mimeType || getMimeTypeFromFilename(safeFilename);

  await pool.query(
    `INSERT INTO archivos_subidos (filename, mime_type, contenido, tamano_bytes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (filename) DO UPDATE SET
       mime_type = EXCLUDED.mime_type,
       contenido = EXCLUDED.contenido,
       tamano_bytes = EXCLUDED.tamano_bytes`,
    [safeFilename, resolvedMime, buffer, buffer.length]
  );
}

// Recuperar archivo desde PostgreSQL si el disco efímero de Render se reinició, y restaurarlo en caché local
async function getFileFromDb(filename) {
  if (!filename) return null;
  const safeFilename = path.basename(decodeURIComponent(filename));
  if (!safeFilename || safeFilename === '.' || safeFilename === '..') return null;

  const res = await pool.query(
    'SELECT mime_type, contenido FROM archivos_subidos WHERE filename = $1',
    [safeFilename]
  );
  if (res.rowCount === 0) return null;

  const { mime_type, contenido } = res.rows[0];
  // Restaurar copia en disco local para que las siguientes peticiones se sirvan directo por express.static
  try {
    const localPath = path.join(uploadsDir, safeFilename);
    await fs.promises.writeFile(localPath, contenido);
  } catch (err) {
    console.warn('No se pudo escribir caché en disco local de uploads:', err.message);
  }

  return {
    mimeType: mime_type || getMimeTypeFromFilename(safeFilename),
    buffer: contenido,
  };
}

// Limpieza segura de archivos huérfanos en backend/uploads/ y en PostgreSQL (archivos_subidos)
async function removeOldUploadFile(fileUrl, ignoreMaterialId = null) {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.includes('/uploads/')) return;
  try {
    const rawName = fileUrl.split('/uploads/').pop().split('?')[0];
    const safeFilename = path.basename(decodeURIComponent(rawName));
    if (!safeFilename) return;

    // Verificar que ningún otro material esté usando el mismo archivo
    const inUseRes = await pool.query(
      `SELECT 1 FROM materiales
       WHERE (imagen_url LIKE $1 OR datasheet_url LIKE $1)
         AND ($2::int IS NULL OR id <> $2::int)
       LIMIT 1`,
      [`%/uploads/${safeFilename}`, ignoreMaterialId]
    );
    if (inUseRes.rowCount > 0) return;

    await pool
      .query('DELETE FROM archivos_subidos WHERE filename = $1', [safeFilename])
      .catch(() => {});

    const fullPath = path.join(uploadsDir, safeFilename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    console.warn('No se pudo limpiar archivo antiguo en uploads:', err.message);
  }
}

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

module.exports = {
  uploadsDir,
  getMimeTypeFromFilename,
  saveFileToDb,
  getFileFromDb,
  removeOldUploadFile,
  uploadImage,
  uploadPdf,
};
