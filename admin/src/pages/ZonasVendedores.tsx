import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Map as MapIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Draw as DrawIcon,
  Block as BlockIcon,
  Apartment as ApartmentIcon,
  Home as HomeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Place as PlaceIcon
} from '@mui/icons-material';
import { GoogleMap, useLoadScript, DrawingManager, Polygon, InfoWindow } from '@react-google-maps/api';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing")[] = ['places', 'geometry', 'drawing'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 };

const ZONE_COLOR = '#4CAF50'; // Verde fijo para zonas de venta

interface User {
  id: string;
  displayName: string;
  email: string;
  productLine?: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

interface KioskOption {
  id: string;
  name: string;
}

interface ZoneCoord {
  lat: number;
  lng: number;
}

interface Zone {
  id: string;
  name: string;
  description: string;
  type: 'polygon' | 'municipality' | 'colonia';
  assignedSellerId: string;
  assignedSellerName: string;
  assignedKioskId?: string;
  assignedKioskName?: string;
  coordinates: ZoneCoord[];
  color: string;
  isActive: boolean;
  municipalityName?: string;
  municipalityState?: string;
  coloniaName?: string;
  postalCode?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface ForbiddenZone {
  id: string;
  name: string;
  description: string;
  coordinates: ZoneCoord[];
  isActive: boolean;
  /** IDs de promotores asignados. Vacío = aplica a todos (global). */
  assignedPromotorIds: string[];
  createdAt?: Timestamp;
}

// Estados de México para el selector
const MEXICO_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Estado de México',
  'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora',
  'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

const ZonasVendedores: React.FC = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [zones, setZones] = useState<Zone[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterProductLine, setFilterProductLine] = useState('all');
  const [kiosks, setKiosks] = useState<KioskOption[]>([]);
  const [assignType, setAssignType] = useState<'seller' | 'kiosk'>('seller');
  const [panelKiosk, setPanelKiosk] = useState<KioskOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<'none' | 'polygon'>('none');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [hiddenZones, setHiddenZones] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<Zone | null>(null);

  // Estado para nueva zona
  const [newZoneDialog, setNewZoneDialog] = useState(false);
  const [newZoneType, setNewZoneType] = useState<'polygon' | 'municipality' | 'colonia'>('polygon');
  const [pendingPolygon, setPendingPolygon] = useState<ZoneCoord[] | null>(null);
  const [newZoneDescription, setNewZoneDescription] = useState('');
  const [newZoneSeller, setNewZoneSeller] = useState<User | null>(null);
  const [newZoneMunicipality, setNewZoneMunicipality] = useState('');
  const [newZoneState, setNewZoneState] = useState('');
  const [newZoneColonia, setNewZoneColonia] = useState('');
  const [newZonePostalCode, setNewZonePostalCode] = useState('');
  // Seller-first flow: seller selected in the panel before zone creation
  const [panelSeller, setPanelSeller] = useState<User | null>(null);
  // Date range as zone name
  const [newZoneStartDate, setNewZoneStartDate] = useState('');
  const [newZoneEndDate, setNewZoneEndDate] = useState('');
  // Google Places autocomplete for municipality
  const [municipalityOptions, setMunicipalityOptions] = useState<string[]>([]);
  const [municipalityLoading, setMunicipalityLoading] = useState(false);

