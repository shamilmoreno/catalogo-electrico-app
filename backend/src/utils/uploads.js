const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('../config/db');

// Carpeta local donde se guardan las fotos y datasheets PDF subidos desde la PC (backend/uploads)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Limpieza segura de archivos locales huérfanos en backend/uploads/
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
  removeOldUploadFile,
  uploadImage,
  uploadPdf,
};
