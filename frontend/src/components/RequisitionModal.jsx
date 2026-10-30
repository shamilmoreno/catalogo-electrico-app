import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const UNIDADES = ['PZA', 'MTS', 'KG', 'JGO', 'KIT', 'ROLLO', 'UND'];
const NIVELES_TENSION = [
  '13.8 kV / BT (Mixto)',
  'Baja Tensión (120/240V - 208V)',
  'Media Tensión 13.8 kV',
  'Media Tensión 24.0 kV',
  'Media Tensión 34.5 kV',
  'Alta Tensión / Subestación',
];

export function inferDefaultUnit(item) {
  const t = (item?.title || '').toUpperCase();
  if (/CABLE|ALAMBRE|CONDUCTOR|GUAYA|FLEJE/.test(t)) return 'MTS';
  if (/CINTA/.test(t)) return 'ROLLO';
  return 'PZA';
}

export default function RequisitionModal({
  isOpen,
  onClose,
  reqItems,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onLoadRequisition,
  apiBaseUrl = 'http://localhost:3000/api',
}) {
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'history'

  // Metadatos del proyecto
  const [editingReqId, setEditingReqId] = useState(null);
  const [editingReqCodigo, setEditingReqCodigo] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [nivelTension, setNivelTension] = useState(NIVELES_TENSION[0]);
  const [observaciones, setObservaciones] = useState('');

  // Estado de guardado e historial en PostgreSQL
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [savedRequisiciones, setSavedRequisiciones] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchSavedRequisiciones = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiFetch('/requisiciones');
      if (res.ok) {
        const data = await res.json();
        setSavedRequisiciones(data);
      }
    } catch (e) {
      console.error('Error cargando historial de requisiciones:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStatusMsg(null);
      fetchSavedRequisiciones();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalRenglones = reqItems.length;
  const totalUnidades = reqItems.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0),
    0
  );
  const totalEstimadoUsd = reqItems.reduce(
    (acc, it) =>
      acc + (Number(it.cantidad) || 0) * (Number(it.precio_referencia) || 0),
    0
  );

  // Guardar o actualizar en PostgreSQL (tablas requisiciones y requisicion_items)
  const handleSaveToPostgres = async (asNew = false) => {
    if (!proyecto.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Por favor ingresa el Nombre del Proyecto u Obra antes de guardar.',
      });
      return;
    }
    if (reqItems.length === 0) {
      setStatusMsg({
        type: 'error',
        text: 'Agrega al menos un material del catálogo a la lista de cómputos.',
      });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const isUpdate = Boolean(editingReqId && !asNew);
      const endpoint = isUpdate ? `/requisiciones/${editingReqId}` : '/requisiciones';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          proyecto,
          solicitante,
          ubicacion,
          nivel_tension: nivelTension,
          observaciones,
          items: reqItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Error al guardar en PostgreSQL');
      }

      setEditingReqId(data.requisicion.id);
      setEditingReqCodigo(data.requisicion.codigo);
      setStatusMsg({
        type: 'success',
        text: isUpdate
          ? `¡Requisición ${data.requisicion.codigo} actualizada en PostgreSQL!`
          : `¡Guardado en PostgreSQL con código ${data.requisicion.codigo}!`,
      });
      fetchSavedRequisiciones();
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Exportar a CSV compatible con Microsoft Excel (UTF-8 con BOM)
  const handleExportCSV = () => {
    if (reqItems.length === 0) return;

    const fecha = new Date().toLocaleDateString('es-ES');
    const headerLines = [
      ['PLANILLA DE CÓMPUTOS MÉTRICOS Y REQUISICIÓN DE MATERIALES ELÉCTRICOS'],
      ['Proyecto / Obra:', proyecto || 'Sin especificar', 'Fecha:', fecha],
      ['Solicitante / Ing.:', solicitante || 'Sin especificar', 'Nivel de Tensión:', nivelTension],
      ['Ubicación / Circuito:', ubicacion || 'Sin especificar', 'Total Renglones:', totalRenglones],
      ['Observaciones:', observaciones || 'Ninguna', 'Presupuesto Estimado (USD):', totalEstimadoUsd.toFixed(2)],
      [],
      [
        'ITEM',
        'ID CATÁLOGO',
        'DESCRIPCIÓN / NOMENCLATURA TÉCNICA',
        'FAMILIA',
        'UNIDAD',
        'CANTIDAD',
        'PRECIO UNIT. REF. (USD)',
        'SUBTOTAL EST. (USD)',
        'ESTRUCTURA / NOTA DE CAMPO',
      ],
    ];

    const itemLines = reqItems.map((it, idx) => {
      const unitPrice = Number(it.precio_referencia) || 0;
      const subtotal = (Number(it.cantidad) || 0) * unitPrice;
      return [
        idx + 1,
        `#${it.material_id || it.id}`,
        `"${(it.title || '').replace(/"/g, '""')}"`,
        `"${(it.category || '').replace(/"/g, '""')}"`,
        it.unidad || 'PZA',
        it.cantidad,
        unitPrice > 0 ? unitPrice.toFixed(2) : '0.00',
        subtotal > 0 ? subtotal.toFixed(2) : '0.00',
        `"${(it.nota_tecnica || '').replace(/"/g, '""')}"`,
      ];
    });

    const footerLines = [
      [],
      ['', '', '', '', 'TOTALES:', totalUnidades, '', totalEstimadoUsd.toFixed(2), ''],
    ];

    const allRows = [...headerLines, ...itemLines, ...footerLines]
      .map((row) => row.join(';'))
      .join('\r\n');

    // BOM UTF-8 (\uFEFF) para que Excel en español abra acentos y columnas con ';' directamente
    const blob = new Blob(['\uFEFF' + allRows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanName = (proyecto || 'computos_metricos')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    link.href = url;
    link.setAttribute('download', `requisicion_${cleanName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir Planilla Oficial de Requisición / Cómputos Métricos (PDF)
  const handlePrintRequisition = () => {
    if (reqItems.length === 0) return;
    const fecha = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const rowsHtml = reqItems
      .map((it, idx) => {
        const unitPrice = Number(it.precio_referencia) || 0;
        const subtotal = (Number(it.cantidad) || 0) * unitPrice;
        return `
        <tr>
          <td style="text-align:center;font-weight:600;">${String(idx + 1).padStart(2, '0')}</td>
          <td style="text-align:center;font-family:monospace;">#${it.material_id || it.id}</td>
          <td style="font-weight:600;">${it.title}</td>
          <td>${it.category}</td>
          <td style="text-align:center;font-weight:600;">${it.unidad || 'PZA'}</td>
          <td style="text-align:right;font-weight:700;font-size:13px;">${it.cantidad}</td>
          <td style="text-align:right;font-family:monospace;">${unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : '-'}</td>
          <td style="text-align:right;font-family:monospace;font-weight:700;">${subtotal > 0 ? `$${subtotal.toFixed(2)}` : '-'}</td>
          <td>${it.nota_tecnica || '-'}</td>
        </tr>`;
      })
      .join('');

    const printWindow = window.open('', '_blank', 'width=980,height=750');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Requisición de Materiales - ${proyecto || 'Cómputos Métricos'}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 28px; font-size: 12px; }
          .header { border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 12px; color: #475569; margin: 3px 0 0 0; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
          .meta-item { font-size: 12px; }
          .meta-label { font-weight: 700; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
          th { background: #0f172a; color: #ffffff; font-size: 10.5px; text-transform: uppercase; padding: 8px 6px; border: 1px solid #0f172a; }
          td { padding: 7px 6px; border: 1px solid #cbd5e1; font-size: 11px; }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row td { background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 55px; page-break-inside: avoid; }
          .sig-box { border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Planilla de Cómputos Métricos y Requisición de Materiales</h1>
            <p class="subtitle">Catálogo Técnico de Infraestructura y Redes Eléctricas</p>
          </div>
          <div style="text-align:right;font-size:11px;">
            <div><strong>Fecha:</strong> ${fecha}</div>
            <div><strong>Total Renglones:</strong> ${totalRenglones}</div>
            <div><strong>Total Unidades:</strong> ${totalUnidades}</div>
            ${totalEstimadoUsd > 0 ? `<div><strong>Total Ref. USD:</strong> $${totalEstimadoUsd.toFixed(2)}</div>` : ''}
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Proyecto / Obra:</span> ${proyecto || '___________________________'}</div>
          <div class="meta-item"><span class="meta-label">Nivel de Tensión:</span> ${nivelTension}</div>
          <div class="meta-item"><span class="meta-label">Ingeniero Solicitante:</span> ${solicitante || '___________________________'}</div>
          <div class="meta-item"><span class="meta-label">Ubicación / Circuito:</span> ${ubicacion || '___________________________'}</div>
          <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Observaciones Técnicas:</span> ${observaciones || 'Sin observaciones adicionales.'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:36px;">Ítem</th>
              <th style="width:58px;">Código</th>
              <th>Descripción / Nomenclatura Técnica del Material</th>
              <th style="width:140px;">Familia</th>
              <th style="width:48px;">Und.</th>
              <th style="width:55px;">Cant.</th>
              <th style="width:72px;">P. Unit ($)</th>
              <th style="width:78px;">Subtotal ($)</th>
              <th style="width:125px;">Estructura / Apoyo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="5" style="text-align:right;">TOTALES ESTIMADOS DE LA REQUISICIÓN:</td>
              <td style="text-align:right;">${totalUnidades}</td>
              <td></td>
              <td style="text-align:right;font-family:monospace;">$${totalEstimadoUsd.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <strong>Elaborado por:</strong><br/>
            ${solicitante || 'Ingeniero de Proyecto / Residente'}
          </div>
          <div class="sig-box">
            <strong>Revisado y Aprobado por:</strong><br/>
            Coordinación de Ingeniería / Operaciones
          </div>
          <div class="sig-box">
            <strong>Recibido por:</strong><br/>
            Almacén General / Procura
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleLoadFromHistory = (reqRecord) => {
    setEditingReqId(reqRecord.id);
    setEditingReqCodigo(reqRecord.codigo || '');
    setProyecto(reqRecord.proyecto || '');
    setSolicitante(reqRecord.solicitante || '');
    setUbicacion(reqRecord.ubicacion || '');
    setNivelTension(reqRecord.nivel_tension || NIVELES_TENSION[0]);
    setObservaciones(reqRecord.observaciones || '');
    onLoadRequisition(reqRecord.items || []);
    setActiveTab('builder');
    setStatusMsg({
      type: 'success',
      text: `Requisición ${reqRecord.codigo} cargada en la planilla activa. Puedes actualizarla o guardarla como nueva.`,
    });
  };

  const handleDeleteFromHistory = async (id, codigo) => {
    if (!window.confirm(`¿Eliminar la requisición ${codigo} de PostgreSQL?`)) return;
    try {
      const res = await apiFetch(`/requisiciones/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSavedRequisiciones((prev) => prev.filter((r) => r.id !== id));
        if (editingReqId === id) {
          setEditingReqId(null);
          setEditingReqCodigo('');
        }
      }
    } catch (e) {
      console.error('Error eliminando requisición:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 no-print overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera del Módulo */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-lg text-white shadow">
              <i className="fa-solid fa-clipboard-list text-xl"></i>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap">
                <span>Módulo de Cómputos Métricos y Requisición de Materiales</span>
                <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  {totalRenglones} renglones • {totalUnidades} unds.
                </span>
                {editingReqCodigo && (
                  <span className="bg-amber-500/20 text-amber-300 text-xs font-mono px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    Editando: {editingReqCodigo}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Armado de listas de materiales por obra, cálculo de costos estimados, persistencia en PostgreSQL y exportación a Excel / PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Pestañas */}
            <div className="bg-slate-800 p-1 rounded-lg flex text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'builder'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-table-list"></i>
                <span>Planilla Activa ({totalRenglones})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-database"></i>
                <span>Guardadas en BD ({savedRequisiciones.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 ml-2 cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
        </div>

        {/* Mensajes de estado */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <i
                className={`fa-solid ${
                  statusMsg.type === 'success'
                    ? 'fa-circle-check text-emerald-600'
                    : 'fa-triangle-exclamation text-rose-600'
                }`}
              ></i>
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto flex-grow space-y-5">
          {activeTab === 'builder' ? (
            <>
              {/* Formulario de Cabecera de Obra Eléctrica */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Proyecto / Obra Eléctrica <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={proyecto}
                    onChange={(e) => setProyecto(e.target.value)}
                    placeholder="Ej. Adecuación Circuito 13.8 kV Zona Industrial"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ingeniero / Solicitante
                  </label>
                  <input
                    type="text"
                    value={solicitante}
                    onChange={(e) => setSolicitante(e.target.value)}
                    placeholder="Ej. Ing. Electricista Residente"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nivel de Tensión
                  </label>
                  <select
                    value={nivelTension}
                    onChange={(e) => setNivelTension(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {NIVELES_TENSION.map((nt) => (
                      <option key={nt} value={nt}>
                        {nt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ubicación / Subestación / Tramo
                  </label>
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Ej. Subestación Este - Tramo Postes P-01 al P-18"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Observaciones Técnicas / Unidad Constructiva
                  </label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej. Materiales para estructuras tangentes y retenidas según norma CADAFE/CORPOELEC"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tabla de Renglones de Cómputos Métricos */}
              {reqItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                  <i className="fa-solid fa-cart-flatbed text-3xl text-slate-300 mb-3"></i>
                  <h4 className="text-sm font-bold text-slate-700">
                    La planilla de cómputos métricos está vacía
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Cierra esta ventana y haz clic en el botón{' '}
                    <span className="font-semibold text-indigo-600">
                      "+ Cómputo"
                    </span>{' '}
                    en cualquiera de las tarjetas del catálogo para ir armando tu lista de materiales.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white text-[11px] uppercase">
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-3 w-16">ID Cat.</th>
                          <th className="py-2.5 px-3">Material / Nomenclatura Técnica</th>
                          <th className="py-2.5 px-3 w-24 text-center">Unidad</th>
                          <th className="py-2.5 px-3 w-32 text-center">Cantidad</th>
                          <th className="py-2.5 px-3 w-28 text-right">P. Unit ($)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Subtotal ($)</th>
                          <th className="py-2.5 px-3 w-48">Estructura / Apoyo</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {reqItems.map((it, idx) => {
                          const unitPrice = Number(it.precio_referencia) || 0;
                          const subtotal = (Number(it.cantidad) || 0) * unitPrice;
                          return (
                            <tr key={it.material_id || it.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold">
                                #{it.material_id || it.id}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{it.title}</div>
                                <div className="text-[10px] text-slate-500">{it.category}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <select
                                  value={it.unidad || 'PZA'}
                                  onChange={(e) =>
                                    onUpdateItem(it.material_id || it.id, {
                                      unidad: e.target.value,
                                    })
                                  }
                                  className="px-2 py-1 border border-slate-300 rounded bg-white text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                                >
                                  {UNIDADES.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateItem(it.material_id || it.id, {
                                        cantidad: Math.max(1, (Number(it.cantidad) || 1) - 1),
                                      })
                                    }
                                    className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0.1"
                                    step="any"
                                    value={it.cantidad}
                                    onChange={(e) =>
                                      onUpdateItem(it.material_id || it.id, {
                                        cantidad: e.target.value,
                                      })
                                    }
                                    className="w-14 text-center px-1 py-1 border border-slate-300 rounded font-bold text-slate-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateItem(it.material_id || it.id, {
                                        cantidad: (Number(it.cantidad) || 0) + 1,
                                      })
                                    }
                                    className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={it.precio_referencia ?? ''}
                                  onChange={(e) =>
                                    onUpdateItem(it.material_id || it.id, {
                                      precio_referencia:
                                        e.target.value === '' ? null : e.target.value,
                                    })
                                  }
                                  placeholder="0.00"
                                  className="w-20 text-right px-1.5 py-1 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {subtotal > 0 ? `$${subtotal.toFixed(2)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={it.nota_tecnica || ''}
                                  onChange={(e) =>
                                    onUpdateItem(it.material_id || it.id, {
                                      nota_tecnica: e.target.value,
                                    })
                                  }
                                  placeholder="Ej. Poste P-05 / Retenida"
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => onRemoveItem(it.material_id || it.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Quitar renglón"
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Pestaña 2: Historial guardado en PostgreSQL */
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <i className="fa-solid fa-circle-notch fa-spin text-xl text-indigo-600 mb-2"></i>
                  <p>Consultando requisiciones en PostgreSQL (db_catalogo)...</p>
                </div>
              ) : savedRequisiciones.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <i className="fa-solid fa-folder-open text-3xl text-slate-300 mb-2"></i>
                  <p className="text-sm font-semibold text-slate-700">
                    No hay requisiciones guardadas todavía en PostgreSQL
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Arma una planilla en la pestaña activa y pulsa "Guardar en PostgreSQL".
                  </p>
                </div>
              ) : (
                savedRequisiciones.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-mono font-bold px-2.5 py-0.5 rounded border border-indigo-200">
                          {req.codigo}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {req.proyecto}
                        </h4>
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {req.nivel_tension}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Solicitante:</strong> {req.solicitante || 'N/A'} •{' '}
                        <strong>Ubicación:</strong> {req.ubicacion || 'N/A'} •{' '}
                        <strong>Ítems:</strong> {req.items?.length || 0} renglones •{' '}
                        <strong>Fecha:</strong>{' '}
                        {new Date(req.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadFromHistory(req)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-file-import"></i>
                        <span>Cargar en Planilla</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFromHistory(req.id, req.codigo)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg cursor-pointer"
                        title="Eliminar de PostgreSQL"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        {activeTab === 'builder' && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              {reqItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReqId(null);
                    setEditingReqCodigo('');
                    onClearAll();
                  }}
                  className="text-xs text-rose-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <i className="fa-solid fa-broom"></i>
                  <span>Vaciar Planilla Actual</span>
                </button>
              )}
              {totalEstimadoUsd > 0 && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono">
                  Total Estimado Ref.: ${totalEstimadoUsd.toFixed(2)} USD
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={reqItems.length === 0}
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-file-excel"></i>
                <span>Exportar Excel (.CSV)</span>
              </button>

              <button
                type="button"
                disabled={reqItems.length === 0}
                onClick={handlePrintRequisition}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-print"></i>
                <span>Imprimir Planilla Oficial (PDF)</span>
              </button>

              {editingReqId && (
                <button
                  type="button"
                  disabled={saving || reqItems.length === 0}
                  onClick={() => handleSaveToPostgres(true)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Crear un nuevo código de requisición en PostgreSQL"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>Guardar como Nueva</span>
                </button>
              )}

              <button
                type="button"
                disabled={saving || reqItems.length === 0}
                onClick={() => handleSaveToPostgres(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>
                  {saving
                    ? 'Guardando en BD...'
                    : editingReqId
                    ? `Actualizar ${editingReqCodigo}`
                    : 'Guardar en PostgreSQL'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
