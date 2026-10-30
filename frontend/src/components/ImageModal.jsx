import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, resolveMediaUrl } from '../utils/api';

export default function ImageModal({
  isOpen,
  item,
  initialUrl,
  onClose,
  onSave,
  onClear,
}) {
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setImageUrl(initialUrl || '');
      setUploadError('');
      setIsDragging(false);
    }
  }, [isOpen, initialUrl]);

  if (!isOpen || !item) return null;

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');

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

      setImageUrl(data.url);
    } catch (err) {
      setUploadError(err.message || 'Error al subir el archivo de imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item, imageUrl.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      setImageUrl('');
      await onClear(item);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-camera text-sky-600"></i>
            <span>Asignar Imagen Real al Producto (ID #{item.id})</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 mb-4 line-clamp-2">
          {item.title}
        </p>

        <div className="space-y-4">
          {/* Opción 1: Subir archivo desde la PC (Drag & Drop o clic) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. Subir foto directamente desde tu PC:
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-300 hover:border-sky-400 bg-slate-50/70 hover:bg-sky-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploading ? (
                <div className="py-2 text-sky-600 text-xs font-semibold flex flex-col items-center gap-1.5">
                  <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                  <span>Subiendo imagen al servidor...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
                    <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Haz clic aquí para buscar en tu PC o arrastra la imagen
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Formatos soportados: JPG, PNG, WEBP, GIF, SVG (Máx. 10 MB)
                  </p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{uploadError}</span>
              </p>
            )}
          </div>

          {/* Opción 2: Pegar URL externa o ver URL generada */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              2. O pega un enlace web directo (URL guardada en <code className="text-sky-700 font-semibold">imagen_url</code>):
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Vista Previa */}
          {imageUrl.trim() && (
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">
                Vista Previa de la Imagen
              </p>
              <img
                src={resolveMediaUrl(imageUrl)}
                alt="Preview"
                className="h-36 object-contain mx-auto rounded bg-white p-1 border border-slate-100"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
                onLoad={(e) => {
                  e.target.style.display = 'block';
                }}
              />
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              disabled={saving || uploading}
              onClick={handleClear}
              className="text-xs text-rose-600 hover:underline font-medium cursor-pointer disabled:opacity-50"
            >
              Volver a Esquema Vectorial
            </button>
            <div className="flex gap-2">
              <button
                disabled={saving || uploading}
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={saving || uploading}
                onClick={handleSave}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>{saving ? 'Guardando...' : 'Guardar Foto'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
