import React, { useState } from 'react';

export default function LoginPage({ onLoginSuccess, apiBaseUrl = 'http://localhost:3000/api' }) {
  // Modos: 'login' | 'forgot' | 'reset'
  const [view, setView] = useState('login');

  // Estado Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Estado Recuperación de Contraseña
  const [identifier, setIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCodePreview, setGeneratedCodePreview] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error de autenticación');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo procesar la solicitud.');
      }

      setGeneratedCodePreview(data.reset_code_preview || '');
      setResetCode(data.reset_code_preview || '');
      setSuccessMsg(
        data.message ||
          `Código de verificación generado para ${data.email || data.username}. Ingresa el código de 6 dígitos y tu nueva contraseña.`
      );
      setView('reset');
    } catch (err) {
      setError(err.message || 'Error al solicitar recuperación de contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          reset_code: resetCode,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar la contraseña.');
      }

      setSuccessMsg(data.message);
      setUsername(identifier);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setView('login');
    } catch (err) {
      setError(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-6 sm:p-8">
        {/* Cabecera Corporativa */}
        <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-800">
          <div className="bg-sky-600 p-3 rounded-xl text-white shadow-lg">
            <i className="fa-solid fa-bolt text-2xl"></i>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Catálogo Eléctrico Corporativo
            </h1>
            <p className="text-xs text-slate-400">
              Sistema de Gestión Técnica y Procura
            </p>
          </div>
        </div>

        {/* Alertas de Error / Éxito */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-700 text-xs text-rose-200 flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-rose-400 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-200 flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-400 shrink-0"></i>
            <span>{successMsg}</span>
          </div>
        )}

        {/* VISTA 1: INICIAR SESIÓN */}
        {view === 'login' && (
          <>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">
              Iniciar Sesión
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuario o Correo Electrónico
                </label>
                <div className="relative">
                  <i className="fa-solid fa-user absolute left-3.5 top-3 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Usuario o correo corporativo"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMsg('');
                      setIdentifier(username);
                      setView('forgot');
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline font-medium cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3.5 top-3 text-slate-500 text-xs"></i>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-right-to-bracket'}`}></i>
                <span>{loading ? 'Verificando credenciales...' : 'Ingresar al Sistema'}</span>
              </button>
            </form>
          </>
        )}

        {/* VISTA 2: SOLICITAR RECUPERACIÓN DE CONTRASEÑA */}
        {view === 'forgot' && (
          <>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-key text-amber-400"></i>
                <span>Recuperar Contraseña</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa tu correo electrónico corporativo o nombre de usuario para generar un código de restablecimiento.
              </p>
            </div>

            <form onSubmit={handleRequestResetCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Correo Electrónico o Usuario Registrado
                </label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-3.5 top-3 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ej. shamil.moreno@weworkintegrados.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('login');
                  }}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`}></i>
                  <span>{loading ? 'Verificando...' : 'Generar Código'}</span>
                </button>
              </div>
            </form>
          </>
        )}

        {/* VISTA 3: VERIFICAR CÓDIGO Y DEFINIR NUEVA CONTRASEÑA */}
        {view === 'reset' && (
          <>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-lock-open text-emerald-400"></i>
                <span>Definir Nueva Contraseña</span>
              </h2>
              {generatedCodePreview && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                  Código de seguridad generado:{' '}
                  <span className="font-mono font-bold text-amber-400 text-sm ml-1">
                    {generatedCodePreview}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código de Verificación (6 dígitos)
                </label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="000000"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ingresa tu nueva contraseña"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('login');
                  }}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-check'}`}></i>
                  <span>{loading ? 'Guardando...' : 'Guardar Nueva Clave'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
