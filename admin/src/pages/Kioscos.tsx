import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Autocomplete
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import StoreIcon from '@mui/icons-material/Store';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import UploadIcon from '@mui/icons-material/Upload';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  GeoPoint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Kiosk, DayOfWeek } from '../types/kiosk';
import {
  MEXICAN_STATES,
  DAYS_OF_WEEK,
  DEFAULT_WEEKLY_SCHEDULE
} from '../types/kiosk';
import KioskImport from '../components/KioskImport';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FilterListIcon from '@mui/icons-material/FilterList';

/** Maps Google's long state names to the shorter names used in the app */
const normalizeStateName = (googleState: string): string => {
  const stateMap: Record<string, string> = {
    'México': 'Estado de México',
    'Michoacán de Ocampo': 'Michoacán',
    'Veracruz de Ignacio de la Llave': 'Veracruz',
    'Coahuila de Zaragoza': 'Coahuila',
    'Querétaro de Arteaga': 'Querétaro',
  };
  return stateMap[googleState] || googleState;
};

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  isActive: boolean;
}

const Kioscos: React.FC = () => {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filtros
  const [filterSearch, setFilterSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [formData, setFormData] = useState<Partial<Kiosk>>({
    name: '',
    productType: '',
    city: '',
    state: '',
    address: '',
    radiusOverride: 100,
    weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
    requiresPresence: true,
    status: 'ACTIVE',
    hubId: null
  });
  const [mapLat, setMapLat] = useState<string>('');
  const [mapLng, setMapLng] = useState<string>('');

  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKiosks();
    fetchProducts();
  }, []);

  // Elevate pac-container above MUI Dialog (z-index 1300)
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '.pac-container { z-index: 1400 !important; }';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Attach Google Places Autocomplete to address input when dialog opens
  useEffect(() => {
    if (!mapsLoaded || !dialogOpen) return;
    const timer = setTimeout(() => {
      if (!addressInputRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'mx' },
      });
      const listener = ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setMapLat(lat.toString());
          setMapLng(lng.toString());

          let extractedState = '';
          let extractedCity = '';
          for (const comp of place.address_components || []) {
            if (comp.types.includes('administrative_area_level_1')) {
              extractedState = normalizeStateName(comp.long_name);
            }
            if (comp.types.includes('locality')) {
              extractedCity = comp.long_name;
            }
            if (!extractedCity && comp.types.includes('sublocality_level_1')) {
              extractedCity = comp.long_name;
            }
            if (!extractedCity && comp.types.includes('administrative_area_level_2')) {
              extractedCity = comp.long_name;
            }
          }

          setFormData(prev => ({
            ...prev,
            address: place.formatted_address || '',
            ...(extractedState && { state: extractedState }),
            ...(extractedCity && { city: extractedCity }),
          }));
          if (addressInputRef.current) {
            addressInputRef.current.value = place.formatted_address || '';
          }
        }
      });
      return () => { window.google.maps.event.removeListener(listener); };
    }, 100);
    return () => clearTimeout(timer);
  }, [mapsLoaded, dialogOpen]);

  const fetchKiosks = async () => {
    try {
      setLoading(true);
      setError(null);

      const snapshot = await getDocs(collection(db, 'kiosks'));
      const kiosksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Kiosk[];

      setKiosks(kiosksData.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })));
    } catch (err: any) {
      console.error('Error fetching kiosks:', err);
      setError(err.message || 'Error al cargar kioscos');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      // Filter only active products and sort by name
      const activeProducts = productsData
        .filter(p => p.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));

      setProducts(activeProducts);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      // Don't set error state - products are optional, use default if fails
    }
  };

  const getProductLabel = (code: string): string => {
    const product = products.find(p => p.code === code);
    return product ? product.name : code;
  };

  const uniqueStates = Array.from(new Set(kiosks.map(k => k.state).filter(Boolean))).sort();

  const filteredKiosks = kiosks.filter((k) => {
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!k.name.toLowerCase().includes(q) && !k.city?.toLowerCase().includes(q)) return false;
    }
    if (filterProduct !== 'all' && k.productType !== filterProduct) return false;
    if (filterState !== 'all' && k.state !== filterState) return false;
    if (filterStatus !== 'all' && k.status !== filterStatus) return false;
    return true;
  });

  const handleOpenDialog = (kiosk?: Kiosk) => {
    if (kiosk) {
      // Edit existing kiosk
      setEditingKiosk(kiosk);
      setFormData({
        name: kiosk.name,
        productType: kiosk.productType,
        city: kiosk.city,
        state: kiosk.state,
        address: kiosk.address || '',
        radiusOverride: kiosk.radiusOverride,
        weeklySchedule: kiosk.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
        requiresPresence: kiosk.requiresPresence,
        status: kiosk.status,
        hubId: kiosk.hubId
      });

      if (kiosk.coordinates) {
        setMapLat(kiosk.coordinates.latitude.toString());
        setMapLng(kiosk.coordinates.longitude.toString());
      } else {
        setMapLat('');
        setMapLng('');
      }
    } else {
      // Create new kiosk
      setEditingKiosk(null);
      setFormData({
        name: '',
        productType: products[0]?.code || '',
        city: '',
        state: '',
        address: '',
        radiusOverride: 100,
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
        requiresPresence: true,
        status: 'ACTIVE',
        hubId: null
      });
      setMapLat('');
      setMapLng('');
    }

    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingKiosk(null);
    setFormData({
      name: '',
      productType: products[0]?.code || '',
      city: '',
      state: '',
      address: '',
      radiusOverride: 100,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      requiresPresence: true,
      status: 'ACTIVE',
      hubId: null
    });
    setMapLat('');
    setMapLng('');
  };

  const handleScheduleChange = (day: DayOfWeek, field: 'isOpen' | 'startHour' | 'endHour', value: boolean | number) => {
    if (!formData.weeklySchedule) return;

    setFormData({
      ...formData,
      weeklySchedule: {
        ...formData.weeklySchedule,
        [day]: {
          ...formData.weeklySchedule[day],
          [field]: value
        }
      }
    });
  };

  const handleSave = async () => {
    try {
      setError(null);

      // Validate required fields
      if (!formData.name || !formData.productType || !formData.city || !formData.state) {
        setError('Por favor completa todos los campos obligatorios');
        return;
      }

      // Validate and parse coordinates
      let coordinates: GeoPoint | null = null;
      if (mapLat && mapLng) {
        const lat = parseFloat(mapLat);
        const lng = parseFloat(mapLng);

        if (isNaN(lat) || isNaN(lng)) {
          setError('Coordenadas inválidas');
          return;
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          setError('Coordenadas fuera de rango válido');
          return;
        }

        coordinates = new GeoPoint(lat, lng);
      }

      const kioskData: Partial<Kiosk> = {
        name: formData.name,
        productType: formData.productType || products[0]?.code || '',
        coordinates,
        address: formData.address || '',
        city: formData.city,
        state: formData.state,
        radiusOverride: formData.radiusOverride || 100,
        weeklySchedule: formData.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
        requiresPresence: formData.requiresPresence !== undefined ? formData.requiresPresence : true,
        status: formData.status || 'ACTIVE',
        hubId: formData.hubId || null,
        updatedAt: Timestamp.now()
      };

      if (editingKiosk) {
        // Update existing kiosk
        await updateDoc(doc(db, 'kiosks', editingKiosk.id), kioskData);
        setSuccess('Kiosco actualizado exitosamente');
      } else {
        // Create new kiosk
        await addDoc(collection(db, 'kiosks'), {
          ...kioskData,
          createdAt: Timestamp.now()
        });
        setSuccess('Kiosco creado exitosamente');
      }

      handleCloseDialog();
      fetchKiosks();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving kiosk:', err);
      setError(err.message || 'Error al guardar kiosco');
    }
  };

  const handleDelete = async (kiosk: Kiosk) => {
    if (!window.confirm(`¿Estás seguro de eliminar el kiosco "${kiosk.name}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'kiosks', kiosk.id));
      setSuccess('Kiosco eliminado exitosamente');
      fetchKiosks();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting kiosk:', err);
      setError(err.message || 'Error al eliminar kiosco');
    }
  };

  const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'error' => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'default';
      case 'MAINTENANCE':
        return 'warning';
      case 'CLOSED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'ACTIVE':
        return 'Activo';
      case 'INACTIVE':
        return 'Inactivo';
      case 'MAINTENANCE':
        return 'Mantenimiento';
      case 'CLOSED':
        return 'Cerrado';
      default:
        return status;
    }
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Cargando kioscos...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <StoreIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gestión de Kioscos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra los kioscos y puntos de venta del sistema
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Importar CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Kiosco
          </Button>
        </Box>
      </Box>

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

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <FilterListIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth size="small" label="Buscar"
              placeholder="Nombre o ciudad"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Producto</InputLabel>
              <Select value={filterProduct} label="Tipo de Producto" onChange={(e) => setFilterProduct(e.target.value)}>
                <MenuItem value="all">Todos los productos</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.code}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select value={filterState} label="Estado" onChange={(e) => setFilterState(e.target.value)}>
                <MenuItem value="all">Todos los estados</MenuItem>
                {uniqueStates.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estatus</InputLabel>
              <Select value={filterStatus} label="Estatus" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="ACTIVE">Activo</MenuItem>
                <MenuItem value="INACTIVE">Inactivo</MenuItem>
                <MenuItem value="MAINTENANCE">Mantenimiento</MenuItem>
                <MenuItem value="CLOSED">Cerrado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Mostrando {filteredKiosks.length} de {kiosks.length} kioscos
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo de Producto</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Radio (m)</TableCell>
              <TableCell>Horario</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredKiosks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {kiosks.length === 0 ? 'No hay kioscos registrados' : 'No hay kioscos que coincidan con los filtros.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredKiosks.map(kiosk => (
                <TableRow key={kiosk.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {kiosk.name}
                    </Typography>
                    {kiosk.hubId && (
                      <Typography variant="caption" color="text.secondary">
                        Hub: {kiosk.hubId}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={getProductLabel(kiosk.productType)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {kiosk.city}, {kiosk.state}
                      </Typography>
                      {kiosk.coordinates && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {kiosk.coordinates.latitude.toFixed(4)}, {kiosk.coordinates.longitude.toFixed(4)}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => openInGoogleMaps(kiosk.coordinates!.latitude, kiosk.coordinates!.longitude)}
                          >
                            <LocationOnIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{kiosk.radiusOverride}m</TableCell>
                  <TableCell>
                    {kiosk.workHoursStart}:00 - {kiosk.workHoursEnd}:00
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(kiosk.status)}
                      color={getStatusColor(kiosk.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(kiosk)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(kiosk)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar kiosco */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingKiosk ? 'Editar Kiosco' : 'Nuevo Kiosco'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre del Kiosco"
                  fullWidth
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Bodega Aurrera Centro"
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo de Producto</InputLabel>
                  <Select
                    value={formData.productType || products[0]?.code || ''}
                    onChange={e => setFormData({ ...formData, productType: e.target.value as any })}
                    label="Tipo de Producto"
                  >
                    {products.length === 0 ? (
                      <MenuItem value="" disabled>
                        <em>No hay productos disponibles</em>
                      </MenuItem>
                    ) : (
                      products.map(product => (
                        <MenuItem key={product.code} value={product.code}>
                          {product.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={MEXICAN_STATES}
                  value={formData.state || ''}
                  onChange={(_, newValue) => setFormData({ ...formData, state: newValue || '' })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Estado"
                      required
                      placeholder="Selecciona un estado"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Ciudad o Municipio"
                  fullWidth
                  value={formData.city || ''}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ej: Ciudad de México"
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  key={editingKiosk?.id ?? 'new-kiosk-addr'}
                  label="Dirección"
                  fullWidth
                  inputRef={addressInputRef}
                  defaultValue={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder={mapsLoaded ? 'Escribe la dirección y selecciona del desplegable…' : 'Cargando buscador de mapas…'}
                  disabled={!mapsLoaded}
                  helperText="Al seleccionar del desplegable se completan estado, ciudad y coordenadas"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Coordenadas GPS
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Latitud"
                  fullWidth
                  type="number"
                  value={mapLat}
                  onChange={e => setMapLat(e.target.value)}
                  placeholder="19.432608"
                  inputProps={{ step: '0.000001' }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Longitud"
                  fullWidth
                  type="number"
                  value={mapLng}
                  onChange={e => setMapLng(e.target.value)}
                  placeholder="-99.133209"
                  inputProps={{ step: '0.000001' }}
                />
              </Grid>

              <Grid item xs={12}>
                {mapLat && mapLng && !isNaN(parseFloat(mapLat)) && !isNaN(parseFloat(mapLng)) ? (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => window.open(`https://www.google.com/maps?q=${mapLat},${mapLng}`, '_blank')}
                  >
                    Verificar ubicación en Google Maps
                  </Button>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Las coordenadas, estado y ciudad se llenan automáticamente al seleccionar una dirección del autocompletado
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Radio Permitido (metros)"
                  fullWidth
                  type="number"
                  value={formData.radiusOverride || 100}
                  onChange={e => setFormData({ ...formData, radiusOverride: parseFloat(e.target.value) })}
                  InputProps={{ inputProps: { min: 10, max: 1000 } }}
                  helperText="Distancia máxima permitida desde el kiosco"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="ID del Kiosco (opcional)"
                  fullWidth
                  value={formData.hubId || ''}
                  onChange={e => setFormData({ ...formData, hubId: e.target.value || null })}
                  placeholder="Ej: KIO001"
                  helperText="Identificador interno del kiosco"
                />
              </Grid>

              {/* Horarios por día de la semana */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Horarios por Día
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Configura horarios específicos para cada día de la semana
                </Typography>
              </Grid>

              {DAYS_OF_WEEK.map(day => {
                const schedule = formData.weeklySchedule?.[day.value];
                return (
                  <Grid item xs={12} key={day.value}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={schedule?.isOpen || false}
                                onChange={(e) => handleScheduleChange(day.value, 'isOpen', e.target.checked)}
                              />
                            }
                            label={<Typography fontWeight={600}>{day.label}</Typography>}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Hora Inicio"
                            type="number"
                            fullWidth
                            size="small"
                            value={schedule?.startHour || 9}
                            onChange={(e) => handleScheduleChange(day.value, 'startHour', parseInt(e.target.value))}
                            disabled={!schedule?.isOpen}
                            InputProps={{ inputProps: { min: 0, max: 23 } }}
                            helperText="0-23"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Hora Fin"
                            type="number"
                            fullWidth
                            size="small"
                            value={schedule?.endHour || 19}
                            onChange={(e) => handleScheduleChange(day.value, 'endHour', parseInt(e.target.value))}
                            disabled={!schedule?.isOpen}
                            InputProps={{ inputProps: { min: 0, max: 23 } }}
                            helperText="0-23"
                          />
                        </Grid>
                        <Grid item xs={12} sm={1}>
                          {schedule?.isOpen && (
                            <Chip
                              label={`${schedule.startHour}:00 - ${schedule.endHour}:00`}
                              size="small"
                              color="primary"
                            />
                          )}
                          {!schedule?.isOpen && (
                            <Chip
                              label="Cerrado"
                              size="small"
                              color="default"
                            />
                          )}
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                );
              })}

              {/* Configuración adicional */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Configuración Adicional
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado del Kiosco</InputLabel>
                  <Select
                    value={formData.status || 'ACTIVE'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    label="Estado del Kiosco"
                  >
                    <MenuItem value="ACTIVE">Activo</MenuItem>
                    <MenuItem value="INACTIVE">Inactivo</MenuItem>
                    <MenuItem value="MAINTENANCE">Mantenimiento</MenuItem>
                    <MenuItem value="CLOSED">Cerrado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Requiere Presencia Física</InputLabel>
                  <Select
                    value={formData.requiresPresence !== undefined ? formData.requiresPresence : true}
                    onChange={e => setFormData({ ...formData, requiresPresence: e.target.value as boolean })}
                    label="Requiere Presencia Física"
                  >
                    <MenuItem value={true as any}>Sí, requiere check-in</MenuItem>
                    <MenuItem value={false as any}>No, trabajo remoto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editingKiosk ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de importación masiva */}
      <KioskImport
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => {
          setImportDialogOpen(false);
          fetchKiosks();
          setSuccess('Kioscos importados exitosamente');
          setTimeout(() => setSuccess(null), 3000);
        }}
        products={products}
      />
    </Box>
  );
};

export default Kioscos;
