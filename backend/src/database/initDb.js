const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('pg');
const { pool, dbConfig } = require('../config/db');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

async function ensureDatabaseExists() {
  const adminClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbConfig.database]
    );
    if (res.rowCount === 0) {
      console.log(`Creando base de datos PostgreSQL "${dbConfig.database}"...`);
      await adminClient.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`Base de datos "${dbConfig.database}" creada exitosamente.`);
    }
  } finally {
    await adminClient.end().catch(() => {});
  }
}

async function seedDefaultSuppliers() {
  await pool.query(`
    UPDATE materiales
    SET
      proveedor_nombre = CASE categoria
        WHEN 'Abrazaderas' THEN 'Herrajes Eléctricos C.A. / Industrias Galvanizadas (Ref. Hubbell / Chance)'
        WHEN 'Aisladores y Accesorios' THEN 'Suministros de Media Tensión / Ref. Gamma / Lapp Insulators / Hubbell'
        WHEN 'Anclas, Guayas, Flejes y Herrajes de Línea' THEN 'Ferretería de Líneas Eléctricas / Ref. PLP (Preformed Line Products)'
        WHEN 'Cables, Conductores y Cintas' THEN 'Conductores Eléctricos Nacionales (Ref. Elecon / Cabel / 3M)'
        WHEN 'Conectores y Terminales' THEN 'Distribuidora de Conectores Eléctricos (Ref. Burndy / Blackburn / Ilsco)'
        WHEN 'Fusibles, Seccionadores y Protección' THEN 'Equipos de Protección y Maniobra MT (Ref. S&C / Cooper Power / ABB)'
        WHEN 'Postes, Crucetas, Estructuras y Soportes' THEN 'Metalúrgica de Postes y Crucetas Eléctricas C.A.'
        WHEN 'Sistemas de Puesta a Tierra y Equipos' THEN 'Sistemas de Puesta a Tierra y Pararrayos (Ref. Erico / Copperweld)'
        WHEN 'Tapas, Tanquillas y Cajas' THEN 'Fundición y Prefabricados Eléctricos C.A.'
        WHEN 'Tornillería y Fijación' THEN 'Tornillería Industrial Galvanizada y Bronce C.A.'
        WHEN 'Tubos, Conduits y Ductos' THEN 'Tuberías y Canalizaciones Eléctricas (Ref. Conduit Aluminio / PVC)'
        ELSE 'Distribuidor Autorizado de Materiales Eléctricos'
      END,
      proveedor_contacto = COALESCE(proveedor_contacto, 'Dpto. de Ventas Industriales / Procura Eléctrica')
    WHERE proveedor_nombre IS NULL;
  `);
}

