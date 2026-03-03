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
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Tabs,
  Tab,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Map as MapIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Draw as DrawIcon,
  LocationOn as LocationOnIcon,
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
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing")[] = ['places', 'geometry', 'drawing'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 };

const ZONE_COLORS = [
  '#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
];

interface User {
  id: string;
  displayName: string;
  email: string;
  productLine?: string;
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

interface MexicoLocation {
  name: string;
  state: string;
  municipality?: string;
  postalCode?: string;
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
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
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);
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

  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  useEffect(() => {
    fetchZones();
    fetchUsers();
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
    setNewZoneSeller(panelSeller); // Pre-populate seller from panel
    setNewZoneDialog(true);
    setDrawingMode('none');
  }, [panelSeller]);

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
    if (!newZoneSeller) {
      setError('Debes asignar un vendedor a la zona');
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
        assignedSellerId: newZoneSeller.id,
        assignedSellerName: newZoneSeller.displayName,
        coordinates,
        color: newZoneColor,
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
    setNewZoneColor(ZONE_COLORS[0]);
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

  const activeZones = zones.filter(z => z.isActive);
  const visibleZones = activeZones.filter(z => !hiddenZones.has(z.id));

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
                Zonas de Vendedores
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {activeZones.length} zonas activas
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Tabs: Dibujar | Lista */}
        <Tabs
          value={selectedTab}
          onChange={(_, v) => setSelectedTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Crear Zona" />
          <Tab label={`Mis Zonas (${zones.length})`} />
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

            {/* Paso 1: Seleccionar vendedor */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              1. Selecciona el vendedor:
            </Typography>
            <Autocomplete
              options={users}
              value={panelSeller}
              onChange={(_, v) => setPanelSeller(v)}
              getOptionLabel={u => u.displayName}
              renderInput={(params) => (
                <TextField {...params} label="Vendedor *" size="small" placeholder="Selecciona primero el vendedor" />
              )}
              sx={{ mb: 2 }}
            />

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
                <Tooltip title={!panelSeller ? 'Selecciona un vendedor primero' : ''}>
                  <span>
                    <Button
                      variant={drawingMode === 'polygon' ? 'contained' : 'outlined'}
                      size="small"
                      disabled={!panelSeller}
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Municipio / Alcaldía"
                      size="small"
                      placeholder="Escribe para ver sugerencias..."
                    />
                  )}
                />
                <Tooltip title={!panelSeller ? 'Selecciona un vendedor primero' : ''}>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={!panelSeller || !newZoneState || !newZoneMunicipality}
                      onClick={() => {
                        setNewZoneType('municipality');
                        setNewZoneSeller(panelSeller);
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
                <Tooltip title={!panelSeller ? 'Selecciona un vendedor primero' : ''}>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      fullWidth
                      disabled={!panelSeller || !newZoneState || !newZoneMunicipality || !newZoneColonia}
                      onClick={() => {
                        setNewZoneType('colonia');
                        setNewZoneSeller(panelSeller);
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
            {loading ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={40} />
              </Box>
            ) : zones.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <MapIcon sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  No hay zonas creadas aún
                </Typography>
              </Box>
            ) : (
              <List dense>
                {zones.map(zone => (
                  <ListItem key={zone.id} disablePadding>
                    <Box sx={{ px: 1.5, py: 0.5, width: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: zone.color,
                            flexShrink: 0
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {zone.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {zone.assignedSellerName} • {getZoneTypeLabel(zone.type)}
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
          onLoad={setMapRef}
        >
          {/* Drawing Manager para polígonos */}
          {drawingMode === 'polygon' && (
            <DrawingManager
              onLoad={dm => { drawingManagerRef.current = dm; }}
              onPolygonComplete={handlePolygonComplete}
              options={{
                drawingMode: google.maps.drawing.OverlayType.POLYGON,
                drawingControl: false,
                polygonOptions: {
                  fillColor: newZoneColor,
                  fillOpacity: 0.25,
                  strokeColor: newZoneColor,
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
                  <strong>Vendedor:</strong> {selectedZone.assignedSellerName}
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

            <Autocomplete
              options={users}
              value={newZoneSeller}
              onChange={(_, v) => setNewZoneSeller(v)}
              getOptionLabel={u => `${u.displayName} (${u.email})`}
              renderInput={(params) => (
                <TextField {...params} label="Asignar a vendedor *" />
              )}
            />

            <Box>
              <Typography variant="body2" gutterBottom>Color de la zona:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ZONE_COLORS.map(color => (
                  <Box
                    key={color}
                    onClick={() => setNewZoneColor(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: newZoneColor === color ? '3px solid #333' : '2px solid transparent',
                      transition: 'transform 0.1s',
                      '&:hover': { transform: 'scale(1.2)' }
                    }}
                  />
                ))}
              </Stack>
            </Box>

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
            disabled={saving || !newZoneStartDate || !newZoneEndDate || !newZoneSeller}
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
            ¿Estás seguro de eliminar la zona <strong>"{deleteDialog?.name}"</strong>?
            El vendedor <strong>{deleteDialog?.assignedSellerName}</strong> perderá acceso a esta zona.
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
    </Box>
  );
};

export default ZonasVendedores;
