import React from 'react';

export function CategorySVG({ category }) {
  switch (category) {
    case 'Abrazaderas':
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <path d="M 60 110 V 50 C 60 25, 140 25, 140 50 V 110" stroke="#0284c7" strokeWidth="12" strokeLinecap="round" />
          <path d="M 60 110 V 50 C 60 25, 140 25, 140 50 V 110" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
          <rect x="40" y="110" width="120" height="12" rx="2" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
          <text x="100" y="148" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            ABRAZADERA
          </text>
        </svg>
      );
    case 'Aisladores y Accesorios':
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <path d="M 100 20 V 140" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
          <path d="M 50 50 C 50 38, 150 38, 150 50 C 130 62, 70 62, 50 50 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="2" />
          <path d="M 55 75 C 55 63, 145 63, 145 75 C 125 87, 75 87, 55 75 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="2" />
          <text x="100" y="152" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            AISLADOR
          </text>
        </svg>
      );
    case 'Fusibles, Seccionadores y Protección':
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <path d="M 60 30 H 140" stroke="#64748b" strokeWidth="6" />
          <path d="M 60 40 V 120" stroke="#f43f5e" strokeWidth="8" strokeLinecap="round" />
          <line x1="60" y1="40" x2="140" y2="120" stroke="#0284c7" strokeWidth="10" strokeLinecap="round" />
          <text x="100" y="150" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            PROTECCIÓN
          </text>
        </svg>
      );
    case 'Conectores y Terminales':
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <circle cx="100" cy="70" r="18" fill="#a855f7" stroke="#581c87" strokeWidth="2" />
          <circle cx="66" cy="70" r="16" fill="#c084fc" stroke="#581c87" strokeWidth="2" />
          <circle cx="134" cy="70" r="16" fill="#c084fc" stroke="#581c87" strokeWidth="2" />
          <text x="100" y="142" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            CONECTOR
          </text>
        </svg>
      );
    case 'Postes, Crucetas, Estructuras y Soportes':
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <polygon points="92,145 108,145 103,20 97,20" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
          <rect x="40" y="40" width="120" height="10" rx="2" fill="#0284c7" stroke="#0f172a" strokeWidth="2" />
          <text x="100" y="152" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            POSTE / SOPORTE
          </text>
        </svg>
      );
    case 'Tornillería y Fijación':
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <rect x="70" y="40" width="60" height="80" rx="8" fill="#6366f1" stroke="#4338ca" strokeWidth="2" />
          <text x="100" y="146" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            TORNILLERÍA
          </text>
        </svg>
      );
    case 'Tubos, Conduits y Ductos':
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <rect x="40" y="60" width="120" height="40" rx="6" fill="#14b8a6" stroke="#0f766e" strokeWidth="2" />
          <text x="100" y="146" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            TUBO CONDUIT
          </text>
        </svg>
      );
    default:
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 160" fill="none">
          <rect width="200" height="160" fill="#f8fafc" />
          <rect x="50" y="45" width="100" height="70" rx="10" fill="#10b981" stroke="#047857" strokeWidth="3" />
          <text x="100" y="146" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
            MATERIAL ELÉCTRICO
          </text>
        </svg>
      );
  }
}

function getCategoryBadgeClass(category) {
  switch (category) {
    case 'Abrazaderas':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Aisladores y Accesorios':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Conectores y Terminales':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Fusibles, Seccionadores y Protección':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'Anclas, Guayas, Flejes y Herrajes de Línea':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'Postes, Crucetas, Estructuras y Soportes':
      return 'bg-slate-200 text-slate-800 border-slate-300';
    case 'Tapas, Tanquillas y Cajas':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Tornillería y Fijación':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Tubos, Conduits y Ductos':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'Cables, Conductores y Cintas':
      return 'bg-stone-100 text-stone-800 border-stone-200';
    default:
      return 'bg-violet-100 text-violet-800 border-violet-200';
  }
}

