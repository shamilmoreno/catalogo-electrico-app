import React, { useState, useRef } from 'react';
import { CategorySVG } from './ProductCard';
import { apiFetch, resolveMediaUrl } from '../utils/api';

function analyzeElectricalParameters(item) {
  const upper = (item?.title || '').toUpperCase();
  const cat = item?.category || '';

  // 1. Material Base
  let materialBase = item?.material_base || 'Acero / Aleación Metálica de Uso Eléctrico';
  if (/\bAG\b|GALVANIZAD/.test(upper)) {
    materialBase = 'Acero Galvanizado en Caliente (ASTM A153)';
  } else if (/BRONCE|BRNCE/.test(upper)) {
    materialBase = 'Aleación de Bronce-Silicio Anticorrosivo';
  } else if (/\bCU\b|COBRE/.test(upper)) {
    materialBase = 'Cobre Electrolítico de Alta Conductividad (99.9%)';
  } else if (/\bACSR\b|ARVIDAL/.test(upper)) {
    materialBase = 'Aluminio con Alma de Acero (ACSR / Aleación 6201)';
  } else if (/\bAL\b|ALUMINIO|ALUM\b/.test(upper)) {
    materialBase = 'Aleación de Aluminio de Uso Eléctrico';
  } else if (/PORCELANA/.test(upper)) {
    materialBase = 'Porcelana Electrotécnica Vitrificada (ANSI C29)';
  } else if (/POLIMERIC|SILICON/.test(upper)) {
    materialBase = ' Caucho de Silicona / Polimérico Hidrofóbico';
  } else if (/PVC|PLASTIC|PEAD/.test(upper)) {
    materialBase = 'Polímero Termoplástico Aislante (PVC / PEAD)';
  } else if (/CONCRETO|HIERRO/.test(upper)) {
    materialBase = 'Hierro / Acero Estructural de Alta Resistencia';
  }

  // 2. Nivel de Tensión y Aplicación
  let nivelTension = item?.nivel_tension || 'Baja y Media Tensión (BT / 13.8 kV - 34.5 kV)';
  if (/13\.8|15\s*KV/.test(upper)) {
    nivelTension = 'Media Tensión 13.8 kV (Clase 15 kV)';
  } else if (/24\s*KV|27\s*KV/.test(upper)) {
    nivelTension = 'Media Tensión 24.0 kV (Clase 27 kV)';
  } else if (/34\.5|36\s*KV/.test(upper)) {
    nivelTension = 'Media Tensión 34.5 kV (Clase 38 kV)';
  } else if (/600\s*V|BT|BAJA TENSION/.test(upper)) {
    nivelTension = 'Baja Tensión (≤ 600 V)';
  } else if (cat === 'Tapas, Tanquillas y Cajas' || cat === 'Tubos, Conduits y Ductos') {
    nivelTension = 'Canalización Subterránea / BT y MT';
  } else if (cat === 'Fusibles, Seccionadores y Protección') {
    nivelTension = 'Media Tensión (13.8 kV / 24 kV / 34.5 kV)';
  }

  // 3. Normas Técnicas de Referencia
  let normaTecnica = item?.norma_tecnica || 'CORPOELEC / CADAFE / COVENIN / ANSI';
  if (cat === 'Abrazaderas' || cat === 'Tornillería y Fijación' || cat === 'Anclas, Guayas, Flejes y Herrajes de Línea') {
    normaTecnica = 'CADAFE / CORPOELEC • ANSI C135.1 • ASTM A153';
  } else if (cat === 'Aisladores y Accesorios') {
    normaTecnica = 'ANSI C29.1 / C29.7 • IEC 60383 • CORPOELEC';
  } else if (cat === 'Conectores y Terminales') {
    normaTecnica = 'ANSI C119.4 • UL 486A/B • NEMA CC1';
  } else if (cat === 'Fusibles, Seccionadores y Protección') {
    normaTecnica = 'ANSI C37.42 • IEEE C62.11 • CORPOELEC';
  } else if (cat === 'Cables, Conductores y Cintas') {
    normaTecnica = 'COVENIN 397 • ASTM B232 / B399 • ICEA';
  }

  // 4. Dimensiones / Pernos detectados en el título
  const dimMatches = upper.match(/(\d+(?:-\d+\/\d+|\/\d+|\.\d+)?\s*(?:"|PULG|MM|CM|MTS|KV|A|AWG|MCM|KCMIL|H"|T\b))/g);
  const dimensiones = dimMatches && dimMatches.length > 0
    ? dimMatches.join(' • ')
    : 'Estándar según plano constructivo de la serie';

  // 5. Condición de Instalación
  const instalacion =
    cat === 'Tapas, Tanquillas y Cajas' || cat === 'Tubos, Conduits y Ductos'
      ? 'Subterránea / Canalización Embutida o a la Vista'
      : 'Intemperie / Redes Aéreas de Distribución';

  return {
    codigoCatalogo: `MAT-${String(item?.id || 1).padStart(4, '0')}`,
    materialBase,
    nivelTension,
    normaTecnica,
    dimensiones,
    instalacion,
  };
}

