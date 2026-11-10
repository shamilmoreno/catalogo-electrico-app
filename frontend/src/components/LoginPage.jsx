import React, { useState } from 'react';
import { API_BASE, normalizeApiBase } from '../utils/api';

async function parseSafeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      error: `El servidor respondió con estado ${res.status} (${res.statusText || 'Error de red'}).`,
    };
  }
}

export default function LoginPage({
  onLoginSuccess,
  onEnterDemo,
  apiBaseUrl = API_BASE,
}) {
  const cleanBaseUrl = normalizeApiBase(apiBaseUrl || API_BASE);

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
      const res = await fetch(`${cleanBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await parseSafeJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'Error de autenticación');
      }

      if (!data.user || !data.token) {
        throw new Error(
          data.error ||
            'Respuesta inválida del servidor. Verifica la URL de la API en Render.'
        );
      }
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          'No se pudo conectar con el servidor Backend. Verifica que el servicio en Render esté activo.'
        );
      } else {
        setError(err.message || 'No se pudo conectar con el servidor de autenticación.');
      }
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
      const res = await fetch(`${cleanBaseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await parseSafeJson(res);
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
      if (err instanceof TypeError) {
        setError(
          'No se pudo conectar con el servidor Backend para solicitar el código.'
        );
      } else {
        setError(err.message || 'Error al solicitar recuperación de contraseña.');
      }
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
      const res = await fetch(`${cleanBaseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          reset_code: resetCode,
          new_password: newPassword,
        }),
      });
      const data = await parseSafeJson(res);
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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Resplandor decorativo con el color vino corporativo de Servimeta */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[260px] bg-servimeta-800/25 blur-3xl rounded-full"></div>

      <div className="max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden relative z-10">
        {/* Franja Superior Vino Corporativo */}
        <div className="h-2 bg-gradient-to-r from-zinc-950 via-servimeta-800 to-servimeta-600"></div>

        <div className="p-6 sm:p-8">
          {/* Cabecera Corporativa Servimeta C.A. */}
          <div className="flex flex-col items-center text-center mb-6 pb-5 border-b border-zinc-800">
            <div className="bg-white px-5 py-3 rounded-xl shadow-md border border-zinc-200 mb-3.5 w-full flex items-center justify-center">
              <img
                src="/logo-servimeta.png"
                alt="Servimeta C.A. - RIF: J-30786992-5"
                className="h-14 sm:h-16 w-auto object-contain"
              />
            </div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
              Catálogo Técnico de Materiales Eléctricos
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sistema Corporativo de Gestión Técnica, Cómputos y Procura
            </p>
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
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-servimeta-600"></span>
                <span>Iniciar Sesión</span>
              </h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Usuario o Correo Electrónico
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-user absolute left-3.5 top-3 text-zinc-500 text-xs"></i>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Usuario o correo corporativo"
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-800/90 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-servimeta-600 focus:border-servimeta-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-300">
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
                      className="text-[11px] text-servimeta-300 hover:text-servimeta-200 hover:underline font-medium cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-3.5 top-3 text-zinc-500 text-xs"></i>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-zinc-800/90 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-servimeta-600 focus:border-servimeta-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-servimeta-800 hover:bg-servimeta-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg border border-servimeta-600/40 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-right-to-bracket'}`}></i>
                  <span>{loading ? 'Verificando credenciales...' : 'Ingresar al Sistema'}</span>
                </button>
              </form>

              {onEnterDemo && (
                <div className="mt-5 pt-4 border-t border-zinc-800/90">
                  <div className="flex items-center justify-center gap-2 mb-2.5">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      ¿Solo deseas explorar el catálogo rápidamente?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onEnterDemo}
                    className="w-full py-2.5 bg-zinc-800/90 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wide rounded-lg border border-amber-500/30 hover:border-amber-400/60 shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-eye text-amber-400"></i>
                    <span>Entrar en Modo Demo Simple (Sin Login)</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* VISTA 2: SOLICITAR RECUPERACIÓN DE CONTRASEÑA */}
          {view === 'forgot' && (
            <>
              <div className="mb-4">
                <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-key text-amber-400"></i>
                  <span>Recuperar Contraseña</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Ingresa tu correo electrónico corporativo o nombre de usuario para generar un código de restablecimiento.
                </p>
              </div>

              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Correo Electrónico o Usuario Registrado
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-3.5 top-3 text-zinc-500 text-xs"></i>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="ej. usuario@servimeta.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-servimeta-600"
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
                    className="w-1/3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2.5 bg-servimeta-800 hover:bg-servimeta-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
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
                <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-lock-open text-emerald-400"></i>
                  <span>Definir Nueva Contraseña</span>
                </h2>
                {generatedCodePreview && (
                  <div className="mt-2 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300">
                    Código de seguridad generado:{' '}
                    <span className="font-mono font-bold text-amber-400 text-sm ml-1">
                      {generatedCodePreview}
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Código de Verificación (6 dígitos)
                  </label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="000000"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-servimeta-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-servimeta-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-servimeta-600"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setView('login');
                    }}
                    className="w-1/3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition cursor-pointer"
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

        {/* Pie Corporativo */}
        <div className="bg-zinc-950/90 px-6 py-3 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
          <span className="font-semibold text-zinc-400">Servimeta C.A.</span> • RIF: J-30786992-5
        </div>
      </div>
    </div>
  );
}
