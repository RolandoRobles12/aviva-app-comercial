import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
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

  useEffect(() => {
    fetchKiosks();
    fetchProducts();
  }, []);

  const fetchKiosks = async () => {
    try {
      setLoading(true);
      setError(null);

      const snapshot = await getDocs(collection(db, 'kiosks'));
      const kiosksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Kiosk[];

      setKiosks(kiosksData);
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
            {kiosks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No hay kioscos registrados
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              kiosks.map(kiosk => (
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
                  label="Dirección"
                  fullWidth
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej: Av. Principal 123"
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
                <Typography variant="caption" color="text.secondary">
                  Obtén las coordenadas de{' '}
                  <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">
                    Google Maps
                  </a>{' '}
                  haciendo clic derecho en el mapa
                </Typography>
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
