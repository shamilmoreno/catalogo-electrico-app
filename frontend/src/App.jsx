import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import SearchAndFilters from './components/SearchAndFilters';
import CatalogGrid from './components/CatalogGrid';
import Pagination from './components/Pagination';
import ImageModal from './components/ImageModal';
import MaterialModal from './components/MaterialModal';
import RequisitionModal, { inferDefaultUnit } from './components/RequisitionModal';
import DatasheetModal from './components/DatasheetModal';
import LoginPage from './components/LoginPage';
import UsersModal from './components/UsersModal';
import FamiliasModal from './components/FamiliasModal';

const STORAGE_KEY = 'shamil_custom_catalog_images_613_v11';
const REQ_STORAGE_KEY = 'shamil_active_requisicion_draft_v1';
const AUTH_USER_KEY = 'corpoelec_auth_user_v1';
const AUTH_TOKEN_KEY = 'corpoelec_auth_token_v1';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${API_BASE}/materiales`;

function cleanQuery(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function App() {
  // Estado de Autenticación y Rol / Permisos del Usuario
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.nombre_completo === 'Shamil MOreno') {
        parsed.nombre_completo = 'Shamil Moreno';
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [materialsData, setMaterialsData] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [itemsPerPage, setItemsPerPage] = useState('48');
  const [currentPage, setCurrentPage] = useState(1);

  const [customImages, setCustomImages] = useState(() => {
    try {
      const storedImg = localStorage.getItem(STORAGE_KEY);
      return storedImg ? JSON.parse(storedImg) : {};
    } catch {
      return {};
    }
  });

  // Estado de la planilla activa de Cómputos Métricos / Requisición
  const [reqItems, setReqItems] = useState(() => {
    try {
      const storedReq = localStorage.getItem(REQ_STORAGE_KEY);
      return storedReq ? JSON.parse(storedReq) : [];
    } catch {
      return [];
    }
  });
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  // Estado para modal de gestión de Usuarios y Roles (RBAC)
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // Estado para modal de gestión de Familias de Materiales (CRUD)
  const [isFamiliasModalOpen, setIsFamiliasModalOpen] = useState(false);

  // Estado para modal de foto rápida
  const [editingImageItem, setEditingImageItem] = useState(null);

  // Estado para modal de Ficha Técnica Detallada / Datasheet PDF
  const [datasheetItem, setDatasheetItem] = useState(null);

  // Estado para modal CRUD (Crear / Editar material completo)
  const [materialModalState, setMaterialModalState] = useState({
    isOpen: false,
    mode: 'create',
    item: null,
  });

  // Verificar sesión activa contra PostgreSQL al montar
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          handleLogout();
          return;
        }
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  // Persistir borrador de cómputos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(reqItems));
    } catch {}
  }, [reqItems]);

  // Mapa rápido por ID de material para saber si está en la requisición actual
  const reqItemsMap = useMemo(() => {
    const map = {};
    for (const r of reqItems) {
      map[r.material_id || r.id] = r;
    }
    return map;
  }, [reqItems]);

  // Cargar lista de Familias desde PostgreSQL
  const fetchFamilias = async () => {
    try {
      const res = await fetch(`${API_BASE}/familias`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFamilias(data);
        }
      }
    } catch (e) {
      console.error('Error cargando familias desde PostgreSQL:', e);
    }
  };

  // Fetch al backend (PostgreSQL - db_catalogo) al montar la aplicación
  const fetchMateriales = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_URL);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || `Error HTTP: ${response.status}`);
      }

      const dbImages = {};
      const mapped = data.map((item, idx) => {
        const title = item.titulo || item.t;
        if (item.imagen_url) {
          dbImages[title] = item.imagen_url;
        }
        return {
          id: item.id || idx + 1,
          title,
          category: item.categoria || item.c,
          description: item.descripcion || item.d,
          specs: item.especificaciones || item.s,
          imagen_url: item.imagen_url || null,
          datasheet_url: item.datasheet_url || null,
          norma_tecnica: item.norma_tecnica || null,
          nivel_tension: item.nivel_tension || null,
          material_base: item.material_base || null,
          proveedor_nombre: item.proveedor_nombre || null,
          proveedor_contacto: item.proveedor_contacto || null,
          proveedor_url: item.proveedor_url || null,
          precio_referencia: item.precio_referencia ?? null,
          en_stock: item.en_stock ?? true,
        };
      });

      setMaterialsData(mapped);

      setCustomImages((prev) => {
        const merged = { ...prev, ...dbImages };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      });
    } catch (err) {
      console.error('Error cargando materiales desde la API PostgreSQL:', err);
      setError(
        err.message ||
          'No se pudo conectar con el servidor Backend (PostgreSQL) en http://localhost:3000/api/materiales.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchMateriales();
    fetchFamilias();
  }, [currentUser?.id]);

  // Filtrado por texto y categoría
  const filteredData = useMemo(() => {
    const searchClean = cleanQuery(searchQuery);
    return materialsData.filter((item) => {
      const itemClean = cleanQuery(
        `${item.id} ${item.title} ${item.description} ${item.specs} ${item.proveedor_nombre || ''}`
      );
      const matchesSearch = itemClean.includes(searchClean);
      const matchesCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materialsData, searchQuery, selectedCategory]);

  // Cálculo de paginación
  const totalItems = filteredData.length;
  const effectiveLimit =
    itemsPerPage === 'ALL'
      ? Math.max(totalItems, 1)
      : parseInt(itemsPerPage, 10);
  const totalPages = Math.ceil(totalItems / effectiveLimit) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * effectiveLimit;
  const endIndex = Math.min(startIndex + effectiveLimit, totalItems);
  const pageItems = filteredData.slice(startIndex, endIndex);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleLimitChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const persistCustomImages = (updatedImages) => {
    setCustomImages(updatedImages);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImages));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  };

  // --- OPERACIONES DE CÓMPUTOS MÉTRICOS / REQUISICIÓN ---
  const handleAddToReq = (item) => {
    if (!currentUser?.puede_computos) return;
    setReqItems((prev) => {
      const exists = prev.find((r) => (r.material_id || r.id) === item.id);
      if (exists) {
        return prev.map((r) =>
          (r.material_id || r.id) === item.id
            ? { ...r, cantidad: Number(r.cantidad) + 1 }
            : r
        );
      }
      return [
        ...prev,
        {
          material_id: item.id,
          id: item.id,
          title: item.title,
          category: item.category,
          unidad: inferDefaultUnit(item),
          cantidad: 1,
          nota_tecnica: '',
        },
      ];
    });
  };

  const handleUpdateReqQty = (materialId, newQty) => {
    if (newQty <= 0) {
      setReqItems((prev) =>
        prev.filter((r) => (r.material_id || r.id) !== materialId)
      );
    } else {
      setReqItems((prev) =>
        prev.map((r) =>
          (r.material_id || r.id) === materialId
            ? { ...r, cantidad: Number(newQty) }
            : r
        )
      );
    }
  };

  const handleUpdateReqItem = (materialId, patch) => {
    setReqItems((prev) =>
      prev.map((r) =>
        (r.material_id || r.id) === materialId ? { ...r, ...patch } : r
      )
    );
  };

  const handleRemoveReqItem = (materialId) => {
    setReqItems((prev) =>
      prev.filter((r) => (r.material_id || r.id) !== materialId)
    );
  };

  const handleClearReq = () => {
    if (window.confirm('¿Vaciar todos los ítems de la planilla de cómputos actual?')) {
      setReqItems([]);
    }
  };

  // --- OPERACIONES CRUD CON POSTGRESQL ---

  const handleSaveMaterialModal = async (formData) => {
    if (materialModalState.mode === 'create') {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'No se pudo crear el material.');
      }

      const created = data.material;
      const newItem = {
        id: created.id,
        title: created.titulo || created.t,
        category: created.categoria || created.c,
        description: created.descripcion || created.d,
        specs: created.especificaciones || created.s,
        imagen_url: created.imagen_url || null,
        datasheet_url: created.datasheet_url || null,
        proveedor_nombre: created.proveedor_nombre || null,
        proveedor_contacto: created.proveedor_contacto || null,
        proveedor_url: created.proveedor_url || null,
        precio_referencia: created.precio_referencia ?? null,
        en_stock: created.en_stock ?? true,
      };

      setMaterialsData((prev) => [newItem, ...prev]);
      if (newItem.imagen_url) {
        persistCustomImages({ ...customImages, [newItem.title]: newItem.imagen_url });
      }
      setMaterialModalState({ isOpen: false, mode: 'create', item: null });
      setCurrentPage(1);
      fetchFamilias();
    } else {
      const res = await fetch(`${API_URL}/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'No se pudo actualizar el material.');
      }

      const updated = data.material;
      const updatedItem = {
        id: updated.id,
        title: updated.titulo || updated.t,
        category: updated.categoria || updated.c,
        description: updated.descripcion || updated.d,
        specs: updated.especificaciones || updated.s,
        imagen_url: updated.imagen_url || null,
        datasheet_url: updated.datasheet_url || null,
        proveedor_nombre: updated.proveedor_nombre || null,
        proveedor_contacto: updated.proveedor_contacto || null,
        proveedor_url: updated.proveedor_url || null,
        precio_referencia: updated.precio_referencia ?? null,
        en_stock: updated.en_stock ?? true,
      };

      setMaterialsData((prev) =>
        prev.map((m) => (m.id === updatedItem.id ? updatedItem : m))
      );

      const nextCustomImages = { ...customImages };
      if (updatedItem.imagen_url) {
        nextCustomImages[updatedItem.title] = updatedItem.imagen_url;
      } else {
        delete nextCustomImages[updatedItem.title];
      }
      persistCustomImages(nextCustomImages);
      setMaterialModalState({ isOpen: false, mode: 'create', item: null });
      fetchFamilias();
    }
  };

  const handleDeleteMaterial = async (item) => {
    if (!currentUser?.puede_eliminar) return;
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el material #${item.id} ("${item.title}") de PostgreSQL?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'No se pudo eliminar.');
      }

      setMaterialsData((prev) => prev.filter((m) => m.id !== item.id));
      fetchFamilias();
    } catch (err) {
      alert(`Error al eliminar material: ${err.message}`);
    }
  };

  const handleToggleStock = async (item) => {
    if (!currentUser?.puede_editar) return;
    const nextStock = !(item.en_stock !== false);
    try {
      const res = await fetch(`${API_URL}/${item.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ en_stock: nextStock }),
      });
      if (res.ok) {
        setMaterialsData((prev) =>
          prev.map((m) =>
            m.id === item.id ? { ...m, en_stock: nextStock } : m
          )
        );
      }
    } catch (err) {
      console.error('Error al cambiar estado de stock:', err);
    }
  };

  const handleSaveCustomImage = async (item, url) => {
    if (!item || !currentUser?.puede_editar) return;
    const cleanUrl = url && url.trim() !== '' ? url.trim() : null;

    try {
      const res = await fetch(`${API_URL}/${item.id}/imagen`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_url: cleanUrl }),
      });

      if (res.ok) {
        setMaterialsData((prev) =>
          prev.map((m) =>
            m.id === item.id ? { ...m, imagen_url: cleanUrl } : m
          )
        );
      }
    } catch (e) {
      console.error('Error sincronizando imagen con PostgreSQL:', e);
    }

    const updated = { ...customImages };
    if (cleanUrl) {
      updated[item.title] = cleanUrl;
    } else {
      delete updated[item.title];
    }
    persistCustomImages(updated);
    setEditingImageItem(null);
  };

  const handleClearCustomImage = async (item) => {
    if (!item) return;
    await handleSaveCustomImage(item, null);
  };

  const handleDatasheetUpdated = (materialId, newDatasheetUrl) => {
    setMaterialsData((prev) =>
      prev.map((m) =>
        m.id === materialId ? { ...m, datasheet_url: newDatasheetUrl } : m
      )
    );
    setDatasheetItem((prev) =>
      prev && prev.id === materialId
        ? { ...prev, datasheet_url: newDatasheetUrl }
        : prev
    );
  };

  // Si no ha iniciado sesión, mostrar pantalla de Login con selector de roles
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        apiBaseUrl={API_BASE}
      />
    );
  }

  const printDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col">
      <Header
        totalCount={materialsData.length}
        familiasCount={familias.length || 11}
        reqCount={reqItems.length}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onOpenFamiliasModal={() => setIsFamiliasModalOpen(true)}
        onOpenCreateModal={() =>
          setMaterialModalState({ isOpen: true, mode: 'create', item: null })
        }
        onOpenRequisitionModal={() => setIsReqModalOpen(true)}
      />

      {/* Si el usuario NO tiene permiso de exportar (ej. rol VISOR) e intenta usar Ctrl+P, ocultar el catálogo en impresión */}
      {!currentUser.puede_exportar && (
        <style>{`
          @media print {
            main { display: none !important; }
            body::before {
              content: "DESCARGA E IMPRESIÓN DESHABILITADA PARA EL PERFIL DE SOLO LECTURA (VISOR)";
              display: block;
              padding: 40px;
              text-align: center;
              font-weight: bold;
              font-size: 18px;
              border: 2px solid #0f172a;
              margin: 40px;
            }
          }
        `}</style>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full container-print">
        {/* Cabecera para impresión PDF */}
        <div className="hidden header-print">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                CATÁLOGO TÉCNICO COMERCIAL DE MATERIALES ELÉCTRICOS
              </h1>
              <p className="text-sm text-slate-600">
                Inventario Oficial Detallado • {materialsData.length} Ítems • Emitido por: {currentUser.nombre_completo}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>
                Fecha: <span>{printDate}</span>
              </p>
              <p className="font-semibold text-slate-800">
                Total ítems: <span>{totalItems}</span>
              </p>
            </div>
          </div>
        </div>

        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          itemsPerPage={itemsPerPage}
          onLimitChange={handleLimitChange}
          totalItemsCount={materialsData.length}
          familias={familias}
          onOpenFamiliasModal={() => setIsFamiliasModalOpen(true)}
        />

        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-sky-600 mb-3"></i>
            <p className="text-sm font-medium text-slate-600">
              Cargando catálogo técnico desde PostgreSQL...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-rose-50 rounded-xl border border-rose-200 p-6">
            <i className="fa-solid fa-triangle-exclamation text-3xl text-rose-600 mb-3"></i>
            <h3 className="text-base font-bold text-rose-900 mb-1">
              Error de Conexión con el Backend / PostgreSQL
            </h3>
            <p className="text-xs text-rose-700 max-w-lg mx-auto">{error}</p>
          </div>
        ) : (
          <>
            <Pagination
              position="top"
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />

            <CatalogGrid
              items={pageItems}
              customImages={customImages}
              currentUser={currentUser}
              reqItemsMap={reqItemsMap}
              onAddToReq={handleAddToReq}
              onUpdateReqQty={handleUpdateReqQty}
              onOpenImageModal={(item) => setEditingImageItem(item)}
              onOpenDatasheet={(item) => setDatasheetItem(item)}
              onEditMaterial={(item) =>
                setMaterialModalState({ isOpen: true, mode: 'edit', item })
              }
              onDeleteMaterial={handleDeleteMaterial}
              onToggleStock={handleToggleStock}
            />

            <Pagination
              position="bottom"
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </main>

      {/* Modal para asignar o limpiar foto rápida */}
      <ImageModal
        isOpen={Boolean(editingImageItem)}
        item={editingImageItem}
        initialUrl={
          editingImageItem
            ? editingImageItem.imagen_url ||
              customImages[editingImageItem.title] ||
              ''
            : ''
        }
        onClose={() => setEditingImageItem(null)}
        onSave={handleSaveCustomImage}
        onClear={handleClearCustomImage}
      />

      {/* Modal CRUD para Crear o Editar Material completo */}
      <MaterialModal
        isOpen={materialModalState.isOpen}
        mode={materialModalState.mode}
        item={materialModalState.item}
        familias={familias}
        onOpenFamiliasModal={() => setIsFamiliasModalOpen(true)}
        onClose={() =>
          setMaterialModalState({ isOpen: false, mode: 'create', item: null })
        }
        onSubmit={handleSaveMaterialModal}
      />

      {/* Modal CRUD de Familias de Materiales */}
      <FamiliasModal
        isOpen={isFamiliasModalOpen}
        onClose={() => setIsFamiliasModalOpen(false)}
        familias={familias}
        currentUser={currentUser}
        onFamiliasChanged={async (oldName, newName) => {
          await fetchFamilias();
          await fetchMateriales();
          if (oldName && newName && selectedCategory === oldName) {
            setSelectedCategory(newName);
          }
        }}
        onSelectFamiliaFilter={(famNombre) => {
          setSelectedCategory(famNombre);
          setCurrentPage(1);
        }}
        apiBaseUrl={API_BASE}
      />

      {/* Modal de Cómputos Métricos y Requisición de Materiales */}
      <RequisitionModal
        isOpen={isReqModalOpen}
        onClose={() => setIsReqModalOpen(false)}
        reqItems={reqItems}
        onUpdateItem={handleUpdateReqItem}
        onRemoveItem={handleRemoveReqItem}
        onClearAll={handleClearReq}
        onLoadRequisition={(items) => setReqItems(items)}
        apiBaseUrl={API_BASE}
      />

      {/* Modal de Ficha Técnica Detallada y Hoja de Datos PDF (Datasheet) */}
      <DatasheetModal
        isOpen={Boolean(datasheetItem)}
        item={datasheetItem}
        customImg={datasheetItem ? customImages[datasheetItem.title] : ''}
        currentUser={currentUser}
        onClose={() => setDatasheetItem(null)}
        onAddToReq={handleAddToReq}
        onEditMaterial={(item) =>
          setMaterialModalState({ isOpen: true, mode: 'edit', item })
        }
        onDatasheetUpdated={handleDatasheetUpdated}
        apiBaseUrl={API_BASE}
      />

      {/* Modal de Gestión de Usuarios, Roles y Permisos (solo para ADMIN) */}
      <UsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        currentUser={currentUser}
        onCurrentUserUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        }}
        apiBaseUrl={API_BASE}
      />
    </div>
  );
}