  // ── Zonas Prohibidas ──────────────────────────────────────────
  const [forbiddenZones, setForbiddenZones] = useState<ForbiddenZone[]>([]);
  const [drawingForbiddenMode, setDrawingForbiddenMode] = useState(false);
  const [pendingForbiddenPolygon, setPendingForbiddenPolygon] = useState<ZoneCoord[] | null>(null);
  const [forbiddenDialog, setForbiddenDialog] = useState(false);
  const [forbiddenZoneName, setForbiddenZoneName] = useState('');
  const [forbiddenZoneDesc, setForbiddenZoneDesc] = useState('');
  const [forbiddenZonePromotors, setForbiddenZonePromotors] = useState<User[]>([]);
  const [savingForbidden, setSavingForbidden] = useState(false);
  const [deleteForbiddenDialog, setDeleteForbiddenDialog] = useState<ForbiddenZone | null>(null);
  const [selectedForbiddenZone, setSelectedForbiddenZone] = useState<ForbiddenZone | null>(null);
  const [forbiddenOverlapDialog, setForbiddenOverlapDialog] = useState(false);
  const [overlappingZones, setOverlappingZones] = useState<Zone[]>([]);

  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  useEffect(() => {
    fetchZones();
    fetchUsers();
    fetchKiosks();
    fetchForbiddenZones();
    fetchProducts();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'zones'));
      const data: Zone[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Zone));
      setZones(data);
    } catch (e: any) {
      setError('Error al cargar zonas: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchForbiddenZones = async () => {
    try {
      const snap = await getDocs(collection(db, 'forbidden_zones'));
      const data: ForbiddenZone[] = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ForbiddenZone))
        .filter(z => z.isActive !== false);
      setForbiddenZones(data);
    } catch (e: any) {
      console.error('Error cargando zonas prohibidas:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data: User[] = snap.docs.map(d => ({
        id: d.id,
        displayName: d.data().displayName || 'Sin nombre',
        email: d.data().email || '',
        productLine: d.data().productLine
      }));
      setUsers(data.filter(u => u.displayName !== 'Sin nombre').sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      ));
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    }
  };

  const fetchKiosks = async () => {
    try {
      const snap = await getDocs(collection(db, 'kiosks'));
      const data: KioskOption[] = snap.docs
        .map(d => ({ id: d.id, name: d.data().name || 'Sin nombre' }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setKiosks(data);
    } catch (e) {
      console.error('Error cargando kioscos:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const data: Product[] = snap.docs
        .filter(d => d.data().isActive !== false)
        .map(d => ({ id: d.id, name: d.data().name || d.data().code, code: d.data().code || '' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
      setProducts(data);
    } catch (e) {
      console.error('Error cargando productos:', e);
    }
  };

  const handleForbiddenPolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const coords: ZoneCoord[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coords.push({ lat: point.lat(), lng: point.lng() });
    }
    polygon.setMap(null);
    setPendingForbiddenPolygon(coords);
    setForbiddenDialog(true);
    setDrawingForbiddenMode(false);
  }, []);

  const isPointInPolygon = (point: ZoneCoord, polygon: ZoneCoord[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const polygonsOverlap = (poly1: ZoneCoord[], poly2: ZoneCoord[]): boolean => {
    for (const pt of poly1) {
      if (isPointInPolygon(pt, poly2)) return true;
    }
    for (const pt of poly2) {
      if (isPointInPolygon(pt, poly1)) return true;
    }
    return false;
  };

  const doSaveForbiddenZone = async () => {
    if (!forbiddenZoneName.trim() || !pendingForbiddenPolygon) return;
    setSavingForbidden(true);
    try {
      await addDoc(collection(db, 'forbidden_zones'), {
        name: forbiddenZoneName.trim(),
        description: forbiddenZoneDesc.trim(),
        coordinates: pendingForbiddenPolygon,
        isActive: true,
        assignedPromotorIds: forbiddenZonePromotors.map(u => u.id),
        createdAt: Timestamp.now()
      });
      setSuccess('Zona prohibida guardada');
      setForbiddenDialog(false);
      setForbiddenOverlapDialog(false);
      setForbiddenZoneName('');
      setForbiddenZoneDesc('');
      setForbiddenZonePromotors([]);
      setPendingForbiddenPolygon(null);
      setOverlappingZones([]);
      await fetchForbiddenZones();
    } catch (e: any) {
      setError('Error al guardar: ' + e.message);
    } finally {
      setSavingForbidden(false);
    }
  };

  const handleSaveForbiddenZone = async () => {
    if (!forbiddenZoneName.trim() || !pendingForbiddenPolygon) return;

    // Check if the forbidden zone overlaps with any existing sales zones
    const overlapping = zones.filter(zone =>
      zone.isActive &&
      zone.coordinates &&
      zone.coordinates.length >= 3 &&
      polygonsOverlap(pendingForbiddenPolygon, zone.coordinates)
    );

    if (overlapping.length > 0) {
      setOverlappingZones(overlapping);
      setForbiddenOverlapDialog(true);
      return;
    }

    await doSaveForbiddenZone();
  };

  const handleDeleteForbiddenZone = async (zone: ForbiddenZone) => {
    try {
      await deleteDoc(doc(db, 'forbidden_zones', zone.id));
      setSuccess('Zona prohibida eliminada');
      setDeleteForbiddenDialog(null);
      await fetchForbiddenZones();
    } catch (e: any) {
      setError('Error al eliminar: ' + e.message);
    }
  };

  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const coords: ZoneCoord[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coords.push({ lat: point.lat(), lng: point.lng() });
    }
    polygon.setMap(null); // Quitar el polígono temporal
    setPendingPolygon(coords);
    setNewZoneType('polygon');
    if (assignType === 'seller') {
      setNewZoneSeller(panelSeller); // Pre-populate seller from panel
    }
    setNewZoneDialog(true);
    setDrawingMode('none');
  }, [panelSeller, assignType]);

  const generateZoneName = (start: string, end: string): string => {
    const fmt = (d: string) => {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    };
    return `${fmt(start)} al ${fmt(end)}`;
  };

  const fetchMunicipalitySuggestions = useCallback((input: string) => {
    if (!input || input.length < 2 || !window.google) {
      setMunicipalityOptions([]);
      return;
    }
    setMunicipalityLoading(true);
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      { input, types: ['(cities)'], componentRestrictions: { country: 'mx' } },
      (predictions, status) => {
        setMunicipalityLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setMunicipalityOptions([...new Set(predictions.map(p => p.structured_formatting.main_text))]);
        } else {
          setMunicipalityOptions([]);
        }
      }
    );
  }, []);

  const handleSaveZone = async () => {
    if (!newZoneStartDate || !newZoneEndDate) {
      setError('Debes seleccionar el rango de fechas de la zona');
      return;
    }
    if (assignType === 'seller' && !newZoneSeller) {
      setError('Debes asignar un vendedor a la zona');
      return;
    }
    if (assignType === 'kiosk' && !panelKiosk) {
      setError('Debes seleccionar un kiosco');
      return;
    }

    const generatedName = generateZoneName(newZoneStartDate, newZoneEndDate);

    let coordinates: ZoneCoord[] = [];
    if (newZoneType === 'polygon' && pendingPolygon) {
      coordinates = pendingPolygon;
    } else if (newZoneType === 'municipality' || newZoneType === 'colonia') {
      // Para municipios/colonias, geocodificar usando Google Maps
      coordinates = await geocodeLocation(
        newZoneType === 'municipality'
          ? `${newZoneMunicipality}, ${newZoneState}, México`
          : `${newZoneColonia}, ${newZoneMunicipality}, ${newZoneState}, México`
      );
    }

    setSaving(true);
    try {
      const zoneData: Omit<Zone, 'id'> = {
        name: generatedName,
        description: newZoneDescription.trim(),
        type: newZoneType,
        assignedSellerId: assignType === 'seller' ? (newZoneSeller?.id || '') : '',
        assignedSellerName: assignType === 'seller' ? (newZoneSeller?.displayName || '') : '',
        ...(assignType === 'kiosk' && panelKiosk && {
          assignedKioskId: panelKiosk.id,
          assignedKioskName: panelKiosk.name,
        }),
        coordinates,
        color: ZONE_COLOR,
        isActive: true,
        startDate: newZoneStartDate,
        endDate: newZoneEndDate,
        ...(newZoneType === 'municipality' && {
          municipalityName: newZoneMunicipality,
          municipalityState: newZoneState
        }),
        ...(newZoneType === 'colonia' && {
          coloniaName: newZoneColonia,
          municipalityName: newZoneMunicipality,
          municipalityState: newZoneState,
          postalCode: newZonePostalCode
        }),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'zones'), zoneData);
      setSuccess('Zona guardada correctamente');
      resetNewZoneForm();
      await fetchZones();
    } catch (e: any) {
      setError('Error al guardar zona: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const geocodeLocation = async (address: string): Promise<ZoneCoord[]> => {
    return new Promise((resolve) => {
      if (!window.google) {
        resolve([]);
        return;
      }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          // Crear un polígono aproximado alrededor del punto geocodificado
          const lat = loc.lat();
          const lng = loc.lng();
          const offset = 0.02; // ~2km
          resolve([
            { lat: lat + offset, lng: lng - offset },
            { lat: lat + offset, lng: lng + offset },
            { lat: lat - offset, lng: lng + offset },
            { lat: lat - offset, lng: lng - offset }
          ]);
        } else {
          resolve([]);
        }
      });
    });
  };

  const handleDeleteZone = async (zone: Zone) => {
    try {
      await deleteDoc(doc(db, 'zones', zone.id));
      setSuccess('Zona eliminada');
      setDeleteDialog(null);
      await fetchZones();
    } catch (e: any) {
      setError('Error al eliminar: ' + e.message);
    }
  };

  const handleToggleZoneVisibility = (zoneId: string) => {
    setHiddenZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const resetNewZoneForm = () => {
    setNewZoneDialog(false);
    setNewZoneDescription('');
    setNewZoneSeller(null);

    setNewZoneMunicipality('');
    setNewZoneState('');
    setNewZoneColonia('');
    setNewZonePostalCode('');
    setPendingPolygon(null);
    setNewZoneType('polygon');
    setNewZoneStartDate('');
    setNewZoneEndDate('');
  };

  const getZoneTypeLabel = (type: string) => {
    switch (type) {
      case 'polygon': return 'Polígono';
      case 'municipality': return 'Municipio';
      case 'colonia': return 'Colonia';
      default: return type;
    }
  };

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case 'polygon': return <DrawIcon fontSize="small" />;
      case 'municipality': return <ApartmentIcon fontSize="small" />;
      case 'colonia': return <HomeIcon fontSize="small" />;
      default: return <PlaceIcon fontSize="small" />;
    }
  };

  if (loadError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Error al cargar Google Maps: {loadError.message}</Alert>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} />
          <Typography>Cargando Google Maps...</Typography>
        </Stack>
      </Box>
    );
  }

  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  // Usuarios filtrados por línea de producto para el selector del panel
  const filteredUsers = filterProductLine === 'all'
    ? users
    : users.filter(u => u.productLine?.toLowerCase() === filterProductLine.toLowerCase());

  // "Mis Zonas" list: filter by the currently selected seller or kiosk
  const filteredListZones = (() => {
    if (assignType === 'seller' && panelSeller) {
      return zones.filter(z => z.assignedSellerId === panelSeller.id);
    }
    if (assignType === 'kiosk' && panelKiosk) {
      return zones.filter(z => z.assignedKioskId === panelKiosk.id);
    }
    return zones; // Show all when nothing is selected
  })();

  // Map zones: same entity filter + exclude expired + respect hide toggle
  const visibleZones = (() => {
    const base = zones.filter(z => {
      if (!z.isActive) return false;
      if (z.endDate && z.endDate < today) return false;
      return true;
    });
    const entityFiltered = (() => {
      if (assignType === 'seller' && panelSeller) {
        return base.filter(z => z.assignedSellerId === panelSeller.id);
      }
      if (assignType === 'kiosk' && panelKiosk) {
        return base.filter(z => z.assignedKioskId === panelKiosk.id);
      }
      return base;
    })();
    return entityFiltered.filter(z => !hiddenZones.has(z.id));
  })();

  // Forbidden zones on map: when a seller is selected, show only those that apply to them
  // (global ones with empty assignedPromotorIds, or explicitly assigned to this seller)
  const visibleForbiddenZones = (() => {
    if (assignType === 'seller' && panelSeller) {
      return forbiddenZones.filter(fz =>
        !fz.assignedPromotorIds || fz.assignedPromotorIds.length === 0 ||
        fz.assignedPromotorIds.includes(panelSeller.id)
      );
    }
    return forbiddenZones;
  })();

  // Whether the user has selected an entity (seller or kiosk) in the panel
  const hasEntity = assignType === 'seller' ? !!panelSeller : !!panelKiosk;

  return (
    <Box sx={{
      position: 'fixed',
      top: 64,
      left: 270,
      right: 0,
      bottom: 0,
      display: 'flex',
      bgcolor: 'background.default'
    }}>
      {/* Panel lateral */}
      <Paper
        elevation={2}
        sx={{
          width: 380,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: 1,
          borderColor: 'divider',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <MapIcon />
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                Gestión de Zonas
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {visibleZones.length} venta · {visibleForbiddenZones.length} prohibidas
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Tabs: Dibujar | Lista */}
        <Tabs
          value={selectedTab}
          onChange={(_, v) => setSelectedTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant="fullWidth"
        >
          <Tab label="Crear Zona" />
          <Tab label={`Mis Zonas (${filteredListZones.length})`} />
          <Tab
            label={`🚫 Prohibidas${forbiddenZones.length > 0 ? ` (${forbiddenZones.length})` : ''}`}
            sx={{ color: selectedTab === 2 ? 'error.main' : undefined }}
          />
        </Tabs>

        {/* Tab: Crear Zona */}
        {selectedTab === 0 && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {/* Paso 1: Seleccionar vendedor o kiosco */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              1. Selecciona el vendedor o kiosco:
            </Typography>
            <ToggleButtonGroup
              value={assignType}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (!v) return;
                setAssignType(v);
                setPanelSeller(null);
                setPanelKiosk(null);
              }}
              sx={{ mb: 1.5 }}
            >
              <ToggleButton value="seller">Vendedor</ToggleButton>
              <ToggleButton value="kiosk">Kiosco</ToggleButton>
            </ToggleButtonGroup>
            {assignType === 'seller' ? (
              <>
                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                  <InputLabel>Filtrar por producto</InputLabel>
                  <Select
                    value={filterProductLine}
                    label="Filtrar por producto"
                    onChange={(e) => {
                      setFilterProductLine(e.target.value);
                      setPanelSeller(null); // reset seller when product changes
                    }}
                  >
                    <MenuItem value="all">Todos los productos</MenuItem>
                    {products.map((p) => (
                      <MenuItem key={p.id} value={p.code}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Autocomplete
                options={filteredUsers}
                value={panelSeller}
                onChange={(_, v) => setPanelSeller(v)}
                getOptionLabel={u => u.displayName}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, u) => <li {...props} key={u.id}>{u.displayName}</li>}
                renderInput={(params) => (
                  <TextField {...params} label="Vendedor *" size="small" placeholder="Selecciona primero el vendedor" />
                )}
                sx={{ mb: 2 }}
              />
              </>
            ) : (
              <Autocomplete
                options={kiosks}
                value={panelKiosk}
                onChange={(_, v) => setPanelKiosk(v)}
                getOptionLabel={k => k.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, k) => <li {...props} key={k.id}>{k.name}</li>}
                renderInput={(params) => (
                  <TextField {...params} label="Kiosco *" size="small" placeholder="Selecciona el kiosco" />
                )}
                sx={{ mb: 2 }}
              />
            )}

            {/* Paso 2: Tipo de zona */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              2. Tipo de zona a crear:
            </Typography>

            {/* Opción 1: Dibujar polígono */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2,
              border: drawingMode === 'polygon' ? '2px solid' : '1px solid',
              borderColor: drawingMode === 'polygon' ? 'primary.main' : 'divider'
            }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <DrawIcon color="primary" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>Dibujar polígono</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dibuja libremente el área en el mapa
                  </Typography>
                </Box>
                <Tooltip title={!hasEntity ? 'Selecciona un vendedor o kiosco primero' : ''}>
                  <span>
                    <Button
                      variant={drawingMode === 'polygon' ? 'contained' : 'outlined'}
                      size="small"
                      disabled={!hasEntity}
                      onClick={() => setDrawingMode(drawingMode === 'polygon' ? 'none' : 'polygon')}
                    >
                      {drawingMode === 'polygon' ? 'Cancelar' : 'Dibujar'}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
              {drawingMode === 'polygon' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Haz clic en el mapa para definir los vértices del polígono. Doble clic para terminar.
                </Alert>
              )}
            </Paper>

            {/* Opción 2: Seleccionar municipio */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                <ApartmentIcon color="secondary" />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Por municipio</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Selecciona un municipio completo
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={1.5}>
                <Autocomplete
                  options={MEXICO_STATES}
                  value={newZoneState}
                  onChange={(_, v) => setNewZoneState(v || '')}
                  isOptionEqualToValue={(option, value) => option === value || value === ''}
                  renderInput={(params) => <TextField {...params} label="Estado" size="small" />}
                />
                <Autocomplete
                  freeSolo
                  options={municipalityOptions}
                  loading={municipalityLoading}
                  value={newZoneMunicipality}
                  onInputChange={(_, value) => {
                    setNewZoneMunicipality(value);
                    fetchMunicipalitySuggestions(value);
                  }}
                  isOptionEqualToValue={(option, value) => option === value || value === ''}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Municipio / Alcaldía"
                      size="small"
                      placeholder="Escribe para ver sugerencias..."
                    />
                  )}
                />
                <Tooltip title={!hasEntity ? 'Selecciona un vendedor o kiosco primero' : ''}>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={!hasEntity || !newZoneState || !newZoneMunicipality}
                      onClick={() => {
                        setNewZoneType('municipality');
                        if (assignType === 'seller') setNewZoneSeller(panelSeller);
                        setNewZoneDialog(true);
                      }}
                      startIcon={<AddIcon />}
                    >
                      Agregar municipio como zona
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Paper>

            {/* Opción 3: Seleccionar colonia */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                <HomeIcon color="success" />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Por colonia / CP</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Selecciona una colonia o código postal específico
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={1.5}>
                <Autocomplete
                  options={MEXICO_STATES}
                  value={newZoneState}
                  onChange={(_, v) => setNewZoneState(v || '')}
                  isOptionEqualToValue={(option, value) => option === value || value === ''}
                  renderInput={(params) => <TextField {...params} label="Estado" size="small" />}
                />
                <Autocomplete
                  freeSolo
                  options={municipalityOptions}
                  loading={municipalityLoading}
                  value={newZoneMunicipality}
                  onInputChange={(_, value) => {
                    setNewZoneMunicipality(value);
                    fetchMunicipalitySuggestions(value);
                  }}
                  isOptionEqualToValue={(option, value) => option === value || value === ''}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Municipio / Alcaldía"
                      size="small"
                      placeholder="Escribe para ver sugerencias..."
                    />
                  )}
                />
                <TextField
                  label="Colonia"
                  size="small"
                  fullWidth
                  value={newZoneColonia}
                  onChange={e => setNewZoneColonia(e.target.value)}
                />
                <TextField
                  label="Código Postal (opcional)"
                  size="small"
                  fullWidth
                  value={newZonePostalCode}
                  onChange={e => setNewZonePostalCode(e.target.value)}
                />
                <Tooltip title={!hasEntity ? 'Selecciona un vendedor o kiosco primero' : ''}>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      fullWidth
                      disabled={!hasEntity || !newZoneState || !newZoneMunicipality || !newZoneColonia}
                      onClick={() => {
                        setNewZoneType('colonia');
                        if (assignType === 'seller') setNewZoneSeller(panelSeller);
                        setNewZoneDialog(true);
                      }}
                      startIcon={<AddIcon />}
                    >
                      Agregar colonia como zona
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Tab: Lista de zonas */}
        {selectedTab === 1 && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/* Filter banner */}
            <Box sx={{ px: 1.5, pt: 1.5 }}>
              {assignType === 'seller' && panelSeller ? (
                <Alert severity="info" icon={false} sx={{ py: 0.5, mb: 1 }}>
                  Vendedor: <strong>{panelSeller.displayName}</strong>
                </Alert>
              ) : assignType === 'kiosk' && panelKiosk ? (
                <Alert severity="info" icon={false} sx={{ py: 0.5, mb: 1 }}>
                  Kiosco: <strong>{panelKiosk.name}</strong>
                </Alert>
              ) : (
                <Alert severity="info" icon={false} sx={{ py: 0.5, mb: 1 }}>
                  Selecciona un vendedor o kiosco en "Crear Zona" para filtrar
                </Alert>
              )}
            </Box>
            {loading ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={40} />
              </Box>
            ) : filteredListZones.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <MapIcon sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  No hay zonas para esta selección
                </Typography>
              </Box>
            ) : (
              <List dense>
                {filteredListZones.map(zone => {
                  const isExpired = !!(zone.endDate && zone.endDate < today);
                  return (
                    <ListItem key={zone.id} disablePadding>
                      <Box sx={{ px: 1.5, py: 0.5, width: '100%', opacity: isExpired ? 0.5 : 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: isExpired ? 'text.disabled' : zone.color,
                              flexShrink: 0
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {zone.name}
                              </Typography>
                              {isExpired && (
                                <Chip label="Caducada" size="small" color="default" sx={{ height: 16, fontSize: 10 }} />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {zone.assignedKioskName || zone.assignedSellerName || 'Sin asignar'} • {getZoneTypeLabel(zone.type)}
                            </Typography>
                          </Box>
                          <Tooltip title={hiddenZones.has(zone.id) ? 'Mostrar' : 'Ocultar'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleZoneVisibility(zone.id)}
                            >
                              {hiddenZones.has(zone.id)
                                ? <VisibilityOffIcon fontSize="small" color="disabled" />
                                : <VisibilityIcon fontSize="small" />
                              }
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar zona">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog(zone)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        )}

        {/* ── Tab 2: Zonas Prohibidas ── */}
        {selectedTab === 2 && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Button
              variant={drawingForbiddenMode ? 'contained' : 'outlined'}
              color="error"
              fullWidth
              startIcon={<BlockIcon />}
              onClick={() => {
                setDrawingForbiddenMode(prev => !prev);
                setDrawingMode('none'); // desactivar dibujo de zonas de venta
              }}
              sx={{ mb: 1.5 }}
            >
              {drawingForbiddenMode ? 'Cancelar dibujo' : '+ Dibujar zona prohibida'}
            </Button>

            {drawingForbiddenMode && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Haz clic en el mapa para definir los vértices. Doble clic para terminar.
              </Alert>
            )}

            <Divider sx={{ mb: 1.5 }} />

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Zonas prohibidas registradas ({forbiddenZones.length})
            </Typography>

            {forbiddenZones.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <BlockIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No hay zonas prohibidas registradas.
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {forbiddenZones.map(zone => (
                  <ListItem key={zone.id} disablePadding>
                    <Box sx={{ py: 0.75, width: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <BlockIcon sx={{ color: 'error.main', fontSize: 18, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {zone.name}
                          </Typography>
                          {zone.description && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {zone.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" noWrap>
                            👥 {(!zone.assignedPromotorIds || zone.assignedPromotorIds.length === 0)
                              ? 'Todos los promotores'
                              : zone.assignedPromotorIds.map(id => users.find(u => u.id === id)?.displayName || id).join(', ')}
                          </Typography>
                        </Box>
                        <Tooltip title="Eliminar zona prohibida">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteForbiddenDialog(zone)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </Paper>

      {/* Mapa */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={MAP_CENTER}
          zoom={11}
          options={{
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true
          }}
        >
          {/* Drawing Manager para zonas prohibidas */}
          {drawingForbiddenMode && (
            <DrawingManager
              onPolygonComplete={handleForbiddenPolygonComplete}
              options={{
                drawingMode: google.maps.drawing.OverlayType.POLYGON,
                drawingControl: false,
                polygonOptions: {
                  fillColor: '#FF0000',
                  fillOpacity: 0.2,
                  strokeColor: '#CC0000',
                  strokeWeight: 2,
                  editable: true
                }
              }}
            />
          )}

          {/* Zonas prohibidas — filtradas por vendedor seleccionado */}
          {visibleForbiddenZones
            .filter(z => z.coordinates && z.coordinates.length >= 3)
            .map(zone => (
              <Polygon
                key={`fp-${zone.id}`}
                paths={zone.coordinates}
                options={{
                  fillColor: '#FF0000',
                  fillOpacity: 0.2,
                  strokeColor: '#CC0000',
                  strokeWeight: 2,
                  clickable: true
                }}
                onClick={() => setSelectedForbiddenZone(zone)}
              />
            ))
          }

          {/* InfoWindow zona prohibida seleccionada */}
          {selectedForbiddenZone && selectedForbiddenZone.coordinates.length > 0 && (
            <InfoWindow
              position={selectedForbiddenZone.coordinates[0]}
              onCloseClick={() => setSelectedForbiddenZone(null)}
            >
              <Box sx={{ p: 1, minWidth: 180 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: '#CC0000' }}>
                  🚫 {selectedForbiddenZone.name}
                </Typography>
                {selectedForbiddenZone.description && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedForbiddenZone.description}
                  </Typography>
                )}
              </Box>
            </InfoWindow>
          )}

          {/* Drawing Manager para polígonos */}
          {drawingMode === 'polygon' && (
            <DrawingManager
              onLoad={dm => { drawingManagerRef.current = dm; }}
              onPolygonComplete={handlePolygonComplete}
              options={{
                drawingMode: google.maps.drawing.OverlayType.POLYGON,
                drawingControl: false,
                polygonOptions: {
                  fillColor: ZONE_COLOR,
                  fillOpacity: 0.25,
                  strokeColor: ZONE_COLOR,
                  strokeWeight: 2,
                  editable: true
                }
              }}
            />
          )}

          {/* Zonas guardadas */}
          {visibleZones
            .filter(z => z.coordinates && z.coordinates.length >= 3)
            .map(zone => (
              <Polygon
                key={zone.id}
                paths={zone.coordinates}
                options={{
                  fillColor: zone.color,
                  fillOpacity: 0.2,
                  strokeColor: zone.color,
                  strokeWeight: 2,
                  clickable: true
                }}
                onClick={() => setSelectedZone(zone)}
              />
            ))
          }

          {/* InfoWindow de zona seleccionada */}
          {selectedZone && selectedZone.coordinates.length > 0 && (
            <InfoWindow
              position={selectedZone.coordinates[0]}
              onCloseClick={() => setSelectedZone(null)}
            >
              <Box sx={{ p: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {selectedZone.name}
                </Typography>
                <Divider sx={{ my: 0.5 }} />
                <Typography variant="body2">
                  <strong>{selectedZone.assignedKioskId ? 'Kiosco:' : 'Vendedor:'}</strong>{' '}
                  {selectedZone.assignedKioskName || selectedZone.assignedSellerName || '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Tipo:</strong> {getZoneTypeLabel(selectedZone.type)}
                </Typography>
                {selectedZone.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {selectedZone.description}
                  </Typography>
                )}
                <Chip
                  label={selectedZone.isActive ? 'Activa' : 'Inactiva'}
                  size="small"
                  color={selectedZone.isActive ? 'success' : 'default'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Leyenda flotante */}
        {visibleZones.length > 0 && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              bottom: 40,
              right: 16,
              p: 1.5,
              maxWidth: 200,
              maxHeight: 200,
              overflow: 'auto'
            }}
          >
            <Typography variant="caption" fontWeight={700} display="block" gutterBottom>
              Zonas visibles
            </Typography>
            {visibleZones.map(zone => (
              <Stack key={zone.id} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: zone.color, flexShrink: 0 }} />
                <Typography variant="caption" noWrap>{zone.name}</Typography>
              </Stack>
            ))}
          </Paper>
        )}
      </Box>

      {/* Dialog: Configurar zona nueva */}
      <Dialog open={newZoneDialog} onClose={resetNewZoneForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {getZoneTypeIcon(newZoneType)}
            <Typography variant="h6" fontWeight={700}>
              Configurar Zona — {getZoneTypeLabel(newZoneType)}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Rango de fechas como nombre */}
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Rango de fechas de la zona: *
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="Desde"
                  type="date"
                  fullWidth
                  size="small"
                  value={newZoneStartDate}
                  onChange={e => setNewZoneStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Hasta"
                  type="date"
                  fullWidth
                  size="small"
                  value={newZoneEndDate}
                  onChange={e => setNewZoneEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              {newZoneStartDate && newZoneEndDate && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Nombre de la zona: <strong>{generateZoneName(newZoneStartDate, newZoneEndDate)}</strong>
                </Typography>
              )}
            </Box>

            <TextField
              label="Descripción (opcional)"
              fullWidth
              multiline
              rows={2}
              value={newZoneDescription}
              onChange={e => setNewZoneDescription(e.target.value)}
            />

            {assignType === 'seller' ? (
              <Autocomplete
                options={users}
                value={newZoneSeller}
                onChange={(_, v) => setNewZoneSeller(v)}
                getOptionLabel={u => `${u.displayName} (${u.email})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, u) => <li {...props} key={u.id}>{u.displayName} ({u.email})</li>}
                renderInput={(params) => (
                  <TextField {...params} label="Asignar a vendedor *" />
                )}
              />
            ) : (
              <Alert severity="info">
                Kiosco asignado: <strong>{panelKiosk?.name}</strong>
              </Alert>
            )}


            {newZoneType === 'polygon' && pendingPolygon && (
              <Alert severity="success">
                Polígono capturado con {pendingPolygon.length} vértices
              </Alert>
            )}

            {(newZoneType === 'municipality' || newZoneType === 'colonia') && (
              <Alert severity="info">
                Se generará un área aproximada centrada en la ubicación indicada. Puedes refinarla después.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetNewZoneForm} startIcon={<CancelIcon />}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveZone}
            disabled={saving || !newZoneStartDate || !newZoneEndDate || (assignType === 'seller' ? !newZoneSeller : !panelKiosk)}
            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
          >
            {saving ? 'Guardando...' : 'Guardar Zona'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar eliminación */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Eliminar zona</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de eliminar la zona <strong>"{deleteDialog?.name}"</strong>?{' '}
            {deleteDialog?.assignedKioskId
              ? <>El kiosco <strong>{deleteDialog?.assignedKioskName}</strong> perderá acceso a esta zona.</>
              : <>El vendedor <strong>{deleteDialog?.assignedSellerName}</strong> perderá acceso a esta zona.</>
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteDialog && handleDeleteZone(deleteDialog)}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      {/* ── Dialog: Guardar zona prohibida ── */}
      <Dialog
        open={forbiddenDialog}
        onClose={() => { setForbiddenDialog(false); setPendingForbiddenPolygon(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BlockIcon color="error" />
            <Typography variant="h6" fontWeight={700}>Nueva zona prohibida</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {pendingForbiddenPolygon && (
              <Alert severity="success">
                Polígono capturado con {pendingForbiddenPolygon.length} vértices
              </Alert>
            )}
            <TextField
              label="Nombre *"
              fullWidth
              value={forbiddenZoneName}
              onChange={e => setForbiddenZoneName(e.target.value)}
              placeholder="Ej: Zona peligrosa norte"
              autoFocus
            />
            <TextField
              label="Descripción (opcional)"
              fullWidth
              multiline
              rows={2}
              value={forbiddenZoneDesc}
              onChange={e => setForbiddenZoneDesc(e.target.value)}
            />
            <Autocomplete
              multiple
              options={users}
              value={forbiddenZonePromotors}
              onChange={(_, v) => setForbiddenZonePromotors(v)}
              getOptionLabel={o => o.displayName}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Promotores asignados"
                  placeholder="Vacío = aplica a todos"
                  helperText="Deja vacío para que aplique a todos los promotores"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.displayName}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                ))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setForbiddenDialog(false); setPendingForbiddenPolygon(null); }}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSaveForbiddenZone}
            disabled={savingForbidden || !forbiddenZoneName.trim()}
            startIcon={savingForbidden ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          >
            {savingForbidden ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Advertencia de traslape con zonas de venta ── */}
      <Dialog open={forbiddenOverlapDialog} onClose={() => setForbiddenOverlapDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BlockIcon color="warning" />
            <Typography variant="h6" fontWeight={700}>Zona prohibida dentro de zona de venta</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            La zona prohibida que estás por guardar se traslapa con {overlappingZones.length === 1 ? 'una zona de venta existente' : `${overlappingZones.length} zonas de venta existentes`}.
          </Alert>
          <Typography variant="body2" gutterBottom>
            Zonas afectadas:
          </Typography>
          <List dense disablePadding sx={{ mb: 1 }}>
            {overlappingZones.map(z => (
              <ListItem key={z.id} disablePadding>
                <Box sx={{ py: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>{z.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{z.assignedSellerName}</Typography>
                </Box>
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" color="text.secondary">
            ¿Quieres que la zona prohibida tenga prioridad sobre las zonas de venta, o prefieres cancelar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setForbiddenOverlapDialog(false); setOverlappingZones([]); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={savingForbidden ? <CircularProgress size={18} color="inherit" /> : <BlockIcon />}
            disabled={savingForbidden}
            onClick={doSaveForbiddenZone}
          >
            Dar prioridad a zona prohibida
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Confirmar eliminación zona prohibida ── */}
      <Dialog open={!!deleteForbiddenDialog} onClose={() => setDeleteForbiddenDialog(null)}>
        <DialogTitle>Eliminar zona prohibida</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de eliminar la zona <strong>"{deleteForbiddenDialog?.name}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteForbiddenDialog(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteForbiddenDialog && handleDeleteForbiddenZone(deleteForbiddenDialog)}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ZonasVendedores;
