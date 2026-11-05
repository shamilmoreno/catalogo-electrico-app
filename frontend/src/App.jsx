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
import {
  apiFetch,
  API_BASE,
  AUTH_USER_KEY,
  AUTH_TOKEN_KEY,
} from './utils/api';

const STORAGE_KEY = 'shamil_custom_catalog_images_613_v11';
const REQ_STORAGE_KEY = 'shamil_active_requisicion_draft_v1';
const API_URL = `${API_BASE}/materiales`;

const DEMO_USER = {
  id: 'demo',
  isDemo: true,
  username: 'demo',
  email: 'demo@servimeta.com',
  nombre_completo: 'Visitante (Modo Demo)',
  cargo: 'Vista de Demostración',
  rol: 'DEMO',
  puede_crear: false,
  puede_editar: false,
  puede_eliminar: false,
  puede_computos: false,
  puede_exportar: false,
  puede_usuarios: false,
  activo: true,
};

const DEMO_FALLBACK_FAMILIAS = [
  { id: 1, nombre: 'Abrazaderas', codigo: 'FAM-ABR', color_badge: 'blue', total_materiales: 2, descripcion: 'Abrazaderas metálicas utilizadas para fijar elementos, tubos, herrajes o crucetas a postes o estructuras.' },
  { id: 2, nombre: 'Aisladores y Accesorios', codigo: 'FAM-AIS', color_badge: 'amber', total_materiales: 2, descripcion: 'Aisladores eléctricos de porcelana o poliméricos y accesorios diseñados para soporte mecánico y aislamiento dieléctrico.' },
  { id: 3, nombre: 'Conectores y Terminales', codigo: 'FAM-CON', color_badge: 'emerald', total_materiales: 2, descripcion: 'Conectores y terminales eléctricos diseñados para asegurar la continuidad eléctrica y fijación entre conductores o equipos.' },
  { id: 4, nombre: 'Fusibles, Seccionadores y Protección', codigo: 'FAM-PRO', color_badge: 'rose', total_materiales: 2, descripcion: 'Dispositivos de maniobra y protección contra sobrecorrientes o sobretensiones en redes de distribución eléctrica.' },
  { id: 5, nombre: 'Cables, Conductores y Cintas', codigo: 'FAM-CAB', color_badge: 'stone', total_materiales: 2, descripcion: 'Conductores eléctricos desnudos o aislados y cintas para transporte de energía, empalmes y aislamiento.' },
  { id: 6, nombre: 'Postes, Crucetas, Estructuras y Soportes', codigo: 'FAM-EST', color_badge: 'slate', total_materiales: 2, descripcion: 'Elementos estructurales de soporte para el tendido y montaje de herrajes, aisladores y equipos en líneas eléctricas.' },
];

