-- Esquema PostgreSQL para el Catálogo Técnico de Materiales Eléctricos (613 Ítems)

CREATE TABLE IF NOT EXISTS materiales (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    categoria VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    especificaciones TEXT NOT NULL,
    imagen_url TEXT DEFAULT NULL,
    datasheet_url TEXT DEFAULT NULL,
    norma_tecnica VARCHAR(150) DEFAULT NULL,
    nivel_tension VARCHAR(100) DEFAULT NULL,
    material_base VARCHAR(150) DEFAULT NULL,
    proveedor_nombre VARCHAR(200) DEFAULT NULL,
    proveedor_contacto VARCHAR(200) DEFAULT NULL,
    proveedor_url TEXT DEFAULT NULL,
    precio_referencia NUMERIC(12, 2) DEFAULT NULL,
    en_stock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas adicionales en tablas ya existentes
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS datasheet_url TEXT DEFAULT NULL;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS norma_tecnica VARCHAR(150) DEFAULT NULL;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS nivel_tension VARCHAR(100) DEFAULT NULL;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS material_base VARCHAR(150) DEFAULT NULL;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS proveedor_nombre VARCHAR(200) DEFAULT NULL;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS proveedor_contacto VARCHAR(200) DEFAULT NULL;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS proveedor_url TEXT DEFAULT NULL;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS precio_referencia NUMERIC(12, 2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_materiales_categoria ON materiales(categoria);
CREATE INDEX IF NOT EXISTS idx_materiales_titulo ON materiales(titulo);

-- Tablas para el Módulo de Cómputos Métricos / Requisición de Materiales
CREATE TABLE IF NOT EXISTS requisiciones (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL,
    proyecto VARCHAR(255) NOT NULL,
    solicitante VARCHAR(150) DEFAULT '',
    ubicacion VARCHAR(200) DEFAULT '',
    nivel_tension VARCHAR(50) DEFAULT '13.8 kV / BT',
    observaciones TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requisicion_items (
    id SERIAL PRIMARY KEY,
    requisicion_id INTEGER NOT NULL REFERENCES requisiciones(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materiales(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    categoria VARCHAR(150) NOT NULL,
    unidad VARCHAR(30) NOT NULL DEFAULT 'PZA',
    cantidad NUMERIC(12, 2) NOT NULL DEFAULT 1,
    nota_tecnica VARCHAR(255) DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_req_items_requisicion_id ON requisicion_items(requisicion_id);

-- Tabla de Familias de Materiales (anteriormente Categorías) con soporte CRUD
CREATE TABLE IF NOT EXISTS familias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    codigo VARCHAR(40) DEFAULT '',
    descripcion TEXT DEFAULT '',
    proveedor_sugerido VARCHAR(200) DEFAULT '',
    color_badge VARCHAR(40) DEFAULT 'sky',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios con Roles, Permisos Granulares (RBAC) y Recuperación de Contraseña
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(180) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    cargo VARCHAR(120) DEFAULT '',
    rol VARCHAR(40) NOT NULL DEFAULT 'VISOR',
    puede_crear BOOLEAN DEFAULT FALSE,
    puede_editar BOOLEAN DEFAULT FALSE,
    puede_eliminar BOOLEAN DEFAULT FALSE,
    puede_computos BOOLEAN DEFAULT FALSE,
    puede_exportar BOOLEAN DEFAULT FALSE,
    puede_usuarios BOOLEAN DEFAULT FALSE,
    reset_code VARCHAR(20) DEFAULT NULL,
    reset_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(180) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_code VARCHAR(20) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL;
