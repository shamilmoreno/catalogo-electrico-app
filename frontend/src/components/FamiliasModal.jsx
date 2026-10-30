import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const BADGE_COLORS = [
  { id: 'sky', label: 'Azul Eléctrico', classes: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'blue', label: 'Azul Intenso', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'emerald', label: 'Verde Esmeralda', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'amber', label: 'Ámbar / Oro', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'rose', label: 'Rojo / Protección', classes: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'indigo', label: 'Índigo Industrial', classes: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'violet', label: 'Violeta Técnico', classes: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'teal', label: 'Turquesa / Ductos', classes: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'cyan', label: 'Cian / Líneas', classes: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'orange', label: 'Naranja / Civil', classes: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'slate', label: 'Gris Estructural', classes: 'bg-slate-200 text-slate-800 border-slate-300' },
  { id: 'stone', label: 'Bronce / Conductores', classes: 'bg-stone-100 text-stone-800 border-stone-200' },
];

export function getFamiliaBadgeClasses(colorId) {
  const found = BADGE_COLORS.find((c) => c.id === colorId);
  return found ? found.classes : 'bg-sky-100 text-sky-800 border-sky-200';
}

export default function FamiliasModal({
  isOpen,
  onClose,
  familias = [],
  currentUser,
  onFamiliasChanged,
  onSelectFamiliaFilter,
  apiBaseUrl = 'http://localhost:3000/api',
}) {
  const [editingId, setEditingId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [proveedorSugerido, setProveedorSugerido] = useState('');
  const [colorBadge, setColorBadge] = useState('sky');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [searchFam, setSearchFam] = useState('');
  const [reassignTarget, setReassignTarget] = useState({}); // { [familiaId]: targetNombre }

  const canManage = Boolean(
    currentUser?.puede_crear || currentUser?.puede_editar || currentUser?.puede_usuarios
  );
  const canDelete = Boolean(currentUser?.puede_eliminar || currentUser?.puede_usuarios);

  useEffect(() => {
    if (isOpen) {
      setStatusMsg(null);
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setCodigo('');
    setDescripcion('');
    setProveedorSugerido('');
    setColorBadge('sky');
  };

  const handleSelectEdit = (fam) => {
    setEditingId(fam.id);
    setNombre(fam.nombre || '');
    setCodigo(fam.codigo || '');
    setDescripcion(fam.descripcion || '');
    setProveedorSugerido(fam.proveedor_sugerido || '');
    setColorBadge(fam.color_badge || 'sky');
    setStatusMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'El nombre de la Familia es obligatorio.',
      });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const url = editingId
        ? `/familias/${editingId}`
        : '/familias';
      const method = editingId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          nombre: nombre.trim(),
          codigo: codigo.trim().toUpperCase(),
          descripcion: descripcion.trim(),
          proveedor_sugerido: proveedorSugerido.trim(),
          color_badge: colorBadge,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la Familia.');
      }

      setStatusMsg({
        type: 'success',
        text: data.message || 'Familia guardada correctamente en PostgreSQL.',
      });
      resetForm();
      if (onFamiliasChanged) {
        await onFamiliasChanged(data.old_nombre, data.familia?.nombre);
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fam) => {
    const count = Number(fam.total_materiales) || 0;
    let query = '';

    if (count > 0) {
      const targetName = reassignTarget[fam.id];
      if (!targetName) {
        setStatusMsg({
          type: 'error',
          text: `La familia "${fam.nombre}" tiene ${count} materiales. Selecciona en el desplegable a qué familia deseas moverlos antes de eliminarla.`,
        });
        return;
      }
      if (
        !window.confirm(
          `¿Eliminar la familia "${fam.nombre}" y mover sus ${count} materiales a la familia "${targetName}"?`
        )
      ) {
        return;
      }
      query = `?reasignar_a=${encodeURIComponent(targetName)}`;
    } else {
      if (!window.confirm(`¿Estás seguro de eliminar la familia "${fam.nombre}"?`)) {
        return;
      }
    }

    try {
      const res = await apiFetch(`/familias/${fam.id}${query}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar la familia.');
      }

      setStatusMsg({
        type: 'success',
        text: data.message || 'Familia eliminada correctamente.',
      });
      if (editingId === fam.id) resetForm();
      if (onFamiliasChanged) {
        await onFamiliasChanged();
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.message,
      });
    }
  };

  const filteredFamilias = familias.filter((f) => {
    const q = searchFam.toLowerCase().trim();
    if (!q) return true;
    return (
      (f.nombre || '').toLowerCase().includes(q) ||
      (f.codigo || '').toLowerCase().includes(q) ||
      (f.descripcion || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 no-print overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2.5 rounded-xl text-white shadow">
              <i className="fa-solid fa-layer-group text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">
                  Gestión de Familias de Materiales (CRUD)
                </h2>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {familias.length} Familias
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Crea, edita o reorganiza las familias técnicas del catálogo eléctrico en PostgreSQL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Cuerpo Principal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-grow bg-slate-50">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <i
                  className={`fa-solid ${
                    statusMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'
                  } text-sm`}
                ></i>
                <span>{statusMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMsg(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Formulario Crear / Editar Familia */}
            {canManage && (
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-fit">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <i
                      className={`fa-solid ${
                        editingId
                          ? 'fa-pen-to-square text-amber-500'
                          : 'fa-folder-plus text-emerald-600'
                      }`}
                    ></i>
                    <span>
                      {editingId
                        ? `Editar Familia #${editingId}`
                        : 'Crear Nueva Familia'}
                    </span>
                  </h3>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-sky-600 hover:underline font-semibold cursor-pointer"
                    >
                      + Cambiar a Crear Nueva
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nombre de la Familia <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej. Luminarias y Alumbrado Público"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Código Prefijo
                      </label>
                      <input
                        type="text"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                        placeholder="FAM-LUM"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {editingId && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>
                      Si cambias el nombre de esta familia, todos sus materiales se actualizarán automáticamente al nuevo nombre.
                    </p>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Descripción Técnica Predeterminada
                    </label>
                    <textarea
                      rows={2}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Descripción base para autocompletar materiales de esta familia..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Proveedor de Referencia Sugerido
                    </label>
                    <input
                      type="text"
                      value={proveedorSugerido}
                      onChange={(e) => setProveedorSugerido(e.target.value)}
                      placeholder="Ej. Suministros Eléctricos / Fabricante de Referencia"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Color Distintivo de la Etiqueta (Badge)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {BADGE_COLORS.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setColorBadge(col.id)}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-center truncate transition cursor-pointer ${
                            col.classes
                          } ${
                            colorBadge === col.id
                              ? 'ring-2 ring-slate-900 shadow-sm scale-[1.02]'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          {col.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        editingId
                          ? 'bg-amber-600 hover:bg-amber-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          editingId ? 'fa-floppy-disk' : 'fa-plus'
                        }`}
                      ></i>
                      <span>
                        {saving
                          ? 'Guardando...'
                          : editingId
                          ? 'Actualizar Familia'
                          : 'Crear Familia'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Columna Derecha: Listado de Familias Existentes */}
            <div
              className={`${
                canManage ? 'lg:col-span-7' : 'lg:col-span-12'
              } bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-boxes-stacked text-sky-600"></i>
                  <span>Familias Registradas ({filteredFamilias.length})</span>
                </h3>

                <div className="relative w-full sm:w-64">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    value={searchFam}
                    onChange={(e) => setSearchFam(e.target.value)}
                    placeholder="Buscar familia o código..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-2.5 max-h-[56vh] overflow-y-auto pr-1">
                {filteredFamilias.map((fam) => {
                  const matCount = Number(fam.total_materiales) || 0;
                  const otherFamilias = familias.filter((o) => o.id !== fam.id);

                  return (
                    <div
                      key={fam.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col gap-2 ${
                        editingId === fam.id
                          ? 'bg-sky-50/70 border-sky-400 ring-1 ring-sky-300'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold bg-slate-800 text-sky-300 px-2 py-0.5 rounded">
                              {fam.codigo || 'FAM'}
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded border ${getFamiliaBadgeClasses(
                                fam.color_badge
                              )}`}
                            >
                              {fam.nombre}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectFamiliaFilter) {
                                  onSelectFamiliaFilter(fam.nombre);
                                  onClose();
                                }
                              }}
                              className="text-[11px] font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 px-2 py-0.5 rounded-full transition cursor-pointer"
                              title="Filtrar catálogo por esta familia"
                            >
                              <i className="fa-solid fa-filter text-[9px] mr-1 text-sky-600"></i>
                              {matCount} {matCount === 1 ? 'ítem' : 'ítems'}
                            </button>
                          </div>

                          {fam.descripcion && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {fam.descripcion}
                            </p>
                          )}

                          {fam.proveedor_sugerido && (
                            <p className="text-[11px] text-amber-800 font-medium">
                              <i className="fa-solid fa-store text-amber-600 mr-1"></i>
                              Proveedor ref.: {fam.proveedor_sugerido}
                            </p>
                          )}
                        </div>

                        {/* Botones Editar / Eliminar */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleSelectEdit(fam)}
                              className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Editar esta familia"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(fam)}
                              className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                              title="Eliminar familia"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Si tiene materiales y el usuario quiere eliminarla, permitir elegir familia destino */}
                      {canDelete && matCount > 0 && (
                        <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>
                            Para eliminar esta familia ({matCount} ítems), elige a cuál mover sus materiales:
                          </span>
                          <select
                            value={reassignTarget[fam.id] || ''}
                            onChange={(e) =>
                              setReassignTarget((prev) => ({
                                ...prev,
                                [fam.id]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="">-- Seleccionar familia destino --</option>
                            {otherFamilias.map((of) => (
                              <option key={of.id} value={of.nombre}>
                                {of.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Haz clic en el contador de ítems de cualquier familia para filtrar el catálogo directamente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
