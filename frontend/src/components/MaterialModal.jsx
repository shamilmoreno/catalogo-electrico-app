import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, resolveMediaUrl } from '../utils/api';

export const CATEGORIES = [
  'Abrazaderas',
  'Aisladores y Accesorios',
  'Anclas, Guayas, Flejes y Herrajes de Línea',
  'Cables, Conductores y Cintas',
  'Conectores y Terminales',
  'Fusibles, Seccionadores y Protección',
  'Postes, Crucetas, Estructuras y Soportes',
  'Sistemas de Puesta a Tierra y Equipos',
  'Tapas, Tanquillas y Cajas',
  'Tornillería y Fijación',
  'Tubos, Conduits y Ductos',
];

const CATEGORY_DEFAULT_DESC = {
  'Abrazaderas':
    'Abrazadera metálica utilizada para fijar elementos, tubos o crucetas a postes o estructuras.',
  'Aisladores y Accesorios':
    'Aislador eléctrico o accesorio diseñado para dar soporte mecánico y aislamiento dieléctrico a conductores en redes de distribución.',
  'Anclas, Guayas, Flejes y Herrajes de Línea':
    'Herraje o elemento de retenida utilizado para el anclaje, tensado y sujeción mecánica de líneas aéreas.',
  'Cables, Conductores y Cintas':
    'Conductor eléctrico o cinta aislante para transporte de energía, empalmes y aislamiento en redes eléctricas.',
  'Conectores y Terminales':
    'Conector o terminal eléctrico diseñado para asegurar la continuidad eléctrica y fijación mecánica entre conductores o equipos.',
  'Fusibles, Seccionadores y Protección':
    'Dispositivo de maniobra y protección contra sobrecorrientes o sobretensiones en redes de distribución eléctrica.',
  'Postes, Crucetas, Estructuras y Soportes':
    'Elemento estructural de soporte para el tendido y montaje de herrajes, aisladores y equipos en líneas eléctricas.',
  'Sistemas de Puesta a Tierra y Equipos':
    'Componente para el sistema de puesta a tierra y disipación segura de corrientes de falla.',
  'Tapas, Tanquillas y Cajas':
    'Elemento de canalización subterránea o registro para alojamiento, inspección y protección de conexiones eléctricas.',
  'Tornillería y Fijación':
    'Elemento de tornillería y fijación mecánica para el ensamblaje seguro de estructuras y herrajes.',
  'Tubos, Conduits y Ductos':
    'Tubería o conducto eléctrico para la canalización y protección mecánica de conductores.',
};

const CATEGORY_DEFAULT_SUPPLIER = {
  'Abrazaderas': 'Herrajes Eléctricos C.A. / Industrias Galvanizadas (Ref. Hubbell / Chance)',
  'Aisladores y Accesorios': 'Suministros de Media Tensión (Ref. Gamma / Lapp Insulators / Hubbell)',
  'Anclas, Guayas, Flejes y Herrajes de Línea': 'Ferretería de Líneas Eléctricas (Ref. PLP - Preformed Line Products)',
  'Cables, Conductores y Cintas': 'Conductores Eléctricos Nacionales (Ref. Elecon / Cabel / 3M)',
  'Conectores y Terminales': 'Distribuidora de Conectores Eléctricos (Ref. Burndy / Blackburn / Ilsco)',
  'Fusibles, Seccionadores y Protección': 'Equipos de Protección y Maniobra MT (Ref. S&C / Cooper Power / ABB)',
  'Postes, Crucetas, Estructuras y Soportes': 'Metalúrgica de Postes y Crucetas Eléctricas C.A.',
  'Sistemas de Puesta a Tierra y Equipos': 'Sistemas de Puesta a Tierra y Pararrayos (Ref. Erico / Copperweld)',
  'Tapas, Tanquillas y Cajas': 'Fundición y Prefabricados Eléctricos C.A.',
  'Tornillería y Fijación': 'Tornillería Industrial Galvanizada y Bronce C.A.',
  'Tubos, Conduits y Ductos': 'Tuberías y Canalizaciones Eléctricas (Ref. Conduit Aluminio / PVC)',
};