export default function ProductCard({
  item,
  customImg,
  currentUser,
  reqItem,
  onAddToReq,
  onUpdateReqQty,
  onOpenImageModal,
  onOpenDatasheet,
  onEditMaterial,
  onDeleteMaterial,
  onToggleStock,
}) {
  const activeImage = item.imagen_url || customImg;
  const canEdit = Boolean(currentUser?.puede_editar);
  const canDelete = Boolean(currentUser?.puede_eliminar);
  const canComputos = Boolean(currentUser?.puede_computos);

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    'material electrico ' + item.title
  )}&tbm=isch`;

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col card-print ${
        reqItem ? 'border-indigo-400 ring-1 ring-indigo-300' : 'border-slate-200'
      }`}
    >
      <div className="h-40 bg-slate-50 border-b border-slate-100 relative group overflow-hidden flex items-center justify-center">
        {/* Badge de ID en la esquina superior izquierda */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
          <span className="bg-slate-900/75 text-white text-[10px] font-mono px-2 py-0.5 rounded">
            #{item.id}
          </span>
          {item.datasheet_url && (
            <span
              className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow"
              title="Contiene Hoja de Datos PDF del fabricante adjunta"
            >
              <i className="fa-solid fa-file-pdf mr-0.5"></i>PDF
            </span>
          )}
        </div>

        {/* Indicador si está en la planilla de cómputos */}
        {reqItem && canComputos && (
          <span className="absolute top-2 right-2 z-10 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
            En Cómputo: {reqItem.cantidad} {reqItem.unidad}
          </span>
        )}

        {activeImage ? (
          <img
            src={activeImage}
            alt={item.title}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <CategorySVG category={item.category} />
        )}

        <div className="absolute inset-0 bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-1.5 p-2.5 no-print">
          <button
            onClick={() => onOpenDatasheet(item)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow flex items-center gap-1 transition cursor-pointer border border-slate-600"
            title="Ver Ficha Técnica Detallada"
          >
            <i className="fa-solid fa-file-invoice text-sky-400"></i>
            <span>Ficha</span>
          </button>
          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow flex items-center gap-1 transition"
            title="Buscar referencia en Google Imágenes"
          >
            <i className="fa-solid fa-magnifying-glass text-sky-600"></i>
            <span>Buscar</span>
          </a>
          {canEdit && (
            <button
              onClick={() => onOpenImageModal(item)}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow flex items-center gap-1 transition cursor-pointer"
              title="Subir foto desde tu PC o URL"
            >
              <i className="fa-solid fa-camera"></i>
              <span>Foto</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border truncate ${getCategoryBadgeClass(
              item.category
            )}`}
            title={item.category}
          >
            {item.category}
          </span>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => canEdit && onToggleStock(item)}
            title={
              canEdit
                ? 'Clic para cambiar estado de disponibilidad en PostgreSQL'
                : 'Disponibilidad en almacén'
            }
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition flex items-center shrink-0 ${
              canEdit ? 'cursor-pointer' : 'cursor-default'
            } ${
              item.en_stock !== false
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}
          >
            <i
              className={`fa-solid ${
                item.en_stock !== false ? 'fa-check' : 'fa-xmark'
              } text-[9px] mr-1`}
            ></i>
            {item.en_stock !== false ? 'Stock' : 'Agotado'}
          </button>
        </div>

        <h3
          onClick={() => onOpenDatasheet(item)}
          className="text-xs font-bold text-slate-900 hover:text-sky-600 cursor-pointer leading-snug line-clamp-2 transition"
          title="Clic para abrir la Ficha Técnica Detallada"
        >
          {item.title}
        </h3>

        {/* Descripción detallada */}
        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px] text-slate-600">
          <p className="font-semibold text-slate-700 mb-0.5">
            <i className="fa-solid fa-circle-info text-sky-600 mr-1"></i>
            Descripción:
          </p>
          <p className="line-clamp-2" title={item.description}>
            {item.description}
          </p>
        </div>

        {/* Significado de Nomenclaturas */}
        <div className="bg-sky-50/50 p-2 rounded border border-sky-100 text-[11px] text-sky-900">
          <p className="font-semibold text-sky-800 mb-0.5">
            <i className="fa-solid fa-tag text-sky-600 mr-1"></i>
            Nomenclaturas / Especificaciones:
          </p>
          <p className="line-clamp-2" title={item.specs}>
            {item.specs}
          </p>
        </div>

        {/* Proveedor de Referencia */}
        <div className="bg-amber-50/60 p-2 rounded border border-amber-200/70 text-[11px] text-slate-700 flex-grow">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-semibold text-amber-900 flex items-center gap-1">
              <i className="fa-solid fa-store text-amber-600"></i>
              <span>Proveedor Ref.:</span>
            </span>
            {item.precio_referencia != null && Number(item.precio_referencia) > 0 && (
              <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.2 rounded text-[10px]">
                ${Number(item.precio_referencia).toFixed(2)}
              </span>
            )}
          </div>
          <p
            className="line-clamp-1 font-medium text-slate-800"
            title={item.proveedor_nombre || 'Distribuidor Autorizado de Materiales Eléctricos'}
          >
            {item.proveedor_nombre || 'Distribuidor Autorizado de Materiales Eléctricos'}
          </p>
          {item.proveedor_url && (
            <a
              href={item.proveedor_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-sky-600 hover:underline font-semibold inline-flex items-center gap-1 mt-0.5 no-print"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              <span>Ir a tienda / cotizar</span>
            </a>
          )}
        </div>

        {/* Barra inferior de Acciones según Permisos del Rol */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[11px] no-print">
          {canComputos ? (
            reqItem ? (
              <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-lg px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateReqQty(item.id, reqItem.cantidad - 1)}
                  className="w-5 h-5 rounded bg-white hover:bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="px-1 font-bold text-indigo-900 text-xs">
                  {reqItem.cantidad} {reqItem.unidad}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateReqQty(item.id, reqItem.cantidad + 1)}
                  className="w-5 h-5 rounded bg-white hover:bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAddToReq(item)}
                className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                <span>Cómputo</span>
              </button>
            )
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">
              Vista de consulta
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDatasheet(item)}
              className="text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Ver Ficha Técnica Detallada"
            >
              <i className="fa-solid fa-file-lines text-sky-600"></i>
              <span>Ficha</span>
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => onEditMaterial(item)}
                className="text-slate-500 hover:text-amber-600 font-medium flex items-center transition cursor-pointer"
                title="Editar material"
              >
                <i className="fa-solid fa-pen-to-square"></i>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDeleteMaterial(item)}
                className="text-slate-400 hover:text-rose-600 font-medium flex items-center transition cursor-pointer"
                title="Eliminar material"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
