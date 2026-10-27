import React from 'react';

const DEFAULT_FAMILIAS = [
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

export default function SearchAndFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  itemsPerPage,
  onLimitChange,
  totalItemsCount = 613,
  familias = [],
  onOpenFamiliasModal,
}) {
  const familyOptions =
    familias && familias.length > 0
      ? familias.map((f) => (typeof f === 'string' ? { nombre: f } : f))
      : DEFAULT_FAMILIAS.map((nombre) => ({ nombre }));

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4 no-print">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Buscador por texto */}
        <div className="md:col-span-5 lg:col-span-6 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Busca por pieza, familia, descripción o nomenclatura (ej. AG, 3T)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Filtro por Familia + Botón rápido para CRUD de Familias */}
        <div className="md:col-span-5 lg:col-span-4 flex items-center gap-2">
          <div className="relative flex-grow">
            <i className="fa-solid fa-layer-group absolute left-3.5 top-3.5 text-sky-600 text-sm"></i>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer font-medium"
            >
              <option value="ALL">Todas las Familias ({totalItemsCount})</option>
              {familyOptions.map((fam) => (
                <option key={fam.nombre} value={fam.nombre}>
                  {fam.codigo ? `[${fam.codigo}] ` : ''}
                  {fam.nombre}
                  {fam.total_materiales != null ? ` (${fam.total_materiales})` : ''}
                </option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-3.5 top-3.5 text-slate-400 text-xs pointer-events-none"></i>
          </div>

          {onOpenFamiliasModal && (
            <button
              type="button"
              onClick={onOpenFamiliasModal}
              className="px-3 py-2.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 hover:border-sky-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Gestionar Familias (Crear, Editar o Eliminar Familias)"
            >
              <i className="fa-solid fa-sliders"></i>
              <span className="hidden sm:inline">Familias</span>
            </button>
          )}
        </div>

        {/* Selector de límite por página */}
        <div className="md:col-span-2 lg:col-span-2 relative">
          <select
            value={itemsPerPage}
            onChange={(e) => onLimitChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer font-medium"
          >
            <option value="24">24 por pág.</option>
            <option value="48">48 por pág.</option>
            <option value="100">100 por pág.</option>
            <option value="ALL">Mostrar Todos ({totalItemsCount})</option>
          </select>
        </div>
      </div>
    </div>
  );
}
