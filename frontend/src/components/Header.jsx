import React, { useState, useRef, useEffect } from 'react';

export default function Header({
  totalCount = 613,
  familiasCount = 11,
  reqCount = 0,
  currentUser,
  onLogout,
  onOpenUsersModal,
  onOpenFamiliasModal,
  onOpenCreateModal,
  onOpenRequisitionModal,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar menú desplegable de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrint = () => {
    if (!currentUser?.puede_exportar) {
      alert('Tu perfil de usuario no tiene permisos para descargar o imprimir el catálogo.');
      return;
    }
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    window.print();
  };

  // Iniciales del usuario para el avatar
  const initials = (currentUser?.nombre_completo || currentUser?.username || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <header className="bg-slate-900/95 backdrop-blur-md text-white shadow-lg sticky top-0 z-50 border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* ZONA IZQUIERDA: Identidad del Sistema */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-gradient-to-br from-sky-500 to-sky-700 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shadow-sky-950/50 shrink-0">
              <i className="fa-solid fa-bolt text-lg"></i>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight text-white truncate">
                  Catálogo de Materiales Eléctricos
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 bg-sky-500/15 text-sky-300 text-[11px] px-2.5 py-0.5 rounded-full border border-sky-400/25 font-semibold shrink-0">
                  <span>{totalCount} Ítems</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Gestión Técnica por Familias, Cómputos Métricos y Proveedores
              </p>
            </div>
          </div>

          {/* ZONA DERECHA (ESCRITORIO lg+): Botones Principales + Menú de Perfil */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* Grupo de Acciones Frecuentes del Catálogo */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
              {/* 1. Crear Nuevo Material */}
              {currentUser?.puede_crear && (
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Registrar nuevo material eléctrico"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>Nuevo Material</span>
                </button>
              )}

              {/* 2. Gestión de Familias (CRUD) */}
              <button
                type="button"
                onClick={onOpenFamiliasModal}
                className="bg-slate-700/80 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Administrar Familias de Materiales (Crear, Editar, Eliminar)"
              >
                <i className="fa-solid fa-layer-group text-sky-400"></i>
                <span>Familias</span>
                <span className="bg-slate-900/90 text-sky-300 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {familiasCount}
                </span>
              </button>

              {/* 3. Cómputos Métricos / Requisición */}
              {currentUser?.puede_computos && (
                <button
                  type="button"
                  onClick={onOpenRequisitionModal}
                  className="bg-indigo-600/90 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Abrir Planilla de Cómputos Métricos y Requisición"
                >
                  <i className="fa-solid fa-clipboard-list"></i>
                  <span>Cómputos</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      reqCount > 0
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-indigo-900 text-indigo-200'
                    }`}
                  >
                    {reqCount}
                  </span>
                </button>
              )}
            </div>

            {/* Botón Rápido de PDF o Indicador Solo Lectura */}
            {currentUser?.puede_exportar ? (
              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700 hover:border-sky-500 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Imprimir o guardar catálogo completo en PDF"
              >
                <i className="fa-solid fa-file-pdf text-sky-400"></i>
                <span className="hidden xl:inline">Catálogo PDF</span>
              </button>
            ) : (
              <span
                className="bg-slate-800/80 text-slate-400 border border-slate-700 px-2.5 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5"
                title="Perfil de solo visualización (sin descarga)"
              >
                <i className="fa-solid fa-lock text-amber-400 text-xs"></i>
                <span className="hidden xl:inline">Solo Lectura</span>
              </span>
            )}

            {/* Menú Desplegable de Usuario y Administración */}
            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 pl-2 pr-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                    {initials}
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="max-w-[140px] truncate">
                        {currentUser.nombre_completo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-sky-400 font-semibold">
                      <span>{currentUser.rol}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">@{currentUser.username}</span>
                    </div>
                  </div>
                  <i
                    className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${
                      userMenuOpen ? 'rotate-180 text-white' : ''
                    }`}
                  ></i>
                </button>

                {/* Dropdown Flotante de Usuario y Herramientas Administrativas */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    {/* Tarjeta de datos del usuario */}
                    <div className="bg-slate-900 text-white p-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {currentUser.nombre_completo}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {currentUser.email || `@${currentUser.username}`}
                          </p>
                          <span className="inline-block mt-1 text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded">
                            ROL: {currentUser.rol}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Opciones del Menú */}
                    <div className="p-2 space-y-1">
                      {currentUser.puede_usuarios && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onOpenUsersModal();
                          }}
                          className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <i className="fa-solid fa-users-gear text-rose-600 w-4 text-center"></i>
                            <span>Usuarios, Roles y Permisos</span>
                          </span>
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                            ADMIN
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenFamiliasModal();
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <i className="fa-solid fa-layer-group text-sky-600 w-4 text-center"></i>
                          <span>Administrar Familias (CRUD)</span>
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                          {familiasCount}
                        </span>
                      </button>

                      {currentUser.puede_exportar && (
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition cursor-pointer"
                        >
                          <i className="fa-solid fa-print text-slate-600 w-4 text-center"></i>
                          <span>Imprimir / Exportar Catálogo PDF</span>
                        </button>
                      )}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100/80 flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <i className="fa-solid fa-right-from-bracket"></i>
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ZONA DERECHA (MÓVIL Y TABLET < lg): Acceso Rápido + Botón Hamburguesa */}
          <div className="flex lg:hidden items-center gap-2">
            {currentUser?.puede_computos && (
              <button
                type="button"
                onClick={onOpenRequisitionModal}
                className="bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                title="Cómputos Métricos"
              >
                <i className="fa-solid fa-clipboard-list"></i>
                <span className="bg-amber-400 text-slate-950 px-1.5 rounded-full text-[10px]">
                  {reqCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:outline-none cursor-pointer"
              aria-label="Abrir menú de navegación"
            >
              <i
                className={`fa-solid ${
                  mobileMenuOpen ? 'fa-xmark' : 'fa-bars'
                } text-lg w-5 text-center`}
              ></i>
            </button>
          </div>
        </div>
      </div>

      {/* PANEL DESPLEGABLE RESPONSIVE PARA MÓVIL Y TABLET (< lg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-5 space-y-4 shadow-2xl">
          {/* Perfil del usuario conectado en móvil */}
          {currentUser && (
            <div className="flex items-center justify-between bg-slate-800/90 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>{currentUser.nombre_completo}</span>
                    <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.2 rounded">
                      {currentUser.rol}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {currentUser.email || `@${currentUser.username}`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Salir</span>
              </button>
            </div>
          )}

          {/* Cuadrícula de Botones de Acción en Móvil / Tablet */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {currentUser?.puede_crear && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCreateModal();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <i className="fa-solid fa-plus text-sm"></i>
                <span>Nuevo Material</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenFamiliasModal();
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-layer-group text-sky-400 text-sm"></i>
              <span>Familias ({familiasCount})</span>
            </button>

            {currentUser?.puede_computos && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRequisitionModal();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <i className="fa-solid fa-clipboard-list text-sm"></i>
                <span>Cómputos ({reqCount})</span>
              </button>
            )}

            {currentUser?.puede_usuarios && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenUsersModal();
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <i className="fa-solid fa-users-gear text-sm"></i>
                <span>Usuarios y Roles</span>
              </button>
            )}

            {currentUser?.puede_exportar && (
              <button
                type="button"
                onClick={handlePrint}
                className="bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <i className="fa-solid fa-print text-sm"></i>
                <span>Catálogo PDF</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