const DEFAULT_FAMILIAS = [
  {
    nombre: 'Abrazaderas',
    codigo: 'FAM-ABR',
    descripcion:
      'Abrazaderas metálicas utilizadas para fijar elementos, tubos, herrajes o crucetas a postes o estructuras.',
    proveedor_sugerido:
      'Herrajes Eléctricos C.A. / Industrias Galvanizadas (Ref. Hubbell / Chance)',
    color_badge: 'blue',
  },
  {
    nombre: 'Aisladores y Accesorios',
    codigo: 'FAM-AIS',
    descripcion:
      'Aisladores eléctricos de porcelana o poliméricos y accesorios diseñados para soporte mecánico y aislamiento dieléctrico.',
    proveedor_sugerido:
      'Suministros de Media Tensión (Ref. Gamma / Lapp Insulators / Hubbell)',
    color_badge: 'amber',
  },
  {
    nombre: 'Anclas, Guayas, Flejes y Herrajes de Línea',
    codigo: 'FAM-HER',
    descripcion:
      'Herrajes y elementos de retenida utilizados para el anclaje, tensado y sujeción mecánica de líneas aéreas.',
    proveedor_sugerido:
      'Ferretería de Líneas Eléctricas (Ref. PLP - Preformed Line Products)',
    color_badge: 'cyan',
  },
  {
    nombre: 'Cables, Conductores y Cintas',
    codigo: 'FAM-CAB',
    descripcion:
      'Conductores eléctricos desnudos o aislados y cintas para transporte de energía, empalmes y aislamiento.',
    proveedor_sugerido:
      'Conductores Eléctricos Nacionales (Ref. Elecon / Cabel / 3M)',
    color_badge: 'stone',
  },
  {
    nombre: 'Conectores y Terminales',
    codigo: 'FAM-CON',
    descripcion:
      'Conectores y terminales eléctricos diseñados para asegurar la continuidad eléctrica y fijación entre conductores o equipos.',
    proveedor_sugerido:
      'Distribuidora de Conectores Eléctricos (Ref. Burndy / Blackburn / Ilsco)',
    color_badge: 'emerald',
  },
  {
    nombre: 'Fusibles, Seccionadores y Protección',
    codigo: 'FAM-PRO',
    descripcion:
      'Dispositivos de maniobra y protección contra sobrecorrientes o sobretensiones en redes de distribución eléctrica.',
    proveedor_sugerido:
      'Equipos de Protección y Maniobra MT (Ref. S&C / Cooper Power / ABB)',
    color_badge: 'rose',
  },
  {
    nombre: 'Postes, Crucetas, Estructuras y Soportes',
    codigo: 'FAM-EST',
    descripcion:
      'Elementos estructurales de soporte para el tendido y montaje de herrajes, aisladores y equipos en líneas eléctricas.',
    proveedor_sugerido: 'Metalúrgica de Postes y Crucetas Eléctricas C.A.',
    color_badge: 'slate',
  },
  {
    nombre: 'Sistemas de Puesta a Tierra y Equipos',
    codigo: 'FAM-SPT',
    descripcion:
      'Componentes para sistemas de puesta a tierra, barras cooperweld y disipación segura de corrientes de falla.',
    proveedor_sugerido:
      'Sistemas de Puesta a Tierra y Pararrayos (Ref. Erico / Copperweld)',
    color_badge: 'violet',
  },
  {
    nombre: 'Tapas, Tanquillas y Cajas',
    codigo: 'FAM-TAN',
    descripcion:
      'Elementos de canalización subterránea o registro para alojamiento, inspección y protección de conexiones eléctricas.',
    proveedor_sugerido: 'Fundición y Prefabricados Eléctricos C.A.',
    color_badge: 'orange',
  },
  {
    nombre: 'Tornillería y Fijación',
    codigo: 'FAM-TOR',
    descripcion:
      'Elementos de tornillería galvanizada o bronce y fijación mecánica para el ensamblaje seguro de estructuras y herrajes.',
    proveedor_sugerido: 'Tornillería Industrial Galvanizada y Bronce C.A.',
    color_badge: 'indigo',
  },
  {
    nombre: 'Tubos, Conduits y Ductos',
    codigo: 'FAM-TUB',
    descripcion:
      'Tuberías, conduits y conductos eléctricos para la canalización y protección mecánica de conductores.',
    proveedor_sugerido:
      'Tuberías y Canalizaciones Eléctricas (Ref. Conduit Aluminio / PVC)',
    color_badge: 'teal',
  },
];

