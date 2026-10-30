const crypto = require('crypto');
const { pool } = require('../config/db');

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'corpoelec_catalogo_secret_2026_key';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// Utilidades de Token firmado (HMAC-SHA256 con expiración y comparación segura)
function createAuthToken(userId, username) {
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ id: userId, username, iat: now, exp: now + TOKEN_TTL_MS })
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
  if (!payload || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp && Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// Middleware de autenticación y permisos RBAC
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const decoded = verifyAuthToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Sesión no válida o expirada. Inicia sesión nuevamente.' });
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
      return res.status(401).json({ error: 'Usuario no encontrado o cuenta desactivada.' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error al verificar permisos de sesión.' });
  }
}

function requirePerm(...permKeys) {
  return [
    requireAuth,
    (req, res, next) => {
      if (req.user.rol === 'ADMIN') return next();
      const hasPermission = permKeys.some((k) => Boolean(req.user[k]));
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Tu perfil de usuario no tiene permisos para realizar esta operación.',
        });
      }
      next();
    },
  ];
}

module.exports = {
  createAuthToken,
  verifyAuthToken,
  requireAuth,
  requirePerm,
};
