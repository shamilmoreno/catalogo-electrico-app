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
  statusFilter = 'ALL',
  onStatusFilterChange,
  itemsPerPage,
  onLimitChange,
  totalItemsCount = 613,
  filterCounts = {},
  familias = [],
  onOpenFamiliasModal,
}) {
  const familyOptions =
    familias && familias.length > 0
      ? familias.map((f) => (typeof f === 'string' ? { nombre: f } : f))
      : DEFAULT_FAMILIAS.map((nombre) => ({ nombre }));

  const STATUS_PILLS = [
    { id: 'ALL', label: 'Todos', count: totalItemsCount, icon: 'fa-border-all' },
    { id: 'IN_STOCK', label: 'En Stock', count: filterCounts.inStock, icon: 'fa-check-circle text-emerald-600' },
    { id: 'OUT_OF_STOCK', label: 'Agotados', count: filterCounts.outOfStock, icon: 'fa-ban text-rose-600' },
    { id: 'WITH_PHOTO', label: 'Con Foto', count: filterCounts.withPhoto, icon: 'fa-camera text-servimeta-700' },
    { id: 'WITHOUT_PHOTO', label: 'Sin Foto', count: filterCounts.withoutPhoto, icon: 'fa-image text-amber-600' },
    { id: 'WITH_PDF', label: 'Con Ficha PDF', count: filterCounts.withPdf, icon: 'fa-file-pdf text-servimeta-800' },
  ];

  const hasActiveFilters =
    Boolean(searchQuery) || selectedCategory !== 'ALL' || statusFilter !== 'ALL';

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-zinc-200 border-t-4 border-t-servimeta-800 mb-6 space-y-3.5 no-print">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Buscador por texto */}
        <div className="md:col-span-5 lg:col-span-6 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-zinc-400 text-sm"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Busca por pieza, familia, descripción o nomenclatura (ej. AG, 3T)..."
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-servimeta-700 focus:border-servimeta-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              title="Limpiar búsqueda"
            >
              <i className="fa-solid fa-circle-xmark text-sm"></i>
            </button>
          )}
        </div>

        {/* Filtro por Familia + Botón rápido para CRUD de Familias */}
        <div className="md:col-span-5 lg:col-span-4 flex items-center gap-2">
          <div className="relative flex-grow">
            <i className="fa-solid fa-layer-group absolute left-3.5 top-3.5 text-servimeta-700 text-sm"></i>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-servimeta-700 focus:border-servimeta-700 appearance-none cursor-pointer font-medium"
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
            <i className="fa-solid fa-chevron-down absolute right-3.5 top-3.5 text-zinc-400 text-xs pointer-events-none"></i>
          </div>

          {onOpenFamiliasModal && (
            <button
              type="button"
              onClick={onOpenFamiliasModal}
              className="px-3 py-2.5 bg-servimeta-50 hover:bg-servimeta-800 text-servimeta-800 hover:text-white border border-servimeta-200 hover:border-servimeta-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
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
            className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-servimeta-700 focus:border-servimeta-700 cursor-pointer font-medium"
          >
            <option value="24">24 por pág.</option>
            <option value="48">48 por pág.</option>
            <option value="100">100 por pág.</option>
            <option value="ALL">Mostrar Todos ({totalItemsCount})</option>
          </select>
        </div>
      </div>

      {/* Filtros rápidos de estado y auditoría */}
      {onStatusFilterChange && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_PILLS.map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => onStatusFilterChange(pill.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-servimeta-800 text-white border-servimeta-800 shadow-sm'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}
                >
                  <i className={`fa-solid ${pill.icon} ${active ? '!text-servimeta-200' : ''} text-[11px]`}></i>
                  <span>{pill.label}</span>
                  {pill.count != null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active ? 'bg-zinc-950/60 text-white' : 'bg-zinc-200/80 text-zinc-700'
                      }`}
                    >
                      {pill.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onCategoryChange('ALL');
                onStatusFilterChange('ALL');
              }}
              className="text-xs text-servimeta-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left text-[10px]"></i>
              <span>Restablecer filtros</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