const DEMO_FALLBACK_MATERIALS = [
  {
    id: 1,
    title: 'ABRAZADERA UNIVERSAL AG 3 A 3-1/2 3T',
    category: 'Abrazaderas',
    description: 'Abrazadera universal de acero galvanizado en caliente de 3 tornillos para sujeción de herrajes y crucetas en postes tubulares de distribución.',
    specs: 'AG: Acero Galvanizado • Diámetro: 3" a 3-1/2" • 3T: 3 Tornillos de fijación • Norma CADAFE / CORPOELEC.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Herrajes Eléctricos C.A. / Industrias Galvanizadas',
    precio_referencia: 14.5,
    en_stock: true,
  },
  {
    id: 2,
    title: 'ABRAZADERA EN U AG CRUCETA HIERRO 3-1/2"',
    category: 'Abrazaderas',
    description: 'Abrazadera tipo U en acero galvanizado diseñada para fijación mecánica de crucetas de hierro en estructuras de media tensión.',
    specs: 'AG: Acero Galvanizado ASTM A153 • Medida nominal: 3-1/2" • Incluye tuercas y arandelas de presión.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Herrajes Eléctricos C.A. / Industrias Galvanizadas',
    precio_referencia: 11.2,
    en_stock: true,
  },
  {
    id: 3,
    title: 'AISLADOR ESPIGA PORCELANA 23.9KV 56-2',
    category: 'Aisladores y Accesorios',
    description: 'Aislador de espiga (pin) en porcelana electrotécnica vitrificada clase ANSI 56-2 para líneas aéreas de distribución de 24 kV.',
    specs: 'Clase ANSI C29.6: 56-2 • Tensión nominal: 23.9 kV • Rosca de 1-3/8" • Acabado vidriado marrón/gris.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Suministros de Media Tensión (Ref. Gamma / Hubbell)',
    precio_referencia: 19.8,
    en_stock: true,
  },
  {
    id: 4,
    title: 'AISLADOR SUSPENSION POLIMERICO 34.5KV AG',
    category: 'Aisladores y Accesorios',
    description: 'Aislador polimérico de suspensión e intemperie en caucho de silicona hidrofóbico para redes de media tensión 34.5 kV.',
    specs: 'Tensión: 34.5 kV • Herrajes terminales en Acero Galvanizado (AG) • Alta resistencia a contaminación salina e industrial.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Suministros de Media Tensión (Ref. Gamma / Hubbell)',
    precio_referencia: 28.0,
    en_stock: true,
  },
  {
    id: 5,
    title: 'CORTACORRIENTE PORCELANA 13.8KV 100A 280MM',
    category: 'Fusibles, Seccionadores y Protección',
    description: 'Cortacorriente fusible de expulsión monopolar en porcelana para protección de transformadores y ramales de distribución en 13.8 kV.',
    specs: 'Tensión: 13.8 kV / 15 kV • Corriente nominal: 100 A • Línea de fuga: 280 mm • Norma ANSI C37.42.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Equipos de Protección y Maniobra MT (Ref. S&C / ABB)',
    precio_referencia: 64.0,
    en_stock: true,
  },
  {
    id: 6,
    title: 'CORTACORRIENTE PORCELANA 34.5KV 100A 560MM',
    category: 'Fusibles, Seccionadores y Protección',
    description: 'Seccionador fusible tipo cortacorriente de intemperie para protección de redes de distribución primaria en 34.5 kV.',
    specs: 'Tensión: 34.5 kV • Corriente nominal: 100 A • Distancia de fuga: 560 mm • Incluye herraje de montaje.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Equipos de Protección y Maniobra MT (Ref. S&C / ABB)',
    precio_referencia: 89.5,
    en_stock: false,
  },
  {
    id: 7,
    title: 'CONECTOR BIMETALICO DOBLE PERNO 1/0 A 4/0 AWG',
    category: 'Conectores y Terminales',
    description: 'Conector de derivación bimetálico de doble perno para empalme seguro entre conductores de aluminio (ACSR) y cobre.',
    specs: 'Rango de calibre: 1/0 AWG a 4/0 AWG • Cuerpo de aleación de aluminio y separador bimetálico • Norma ANSI C119.4.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Distribuidora de Conectores Eléctricos (Ref. Burndy)',
    precio_referencia: 8.75,
    en_stock: true,
  },
  {
    id: 8,
    title: 'TERMINAL COMPRESION COBRE 250 MCM 2 HUECOS',
    category: 'Conectores y Terminales',
    description: 'Terminal eléctrico de compresión en cobre electrolítico estañado de barril largo con pala de dos perforaciones.',
    specs: 'Calibre: 250 MCM (kcmil) • CU Estañado 99.9% • 2 Huecos NEMA • Norma UL 486A.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Distribuidora de Conectores Eléctricos (Ref. Burndy)',
    precio_referencia: 12.4,
    en_stock: true,
  },
  {
    id: 9,
    title: 'CONDUCTOR ARVIDAL AAAC CALIBRE 4/0 AWG DESNUDO',
    category: 'Cables, Conductores y Cintas',
    description: 'Conductor eléctrico desnudo de aleación de aluminio 6201-T81 (Arvidal) para líneas aéreas de distribución primaria y secundaria.',
    specs: 'Calibre: 4/0 AWG • Aleación AAAC 6201 • 7 Hilos • Norma COVENIN / ASTM B399.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Conductores Eléctricos Nacionales (Ref. Elecon / Cabel)',
    precio_referencia: 3.45,
    en_stock: true,
  },
  {
    id: 10,
    title: 'CABLE COBRE AISLADO THHN/THWN-2 2/0 AWG 600V',
    category: 'Cables, Conductores y Cintas',
    description: 'Conductor de cobre blando cableado con aislamiento termoplástico de PVC y chaqueta protectora de nylon para baja tensión.',
    specs: 'Calibre: 2/0 AWG • Tensión: 600 V • Temperatura de operación: 90 °C seco/húmedo.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Conductores Eléctricos Nacionales (Ref. Elecon / Cabel)',
    precio_referencia: 9.8,
    en_stock: true,
  },
  {
    id: 11,
    title: 'CRUCETA HIERRO ANGULAR GALVANIZADO 2.40 MTS',
    category: 'Postes, Crucetas, Estructuras y Soportes',
    description: 'Cruceta estructural de perfil angular de acero galvanizado en caliente para soporte de aisladores en líneas de 13.8 kV y 34.5 kV.',
    specs: 'Longitud: 2.40 m • Perfil L 75x75x6 mm • Galvanizado ASTM A123 • Perforaciones estándar CORPOELEC.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Metalúrgica de Postes y Crucetas Eléctricas C.A.',
    precio_referencia: 76.0,
    en_stock: true,
  },
  {
    id: 12,
    title: 'ESPIGA AG LARGO P/AISLADOR 35KV ROSCA 34.93MM',
    category: 'Postes, Crucetas, Estructuras y Soportes',
    description: 'Espiga o pin de acero forjado y galvanizado en caliente con cabezal de plomo para montaje de aisladores de espiga en crucetas.',
    specs: 'Tensión: 35 kV • Diámetro de rosca: 34.93 mm (1-3/8") • Vástago largo para cruceta.',
    imagen_url: null,
    datasheet_url: null,
    proveedor_nombre: 'Metalúrgica de Postes y Crucetas Eléctricas C.A.',
    precio_referencia: 15.6,
    en_stock: true,
  },
];

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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [itemsPerPage, setItemsPerPage] = useState('48');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // Al imprimir el catálogo (botón o Ctrl+P), renderizar todos los ítems filtrados y no solo la página actual
  useEffect(() => {
    const onBeforePrint = () => setIsPrinting(true);
    const onAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

  const handlePrintCatalog = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
    }, 80);
  };

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

  // Verificar sesión activa contra PostgreSQL al montar (excepto si está en Modo Demo)
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || currentUser?.isDemo) return;

    apiFetch('/auth/me')
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

  const handleEnterDemo = () => {
    setCurrentUser(DEMO_USER);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(DEMO_USER));
    localStorage.removeItem(AUTH_TOKEN_KEY);
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

  // Cargar lista de Familias desde PostgreSQL (con respaldo automático en Modo Demo)
  const fetchFamilias = async () => {
    try {
      const res = await fetch(`${API_BASE}/familias`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFamilias(data);
          return;
        }
      }
      if (currentUser?.isDemo) {
        setFamilias(DEMO_FALLBACK_FAMILIAS);
      }
    } catch (e) {
      console.error('Error cargando familias desde PostgreSQL:', e);
      if (currentUser?.isDemo) {
        setFamilias(DEMO_FALLBACK_FAMILIAS);
      }
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
      if (currentUser?.isDemo) {
        setMaterialsData(DEMO_FALLBACK_MATERIALS);
        setError(null);
      } else {
        setError(
          err.message ||
            'No se pudo conectar con el servidor Backend (PostgreSQL) en http://localhost:3000/api/materiales.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchMateriales();
    fetchFamilias();
  }, [currentUser?.id]);

  // Mapa rápido de colores de familias para las etiquetas del catálogo
  const familiasColorMap = useMemo(() => {
    const map = {};
    for (const f of familias) {
      if (f && f.nombre && f.color_badge) {
        map[f.nombre] = f.color_badge;
      }
    }
    return map;
  }, [familias]);

  // Contadores rápidos para los filtros de estado y auditoría
  const filterCounts = useMemo(() => {
    let inStock = 0;
    let outOfStock = 0;
    let withPhoto = 0;
    let withoutPhoto = 0;
    let withPdf = 0;

    for (const item of materialsData) {
      if (item.en_stock !== false) inStock++;
      else outOfStock++;

      const hasImg = Boolean(item.imagen_url || customImages[item.title]);
      if (hasImg) withPhoto++;
      else withoutPhoto++;

      if (item.datasheet_url) withPdf++;
    }

    return { inStock, outOfStock, withPhoto, withoutPhoto, withPdf };
  }, [materialsData, customImages]);

  // Filtrado por texto, categoría y estado
  const filteredData = useMemo(() => {
    const searchClean = cleanQuery(searchQuery);
    return materialsData.filter((item) => {
      const itemClean = cleanQuery(
        `${item.id} ${item.title} ${item.description} ${item.specs} ${item.proveedor_nombre || ''}`
      );
      const matchesSearch = itemClean.includes(searchClean);
      const matchesCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;

      let matchesStatus = true;
      const hasImg = Boolean(item.imagen_url || customImages[item.title]);
      if (statusFilter === 'IN_STOCK') matchesStatus = item.en_stock !== false;
      else if (statusFilter === 'OUT_OF_STOCK') matchesStatus = item.en_stock === false;
      else if (statusFilter === 'WITH_PHOTO') matchesStatus = hasImg;
      else if (statusFilter === 'WITHOUT_PHOTO') matchesStatus = !hasImg;
      else if (statusFilter === 'WITH_PDF') matchesStatus = Boolean(item.datasheet_url);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [materialsData, searchQuery, selectedCategory, statusFilter, customImages]);

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

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
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
          precio_referencia: item.precio_referencia ?? null,
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
      const res = await apiFetch('/materiales', {
        method: 'POST',
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
        norma_tecnica: created.norma_tecnica || null,
        nivel_tension: created.nivel_tension || null,
        material_base: created.material_base || null,
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
      const res = await apiFetch(`/materiales/${formData.id}`, {
        method: 'PUT',
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
        norma_tecnica: updated.norma_tecnica || null,
        nivel_tension: updated.nivel_tension || null,
        material_base: updated.material_base || null,
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
      const res = await apiFetch(`/materiales/${item.id}`, {
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
      const res = await apiFetch(`/materiales/${item.id}/stock`, {
        method: 'PATCH',
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
      const res = await apiFetch(`/materiales/${item.id}/imagen`, {
        method: 'PUT',
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

  // Si no ha iniciado sesión, mostrar pantalla de Login con identidad Servimeta C.A.
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onEnterDemo={handleEnterDemo}
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
    <div className="bg-zinc-100 min-h-screen text-zinc-800 flex flex-col">
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
        onPrintCatalog={handlePrintCatalog}
      />

      {/* Banner informativo cuando se está navegando en Modo Demo Simple sin loguearse */}
      {currentUser.isDemo && (
        <div className="bg-amber-950 text-amber-100 border-b border-amber-700/60 px-4 py-2.5 text-xs no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="bg-amber-500 text-zinc-950 font-extrabold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0">
                Modo Demo Simple
              </span>
              <span>
                Estás viendo una demostración de consulta rápida sin iniciar sesión. Para crear, editar o gestionar cómputos, inicia sesión con tu cuenta.
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold px-3 py-1 rounded-lg text-[11px] transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              <span>Iniciar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Si el usuario NO tiene permiso de exportar (ej. rol VISOR o DEMO) e intenta usar Ctrl+P, ocultar el catálogo en impresión */}
      {!currentUser.puede_exportar && (
        <style>{`
          @media print {
            main { display: none !important; }
            body::before {
              content: "DESCARGA E IMPRESIÓN DESHABILITADA PARA EL PERFIL DE SOLO LECTURA (VISOR / DEMO) — SERVIMETA C.A.";
              display: block;
              padding: 40px;
              text-align: center;
              font-weight: bold;
              font-size: 18px;
              border: 2px solid #601717;
              margin: 40px;
            }
          }
        `}</style>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full container-print">
        {/* Cabecera para impresión PDF con Identidad Corporativa Servimeta C.A. */}
        <div className="hidden header-print">
          <div className="flex justify-between items-center pb-3">
            <div className="flex items-center gap-4">
              <img
                src="/logo-servimeta.png"
                alt="Servimeta C.A."
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-extrabold text-zinc-950 uppercase tracking-tight">
                  CATÁLOGO TÉCNICO COMERCIAL DE MATERIALES ELÉCTRICOS
                </h1>
                <p className="text-xs text-zinc-600 font-medium">
                  <strong>Servimeta C.A.</strong> (RIF: J-30786992-5) • Inventario Oficial ({materialsData.length} Ítems) • Emitido por: {currentUser.nombre_completo}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-zinc-600">
              <p>
                Fecha: <span className="font-semibold">{printDate}</span>
              </p>
              <p className="font-bold text-servimeta-800">
                Total ítems listados: <span>{totalItems}</span>
              </p>
            </div>
          </div>
        </div>

        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          itemsPerPage={itemsPerPage}
          onLimitChange={handleLimitChange}
          totalItemsCount={materialsData.length}
          filterCounts={filterCounts}
          familias={familias}
          onOpenFamiliasModal={() => setIsFamiliasModalOpen(true)}
        />

        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-zinc-200 shadow-sm">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-servimeta-700 mb-3"></i>
            <p className="text-sm font-medium text-zinc-600">
              Cargando catálogo técnico de Servimeta C.A....
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
              items={isPrinting ? filteredData : pageItems}
              customImages={customImages}
              familiasColorMap={familiasColorMap}
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

      {/* Pie de Página Corporativo Servimeta C.A. */}
      <footer className="bg-zinc-950 text-zinc-400 border-t-2 border-servimeta-800 py-4 px-4 sm:px-6 lg:px-8 mt-8 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="bg-white px-2 py-1 rounded-lg">
              <img
                src="/logo-servimeta.png"
                alt="Servimeta C.A."
                className="h-5 w-auto object-contain"
              />
            </div>
            <span>
              <strong className="text-white">Servimeta C.A.</strong> • RIF: J-30786992-5
            </span>
          </div>
          <div className="text-zinc-500 text-center sm:text-right">
            Catálogo Técnico Comercial de Materiales Eléctricos • Gestión de Inventario y Cómputos Métricos
          </div>
        </div>
      </footer>

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