export default function DatasheetModal({
  isOpen,
  item,
  customImg,
  currentUser,
  onClose,
  onAddToReq,
  onEditMaterial,
  onDatasheetUpdated,
  apiBaseUrl = 'http://localhost:3000/api',
}) {
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState(false);
  const pdfInputRef = useRef(null);

  if (!isOpen || !item) return null;

  const activeImage = resolveMediaUrl(item.imagen_url || customImg);
  const resolvedPdfUrl = resolveMediaUrl(item.datasheet_url);
  const tech = analyzeElectricalParameters(item);
  const canEdit = Boolean(currentUser?.puede_editar);
  const canComputos = Boolean(currentUser?.puede_computos);
  const canExport = Boolean(currentUser?.puede_exportar);

  const handleUploadDatasheetPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    setPdfError('');
    try {
      const formData = new FormData();
      formData.append('datasheet', file);

      const res = await apiFetch(`/materiales/${item.id}/upload-datasheet`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al subir la hoja de datos PDF.');
      }

      onDatasheetUpdated(item.id, data.datasheet_url);
    } catch (err) {
      setPdfError(err.message || 'No se pudo subir el archivo PDF.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleRemoveDatasheetPdf = async () => {
    if (!window.confirm('¿Quitar el archivo PDF del fabricante asociado a este material?')) {
      return;
    }
    try {
      const res = await apiFetch(`/materiales/${item.id}/datasheet`, {
        method: 'PUT',
        body: JSON.stringify({ datasheet_url: null }),
      });
      if (res.ok) {
        setShowEmbeddedPdf(false);
        onDatasheetUpdated(item.id, null);
      }
    } catch (e) {
      console.error('Error al quitar datasheet PDF:', e);
    }
  };

  // Generar e Imprimir Hoja de Datos Técnica Oficial (Datasheet PDF A4)
  const handlePrintDatasheet = () => {
    const fecha = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const imageBlock = activeImage
      ? `<img src="${activeImage}" alt="${item.title}" style="max-height:220px;max-width:100%;object-fit:contain;" />`
      : `<div style="padding:30px;text-align:center;color:#0284c7;font-weight:bold;font-size:16px;border:2px dashed #cbd5e1;border-radius:8px;width:80%;">ESQUEMA TÉCNICO ESTÁNDAR<br/><span style="font-size:12px;color:#64748b;">${item.category}</span></div>`;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Ficha Técnica ${tech.codigoCatalogo} - ${item.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 32px; font-size: 12.5px; line-height: 1.5; }
          .top-bar { border-bottom: 4px solid #0284c7; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .doc-type { font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 1px; text-transform: uppercase; }
          .doc-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 2px 0 0 0; }
          .code-box { background: #0f172a; color: #fff; padding: 8px 14px; border-radius: 6px; text-align: right; font-family: monospace; }
          .hero { display: grid; grid-template-columns: 280px 1fr; gap: 20px; margin-bottom: 22px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f8fafc; }
          .img-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; height: 230px; display: flex; align-items: center; justify-content: center; padding: 8px; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; background: #0f172a; color: #fff; padding: 7px 12px; border-radius: 4px; margin: 18px 0 10px 0; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
          th { width: 34%; background: #f1f5f9; color: #334155; font-weight: 700; }
          .info-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #ffffff; margin-bottom: 14px; }
          .footer { margin-top: 40px; border-top: 2px solid #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="top-bar">
          <div>
            <div class="doc-type">Hoja de Datos Técnicos (Datasheet de Ingeniería Eléctrica)</div>
            <h1 class="doc-title">${item.title}</h1>
          </div>
          <div class="code-box">
            <div style="font-size:10px;color:#94a3b8;">CÓDIGO CATÁLOGO</div>
            <div style="font-size:16px;font-weight:bold;">${tech.codigoCatalogo}</div>
          </div>
        </div>

        <div class="hero">
          <div class="img-box">
            ${imageBlock}
          </div>
          <div>
            <table style="margin-bottom:0;">
              <tr>
                <th>Código Interno (ID BD)</th>
                <td><strong>${tech.codigoCatalogo}</strong> (Registro #${item.id})</td>
              </tr>
              <tr>
                <th>Familia Oficial</th>
                <td>${item.category}</td>
              </tr>
              <tr>
                <th>Estado en Almacén</th>
                <td>${item.en_stock !== false ? 'DISPONIBLE EN STOCK' : 'AGOTADO / BAJO PEDIDO'}</td>
              </tr>
              <tr>
                <th>Material Constructivo</th>
                <td>${tech.materialBase}</td>
              </tr>
              <tr>
                <th>Dimensiones / Calibre</th>
                <td><strong>${tech.dimensiones}</strong></td>
              </tr>
              <tr>
                <th>Nivel de Tensión / Red</th>
                <td>${tech.nivelTension}</td>
              </tr>
              <tr>
                <th>Normas de Referencia</th>
                <td>${tech.normaTecnica}</td>
              </tr>
              <tr>
                <th>Condición de Montaje</th>
                <td>${tech.instalacion}</td>
              </tr>
              <tr>
                <th>Proveedor de Referencia</th>
                <td><strong>${item.proveedor_nombre || 'Distribuidor Autorizado de Materiales Eléctricos'}</strong> ${item.proveedor_contacto ? `(${item.proveedor_contacto})` : ''}</td>
              </tr>
              ${item.precio_referencia != null && Number(item.precio_referencia) > 0 ? `
              <tr>
                <th>Precio Unitario Ref.</th>
                <td><strong>$${Number(item.precio_referencia).toFixed(2)} USD</strong></td>
              </tr>` : ''}
            </table>
          </div>
        </div>

        <div class="section-title">1. Descripción Funcional y Aplicación en Redes Eléctricas</div>
        <div class="info-box">
          ${item.description}
        </div>

        <div class="section-title">2. Desglose de Nomenclatura y Especificaciones Técnicas</div>
        <div class="info-box">
          ${item.specs}
        </div>

        <div class="section-title">3. Criterios de Inspección, Recepción y Almacenamiento</div>
        <div class="info-box">
          <ul style="margin:0;padding-left:18px;">
            <li>Verificar ausencia de rebabas, fisuras o defectos en el recubrimiento galvánico/superficial antes de su montaje en línea.</li>
            <li>Comprobar correspondencia dimensional (${tech.dimensiones}) con los planos de la Unidad Constructiva aplicable.</li>
            <li>Cumplimiento con especificaciones técnicas ${tech.normaTecnica}.</li>
          </ul>
        </div>

        <div class="footer">
          <div>Catálogo Técnico de Materiales Eléctricos • Base de Datos Oficial PostgreSQL (db_catalogo)</div>
          <div>Fecha de Emisión: ${fecha}</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 no-print overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera de la Ficha Técnica */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2.5 rounded-lg text-white shadow">
              <i className="fa-solid fa-file-invoice text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono text-xs font-bold px-2 py-0.5 rounded">
                  {tech.codigoCatalogo}
                </span>
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  Ficha Técnica Detallada (Datasheet)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug mt-0.5">
                {item.title}
              </h2>
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

        {/* Cuerpo de la Ficha Técnica */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {/* Bloque Superior: Imagen Grande + Tabla de Parámetros Técnicos */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Visor de Imagen / Esquema Vectorial */}
            <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between min-h-[260px]">
              <div className="w-full flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-500">
                  ID #{item.id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    item.en_stock !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {item.en_stock !== false ? '● En Stock' : '○ Agotado'}
                </span>
              </div>

              <div className="w-full h-48 flex items-center justify-center my-2 bg-white rounded-lg border border-slate-100 p-2">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <CategorySVG category={item.category} />
                )}
              </div>

              <div className="text-[11px] text-slate-500 text-center font-medium">
                {activeImage ? 'Fotografía Real del Material' : 'Esquema Vectorial Estándar'}
              </div>
            </div>

            {/* Tabla de Especificaciones de Ingeniería Eléctrica */}
            <div className="md:col-span-7 flex flex-col justify-between">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                  <i className="fa-solid fa-bolt text-sky-400"></i>
                  <span>Parámetros Técnicos de Ingeniería</span>
                </div>
                <table className="w-full text-xs border-collapse divide-y divide-slate-200">
                  <tbody>
                    <tr className="bg-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-slate-600 bg-slate-50 w-2/5">
                        Código de Catálogo
                      </th>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {tech.codigoCatalogo} (ID #{item.id})
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-slate-600 bg-slate-50">
                        Familia del Material
                      </th>
                      <td className="py-2.5 px-3 font-semibold text-sky-800">
                        {item.category}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-slate-600 bg-slate-50">
                        Material Constructivo
                      </th>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        {tech.materialBase}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-slate-600 bg-slate-50">
                        Dimensiones / Geometría
                      </th>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {tech.dimensiones}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-slate-600 bg-slate-50">
                        Nivel de Tensión / Red
                      </th>
                      <td className="py-2.5 px-3 text-slate-800">
                        {tech.nivelTension}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-slate-600 bg-slate-50">
                        Normas de Referencia
                      </th>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {tech.normaTecnica}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-slate-600 bg-slate-50">
                        Condición de Instalación
                      </th>
                      <td className="py-2.5 px-3 text-slate-700">
                        {tech.instalacion}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Descripción y Significado de Nomenclatura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-info text-sky-600"></i>
                <span>Descripción Funcional</span>
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200">
              <h4 className="text-xs font-bold text-sky-900 uppercase mb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-tags text-sky-600"></i>
                <span>Desglose de Nomenclaturas y Siglas</span>
              </h4>
              <p className="text-xs text-sky-950 leading-relaxed">
                {item.specs}
              </p>
            </div>
          </div>

          {/* Sección de Proveedor de Referencia donde Comprar / Cotizar */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-amber-950 uppercase flex items-center gap-1.5">
                  <i className="fa-solid fa-store text-amber-600"></i>
                  <span>Proveedor de Referencia donde Comprar / Cotizar</span>
                </h4>
                {item.precio_referencia != null && Number(item.precio_referencia) > 0 && (
                  <span className="bg-emerald-600 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">
                    Ref: ${Number(item.precio_referencia).toFixed(2)} USD
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-900">
                {item.proveedor_nombre || 'Distribuidor Autorizado de Materiales Eléctricos'}
              </p>
              <p className="text-xs text-slate-600">
                <i className="fa-solid fa-address-book mr-1 text-slate-400"></i>
                {item.proveedor_contacto || 'Dpto. de Ventas Industriales / Procura Eléctrica'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {item.proveedor_url && (
                <a
                  href={item.proveedor_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-cart-shopping"></i>
                  <span>Ir a Tienda del Proveedor</span>
                </a>
              )}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  'comprar proveedor material electrico ' + item.title
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <i className="fa-solid fa-magnifying-glass-dollar text-amber-600"></i>
                <span>Buscar Proveedores Web</span>
              </a>
            </div>
          </div>

          {/* Sección de Hoja de Datos PDF del Fabricante (Adjunto en PostgreSQL) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
                  <i className="fa-solid fa-file-pdf text-rose-600 text-base"></i>
                  <span>Catálogo / Hoja de Datos Original del Fabricante (PDF)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Puedes adjuntar el PDF técnico del fabricante desde tu PC (se guarda en <code className="text-sky-700">backend/uploads/</code> y en la columna <code className="text-sky-700">datasheet_url</code> de PostgreSQL).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleUploadDatasheetPdf}
                  className="hidden"
                />
                {canEdit && (
                  <button
                    type="button"
                    disabled={uploadingPdf}
                    onClick={() => pdfInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <i
                      className={`fa-solid ${
                        uploadingPdf ? 'fa-circle-notch fa-spin' : 'fa-file-arrow-up'
                      }`}
                    ></i>
                    <span>
                      {uploadingPdf
                        ? 'Subiendo PDF...'
                        : item.datasheet_url
                        ? 'Reemplazar PDF'
                        : 'Subir PDF del Fabricante'}
                    </span>
                  </button>
                )}

                {item.datasheet_url && canExport && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowEmbeddedPdf(!showEmbeddedPdf)}
                      className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-eye"></i>
                      <span>{showEmbeddedPdf ? 'Ocultar Visor' : 'Ver aquí'}</span>
                    </button>
                    <a
                      href={resolvedPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-up-right-from-square"></i>
                      <span>Abrir PDF</span>
                    </a>
                  </>
                )}

                {item.datasheet_url && canEdit && (
                  <button
                    type="button"
                    onClick={handleRemoveDatasheetPdf}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs rounded-lg cursor-pointer"
                    title="Quitar PDF asociado"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            </div>

            {pdfError && (
              <p className="mt-2 text-xs text-rose-600 font-medium">
                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                {pdfError}
              </p>
            )}

            {showEmbeddedPdf && resolvedPdfUrl && (
              <div className="mt-4 border border-slate-300 rounded-lg overflow-hidden h-96">
                <iframe
                  src={resolvedPdfUrl}
                  title="Datasheet PDF"
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal con Acciones Rápidas según Permisos */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditMaterial(item);
                }}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-pen-to-square"></i>
                <span>Editar Datos del Material</span>
              </button>
            )}

            {canComputos && (
              <button
                type="button"
                onClick={() => onAddToReq(item)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-cart-plus"></i>
                <span>Agregar a Cómputos Métricos</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canExport ? (
              <button
                type="button"
                onClick={handlePrintDatasheet}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-print"></i>
                <span>Imprimir / Exportar Hoja de Datos (PDF)</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-amber-600"></i>
                <span>Descarga PDF deshabilitada para tu rol</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
