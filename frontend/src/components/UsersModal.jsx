import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export const ROLE_PRESETS = {
  ADMIN: {
    label: 'Administrador General',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    perms: {
      puede_crear: true,
      puede_editar: true,
      puede_eliminar: true,
      puede_computos: true,
      puede_exportar: true,
      puede_usuarios: true,
    },
  },
  INGENIERO: {
    label: 'Ingeniero / Editor Técnico',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    perms: {
      puede_crear: true,
      puede_editar: true,
      puede_eliminar: false,
      puede_computos: true,
      puede_exportar: true,
      puede_usuarios: false,
    },
  },
  ANALISTA: {
    label: 'Analista de Procura / Compras',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    perms: {
      puede_crear: false,
      puede_editar: false,
      puede_eliminar: false,
      puede_computos: true,
      puede_exportar: true,
      puede_usuarios: false,
    },
  },
  VISOR: {
    label: 'Consulta / Solo Lectura (Sin Descarga)',
    badge: 'bg-slate-200 text-slate-800 border-slate-300',
    perms: {
      puede_crear: false,
      puede_editar: false,
      puede_eliminar: false,
      puede_computos: false,
      puede_exportar: false,
      puede_usuarios: false,
    },
  },
};

export default function UsersModal({
  isOpen,
  onClose,
  currentUser,
  onCurrentUserUpdated,
  apiBaseUrl = 'http://localhost:3000/api',
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Campos del formulario
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cargo, setCargo] = useState('');
  const [rol, setRol] = useState('VISOR');
  const [perms, setPerms] = useState(ROLE_PRESETS.VISOR.perms);
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStatusMsg(null);
      resetForm();
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setNombreCompleto('');
    setCargo('');
    setRol('VISOR');
    setPerms(ROLE_PRESETS.VISOR.perms);
    setActivo(true);
  };

  const handleSelectRolePreset = (newRol) => {
    setRol(newRol);
    if (ROLE_PRESETS[newRol]) {
      setPerms({ ...ROLE_PRESETS[newRol].perms });
    }
  };

  const handleTogglePerm = (key) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setUsername(u.username);
    setEmail(u.email || '');
    setPassword('');
    setNombreCompleto(u.nombre_completo);
    setCargo(u.cargo || '');
    setRol(u.rol || 'VISOR');
    setPerms({
      puede_crear: Boolean(u.puede_crear),
      puede_editar: Boolean(u.puede_editar),
      puede_eliminar: Boolean(u.puede_eliminar),
      puede_computos: Boolean(u.puede_computos),
      puede_exportar: Boolean(u.puede_exportar),
      puede_usuarios: Boolean(u.puede_usuarios),
    });
    setActivo(Boolean(u.activo));
    setStatusMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        username,
        email,
        password: password || undefined,
        nombre_completo: nombreCompleto,
        cargo,
        rol,
        ...perms,
        activo,
      };

      const url = editingUser
        ? `/usuarios/${editingUser.id}`
        : '/usuarios';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el usuario.');
      }

      setStatusMsg({
        type: 'success',
        text: editingUser
          ? `Permisos de "${data.usuario.username}" actualizados en PostgreSQL.`
          : `Usuario "${data.usuario.username}" creado exitosamente en PostgreSQL.`,
      });

      if (currentUser && data.usuario.id === currentUser.id) {
        onCurrentUserUpdated(data.usuario);
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.username === 'admin' || u.username === 'shamilmoreno') {
      alert('La cuenta de Administrador Principal no puede eliminarse.');
      return;
    }
    if (!window.confirm(`¿Eliminar al usuario "${u.username}" de PostgreSQL?`)) return;

    try {
      const res = await apiFetch(`/usuarios/${u.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const PERM_LABELS = [
    { key: 'puede_crear', label: 'Crear Materiales', icon: 'fa-plus-circle text-emerald-600' },
    { key: 'puede_editar', label: 'Editar / Subir Fotos y PDFs', icon: 'fa-pen-to-square text-amber-600' },
    { key: 'puede_eliminar', label: 'Eliminar Materiales', icon: 'fa-trash-can text-rose-600' },
    { key: 'puede_computos', label: 'Armar Cómputos / Requisición', icon: 'fa-clipboard-list text-indigo-600' },
    { key: 'puede_exportar', label: 'Descargar / Imprimir PDF y Excel', icon: 'fa-file-arrow-down text-sky-600' },
    { key: 'puede_usuarios', label: 'Administrar Usuarios y Roles', icon: 'fa-user-shield text-purple-600' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 no-print overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-600 p-2.5 rounded-lg text-white shadow">
              <i className="fa-solid fa-users-gear text-xl"></i>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Gestión de Usuarios, Roles y Permisos Granulares (RBAC)
              </h2>
              <p className="text-xs text-slate-400">
                Delimita quién puede crear, modificar, armar cómputos o descargar el catálogo (Tabla PostgreSQL: <code className="text-rose-300">usuarios</code>)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="cursor-pointer">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Cuerpo en 2 Columnas: Formulario + Tabla de Usuarios */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda (5 cols): Crear / Editar Usuario y Matriz de Permisos */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 h-fit"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <i
                  className={`fa-solid ${
                    editingUser ? 'fa-user-pen text-amber-600' : 'fa-user-plus text-emerald-600'
                  }`}
                ></i>
                <span>
                  {editingUser
                    ? `Editando Usuario: ${editingUser.username}`
                    : 'Crear Nuevo Usuario'}
                </span>
              </h3>
              {editingUser && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-sky-600 hover:underline font-semibold cursor-pointer"
                >
                  + Nuevo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Usuario (Login) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. jrodriguez"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {editingUser ? 'Nueva Clave (Opcional)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Dejar vacío para mantener' : '••••••••'}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Correo Electrónico (Para recuperación de clave)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. usuario@weworkintegrados.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej. Ing. Carlos Pérez"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cargo / Departamento
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ej. Mantenimiento de Redes"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Plantilla de Rol
                </label>
                <select
                  value={rol}
                  onChange={(e) => handleSelectRolePreset(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                >
                  {Object.entries(ROLE_PRESETS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {key} — {val.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Matriz de Permisos Granulares */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase">
                Permisos Específicos del Usuario:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {PERM_LABELS.map((p) => (
                  <label
                    key={p.key}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <i className={`fa-solid ${p.icon} w-4 text-center`}></i>
                      <span>{p.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(perms[p.key])}
                      onChange={() => handleTogglePerm(p.key)}
                      className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>Cuenta Activa</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>
                  {saving
                    ? 'Guardando...'
                    : editingUser
                    ? 'Actualizar Usuario'
                    : 'Crear Usuario'}
                </span>
              </button>
            </div>
          </form>

          {/* Columna Derecha (7 cols): Lista de Usuarios Registrados */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Usuarios Registrados en PostgreSQL ({users.length})
            </h3>

            {loading ? (
              <div className="text-center py-12 text-xs text-slate-500">
                Cargando usuarios...
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const preset = ROLE_PRESETS[u.rol] || ROLE_PRESETS.VISOR;
                  return (
                    <div
                      key={u.id}
                      className={`p-4 rounded-xl border transition bg-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                        !u.activo ? 'opacity-60 border-rose-200 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                            @{u.username}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {u.nombre_completo}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${preset.badge}`}
                          >
                            {u.rol}
                          </span>
                          {!u.activo && (
                            <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded">
                              INACTIVO
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500">
                          {u.cargo || 'Sin cargo especificado'}
                          {u.email ? ` • ✉️ ${u.email}` : ''}
                        </p>

                        {/* Insignias de permisos activos */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {u.puede_crear && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                              ✓ Crear
                            </span>
                          )}
                          {u.puede_editar && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                              ✓ Editar/Fotos
                            </span>
                          )}
                          {u.puede_eliminar && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                              ✓ Eliminar
                            </span>
                          )}
                          {u.puede_computos && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-semibold">
                              ✓ Cómputos
                            </span>
                          )}
                          {u.puede_exportar ? (
                            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                              ✓ Descargar PDF/Excel
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded font-semibold">
                              🔒 Sin Descarga de Catálogo
                            </span>
                          )}
                          {u.puede_usuarios && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-semibold">
                              ✓ Admin Usuarios
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(u)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-pen"></i>
                          <span>Permisos</span>
                        </button>
                        {u.username !== 'admin' &&
                          u.username !== 'shamilmoreno' &&
                          u.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs rounded-lg cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