function generateSpecsFromTitle(title) {
  const upper = (title || '').toUpperCase();
  const specs = [];

  if (/\bAG\b|GALVANIZAD/.test(upper)) {
    specs.push('AG: Acero Galvanizado en caliente (protección anticorrosiva para intemperie).');
  }
  if (/\bAL\b|ALUMINIO|ALUM\b/.test(upper)) {
    specs.push('AL: Aleación de Aluminio (material conductor ligero para redes aéreas).');
  }
  if (/\bCU\b|COBRE/.test(upper)) {
    specs.push('CU: Cobre electrolítico de alta conductividad.');
  }
  if (/BRONCE|BRNCE/.test(upper)) {
    specs.push('Aleación de Bronce / Bronce-Silicio de alta resistencia mecánica y a la corrosión.');
  }
  if (/\bACSR\b|\bARVIDAL\b/.test(upper)) {
    specs.push('ACSR / Arvidal: Conductor de Aluminio con alma de Acero.');
  }
  if (/\b2T\b/.test(upper)) specs.push('2T: Diseño con 2 pernos o tornillos de ajuste.');
  if (/\b3T\b|3TDI/.test(upper)) specs.push('3T: Diseño con 3 pernos o tornillos de ajuste.');
  if (/\b4T\b/.test(upper)) specs.push('4T: Diseño con 4 pernos o tornillos de ajuste.');
  if (/\bAWG\b|\bMCM\b|\bKCMIL\b/.test(upper)) {
    specs.push('AWG / MCM: Calibre normalizado de sección transversal del conductor.');
  }
  if (/\bKV\b|13\.8|24KV|34\.5/.test(upper)) {
    specs.push('kV: Nivel de tensión nominal de aislamiento en Media/Alta Tensión.');
  }

  return specs.length > 0
    ? specs.join(' | ')
    : 'Detalles técnicos específicos de dimensiones, diámetros, calibres y tolerancias indicados en la descripción para su correcta aplicación.';
}