async function seedDefaultFamilias() {
  for (const fam of DEFAULT_FAMILIAS) {
    await pool.query(
      `INSERT INTO familias (nombre, codigo, descripcion, proveedor_sugerido, color_badge)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (nombre) DO UPDATE SET
         codigo = CASE WHEN familias.codigo = '' OR familias.codigo IS NULL THEN EXCLUDED.codigo ELSE familias.codigo END,
         descripcion = CASE WHEN familias.descripcion = '' OR familias.descripcion IS NULL THEN EXCLUDED.descripcion ELSE familias.descripcion END,
         proveedor_sugerido = CASE WHEN familias.proveedor_sugerido = '' OR familias.proveedor_sugerido IS NULL THEN EXCLUDED.proveedor_sugerido ELSE familias.proveedor_sugerido END`,
      [
        fam.nombre,
        fam.codigo,
        fam.descripcion,
        fam.proveedor_sugerido,
        fam.color_badge,
      ]
    );
  }

  // Asegurar también cualquier familia adicional que exista en la tabla materiales
  await pool.query(`
    INSERT INTO familias (nombre, codigo, descripcion, proveedor_sugerido, color_badge)
    SELECT DISTINCT
      m.categoria,
      'FAM-' || UPPER(SUBSTRING(REGEXP_REPLACE(m.categoria, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)),
      'Familia técnica de materiales eléctricos de infraestructura y distribución.',
      'Distribuidor Autorizado de Materiales Eléctricos',
      'sky'
    FROM materiales m
    WHERE m.categoria IS NOT NULL AND TRIM(m.categoria) <> ''
    ON CONFLICT (nombre) DO NOTHING;
  `);
}

async function ensureMainUser() {
  // Asegurar que exista el usuario administrador principal: shamilmoreno con el nombre bien escrito "Shamil Moreno"
  const shamilHash = hashPassword('Shaq52..');
  const existing = await pool.query(
    'SELECT id FROM usuarios WHERE LOWER(username) = $1',
    ['shamilmoreno']
  );

  if (existing.rowCount === 0) {
    await pool.query(
      `INSERT INTO usuarios
        (username, email, password_hash, nombre_completo, cargo, rol,
         puede_crear, puede_editar, puede_eliminar, puede_computos, puede_exportar, puede_usuarios, activo)
       VALUES ($1, $2, $3, $4, $5, 'ADMIN', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)`,
      [
        'shamilmoreno',
        'shamil.moreno@weworkintegrados.com',
        shamilHash,
        'Shamil Moreno',
        'Coordinador Desarrollo',
      ]
    );
    console.log('Usuario principal "shamilmoreno" (Shamil Moreno) creado en PostgreSQL.');
  } else {
    await pool.query(
      `UPDATE usuarios
       SET
         nombre_completo = 'Shamil Moreno',
         email = COALESCE(email, 'shamil.moreno@weworkintegrados.com'),
         rol = 'ADMIN',
         puede_crear = TRUE,
         puede_editar = TRUE,
         puede_eliminar = TRUE,
         puede_computos = TRUE,
         puede_exportar = TRUE,
         puede_usuarios = TRUE,
         activo = TRUE
       WHERE LOWER(username) = 'shamilmoreno'`
    );
  }
}

async function initDatabase() {
  await ensureDatabaseExists();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);

  const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM materiales');
  const totalRecords = countResult.rows[0].total;

  if (totalRecords === 0) {
    console.log('Tabla "materiales" vacía. Insertando los 613 ítems iniciales desde materiales.json...');
    const materialesPath = path.join(__dirname, '..', 'data', 'materiales.json');
    const rawData = fs.readFileSync(materialesPath, 'utf8');
    const items = JSON.parse(rawData);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertText = `
        INSERT INTO materiales (titulo, categoria, descripcion, especificaciones, imagen_url, en_stock)
        VALUES ($1, $2, $3, $4, NULL, TRUE)
      `;
      for (const item of items) {
        await client.query(insertText, [item.t, item.c, item.d, item.s]);
      }
      await client.query('COMMIT');
      console.log(`Se insertaron ${items.length} materiales en PostgreSQL correctamente.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    console.log(`PostgreSQL listo: ${totalRecords} materiales registrados en la tabla "materiales".`);
  }

  await seedDefaultSuppliers();
  await seedDefaultFamilias();
  await ensureMainUser();
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Inicialización de base de datos y usuario principal en PostgreSQL completada.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error al inicializar la base de datos PostgreSQL:', err.message);
      process.exit(1);
    });
}

module.exports = { initDatabase, hashPassword };