export default function MaterialModal({
  isOpen,
  mode = 'create',
  item,
  familias = [],
  onOpenFamiliasModal,
  onClose,
  onSubmit,
}) {
  const familyList =
    familias && familias.length > 0
      ? familias
      : CATEGORIES.map((nombre) => ({
          nombre,
          descripcion: CATEGORY_DEFAULT_DESC[nombre] || '',
          proveedor_sugerido: CATEGORY_DEFAULT_SUPPLIER[nombre] || '',
        }));

  const getFamilyDefaultDesc = (famName) => {
    const found = familyList.find((f) => f.nombre === famName);
    return (
      found?.descripcion ||
      CATEGORY_DEFAULT_DESC[famName] ||
      'Material o componente eléctrico especializado para instalaciones de infraestructura y redes.'
    );
  };

  const getFamilyDefaultSupplier = (famName) => {
    const found = familyList.find((f) => f.nombre === famName);
    return (
      found?.proveedor_sugerido ||
      CATEGORY_DEFAULT_SUPPLIER[famName] ||
      'Distribuidor Autorizado de Materiales Eléctricos'
    );
  };

  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIES[0]);
  const [descripcion, setDescripcion] = useState('');
  const [especificaciones, setEspecificaciones] = useState('');
  const [normaTecnica, setNormaTecnica] = useState('');
  const [nivelTension, setNivelTension] = useState('');
  const [materialBase, setMaterialBase] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [proveedorContacto, setProveedorContacto] = useState('');
  const [proveedorUrl, setProveedorUrl] = useState('');
  const [precioReferencia, setPrecioReferencia] = useState('');
  const [enStock, setEnStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormError('');
      const defaultFam = familyList[0]?.nombre || CATEGORIES[0];
      if (mode === 'edit' && item) {
        setTitulo(item.title || '');
        setCategoria(item.category || defaultFam);
        setDescripcion(item.description || '');
        setEspecificaciones(item.specs || '');
        setNormaTecnica(item.norma_tecnica || '');
        setNivelTension(item.nivel_tension || '');
        setMaterialBase(item.material_base || '');
        setImagenUrl(item.imagen_url || '');
        setProveedorNombre(
          item.proveedor_nombre || getFamilyDefaultSupplier(item.category) || ''
        );
        setProveedorContacto(item.proveedor_contacto || '');
        setProveedorUrl(item.proveedor_url || '');
        setPrecioReferencia(
          item.precio_referencia != null ? String(item.precio_referencia) : ''
        );
        setEnStock(item.en_stock ?? true);
      } else {
        setTitulo('');
        setCategoria(defaultFam);
        setDescripcion(getFamilyDefaultDesc(defaultFam));
        setEspecificaciones('');
        setNormaTecnica('');
        setNivelTension('');
        setMaterialBase('');
        setImagenUrl('');
        setProveedorNombre(getFamilyDefaultSupplier(defaultFam));
        setProveedorContacto('Dpto. de Ventas Industriales / Procura Eléctrica');
        setProveedorUrl('');
        setPrecioReferencia('');
        setEnStock(true);
      }
    }
  }, [isOpen, mode, item]);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('imagen', file);

      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo subir la imagen desde tu PC.');
      }
      setImagenUrl(data.url);
    } catch (err) {
      setFormError(err.message || 'Error al subir la imagen desde tu PC.');
    } finally {
      setUploading(false);
    }
  };

  const handleAutoFill = () => {
    const desc = getFamilyDefaultDesc(categoria);
    const specs = generateSpecsFromTitle(titulo);
    setDescripcion(desc);
    setEspecificaciones(specs);
    if (!proveedorNombre.trim()) {
      setProveedorNombre(getFamilyDefaultSupplier(categoria));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setFormError('El título / código técnico del material es obligatorio.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await onSubmit({
        id: item?.id,
        titulo: titulo.trim().toUpperCase(),
        categoria,
        descripcion:
          descripcion.trim() || getFamilyDefaultDesc(categoria),
        especificaciones:
          especificaciones.trim() || generateSpecsFromTitle(titulo),
        norma_tecnica: normaTecnica.trim() || null,
        nivel_tension: nivelTension.trim() || null,
        material_base: materialBase.trim() || null,
        imagen_url: imagenUrl.trim() || null,
        proveedor_nombre:
          proveedorNombre.trim() || getFamilyDefaultSupplier(categoria) || null,
        proveedor_contacto: proveedorContacto.trim() || null,
        proveedor_url: proveedorUrl.trim() || null,
        precio_referencia:
          precioReferencia !== '' ? Number(precioReferencia) : null,
        en_stock: enStock,
      });
    } catch (err) {
      setFormError(err.message || 'Error al guardar el material en PostgreSQL.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <i
              className={`fa-solid ${
                mode === 'edit' ? 'fa-pen-to-square text-amber-500' : 'fa-plus-circle text-emerald-600'
              }`}
            ></i>
            <span>
              {mode === 'edit'
                ? `Editar Material Eléctrico (ID #${item?.id})`
                : 'Registrar Nuevo Material en PostgreSQL'}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-rose-600"></i>
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Título / Nomenclatura */}
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título / Nomenclatura Técnica <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder='Ej. ABRAZADERA UNIVERSAL AG 4" A 5" 4T'
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Estado en Stock */}
            <div className="sm:col-span-4 flex flex-col justify-end">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disponibilidad en Almacén
              </label>
              <button
                type="button"
                onClick={() => setEnStock(!enStock)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  enStock
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                }`}
              >
                <i className={`fa-solid ${enStock ? 'fa-check-circle' : 'fa-ban'}`}></i>
                <span>{enStock ? 'En Stock (Disponible)' : 'Sin Stock (Agotado)'}</span>
              </button>
            </div>
          </div>

          {/* Familia del Material + Botón de autocompletado eléctrico */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-7">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Familia del Material <span className="text-rose-500">*</span>
                </label>
                {onOpenFamiliasModal && (
                  <button
                    type="button"
                    onClick={onOpenFamiliasModal}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-layer-group text-[10px]"></i>
                    <span>+ Gestionar Familias</span>
                  </button>
                )}
              </div>
              <select
                value={categoria}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategoria(newCat);
                  if (mode === 'create') {
                    setDescripcion(getFamilyDefaultDesc(newCat));
                    setProveedorNombre(getFamilyDefaultSupplier(newCat));
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
              >
                {familyList.map((fam) => (
                  <option key={fam.nombre} value={fam.nombre}>
                    {fam.codigo ? `[${fam.codigo}] ` : ''}
                    {fam.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <button
                type="button"
                onClick={handleAutoFill}
                className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Genera automáticamente la descripción y analiza siglas como AG, AL, CU, ACSR, 3T, 4T"
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>Autocompletar Ficha Técnica</span>
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción Funcional
            </label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción técnica de la función del material..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Especificaciones / Nomenclaturas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Significado de Nomenclaturas / Especificaciones Técnicas
            </label>
            <textarea
              rows={2}
              value={especificaciones}
              onChange={(e) => setEspecificaciones(e.target.value)}
              placeholder="Ej. AG: Acero Galvanizado | 3T: 3 Tornillos..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Parámetros de Ingeniería Opcionales (Material Base, Tensión, Norma) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Material Constructivo
              </label>
              <input
                type="text"
                value={materialBase}
                onChange={(e) => setMaterialBase(e.target.value)}
                placeholder="Ej. Acero Galvanizado ASTM A153"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nivel de Tensión Nominal
              </label>
              <input
                type="text"
                value={nivelTension}
                onChange={(e) => setNivelTension(e.target.value)}
                placeholder="Ej. Media Tensión 13.8 kV / 24 kV"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Normas Técnicas de Referencia
              </label>
              <input
                type="text"
                value={normaTecnica}
                onChange={(e) => setNormaTecnica(e.target.value)}
                placeholder="Ej. CORPOELEC / ANSI C135.1"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Sección de Proveedor de Referencia y Procura */}
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-store text-amber-600"></i>
              <span>Proveedor de Referencia donde Comprar / Cotizar</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nombre del Proveedor / Fabricante / Tienda
                </label>
                <input
                  type="text"
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                  placeholder="Ej. Suministros Eléctricos C.A. / Hubbell / 3M / Elecon"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Precio Ref. Unitario (USD $)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioReferencia}
                  onChange={(e) => setPrecioReferencia(e.target.value)}
                  placeholder="Ej. 14.50"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Teléfono / WhatsApp / Correo / Ubicación
                </label>
                <input
                  type="text"
                  value={proveedorContacto}
                  onChange={(e) => setProveedorContacto(e.target.value)}
                  placeholder="Ej. +58 414-0000000 / ventas@proveedor.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Enlace Web de Compra / Catálogo del Proveedor
                </label>
                <input
                  type="url"
                  value={proveedorUrl}
                  onChange={(e) => setProveedorUrl(e.target.value)}
                  placeholder="https://tienda-electrica.com/producto"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Subir Imagen desde PC o URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Imagen del Material (Subir desde tu PC o pegar URL — se guarda en <code className="text-sky-700">imagen_url</code>)
            </label>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              >
                <i className={`fa-solid ${uploading ? 'fa-circle-notch fa-spin' : 'fa-upload'}`}></i>
                <span>{uploading ? 'Subiendo...' : 'Subir desde mi PC'}</span>
              </button>

              <input
                type="url"
                value={imagenUrl}
                onChange={(e) => setImagenUrl(e.target.value)}
                placeholder="O pega un enlace https://ejemplo.com/foto.jpg"
                className="flex-grow px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />

              {imagenUrl && (
                <button
                  type="button"
                  onClick={() => setImagenUrl('')}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-medium cursor-pointer shrink-0"
                >
                  Limpiar
                </button>
              )}
            </div>

            {imagenUrl.trim() && (
              <div className="mt-2 border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                <img
                  src={resolveMediaUrl(imagenUrl)}
                  alt="Vista previa"
                  className="h-24 object-contain mx-auto rounded bg-white p-1 border border-slate-100"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    e.target.style.display = 'block';
                  }}
                />
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className={`px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                mode === 'edit'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <i className={`fa-solid ${mode === 'edit' ? 'fa-floppy-disk' : 'fa-plus'}`}></i>
              <span>
                {saving
                  ? 'Guardando en PostgreSQL...'
                  : mode === 'edit'
                  ? 'Guardar Cambios'
                  : 'Crear Material'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
