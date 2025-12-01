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
  MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import StoreIcon from '@mui/icons-material/Store';
import LocationOnIcon from '@mui/icons-material/LocationOn';
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
import type { Kiosk } from '../types/kiosk';

const Kioscos: React.FC = () => {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [formData, setFormData] = useState<Partial<Kiosk>>({
    name: '',
    productType: '',
    city: '',
    state: '',
    radiusOverride: 100,
    workHoursStart: 9,
    workHoursEnd: 19,
    requiresPresence: true,
    status: 'ACTIVE',
    hubId: null
  });
  const [mapLat, setMapLat] = useState<string>('');
  const [mapLng, setMapLng] = useState<string>('');

  useEffect(() => {
    fetchKiosks();
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

  const handleOpenDialog = (kiosk?: Kiosk) => {
    if (kiosk) {
      // Edit existing kiosk
      setEditingKiosk(kiosk);
      setFormData({
        name: kiosk.name,
        productType: kiosk.productType,
        city: kiosk.city,
        state: kiosk.state,
        radiusOverride: kiosk.radiusOverride,
        workHoursStart: kiosk.workHoursStart,
        workHoursEnd: kiosk.workHoursEnd,
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
        productType: '',
        city: '',
        state: '',
        radiusOverride: 100,
        workHoursStart: 9,
        workHoursEnd: 19,
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
      productType: '',
      city: '',
      state: '',
      radiusOverride: 100,
      workHoursStart: 9,
      workHoursEnd: 19,
      requiresPresence: true,
      status: 'ACTIVE',
      hubId: null
    });
    setMapLat('');
    setMapLng('');
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
        productType: formData.productType,
        coordinates,
        city: formData.city,
        state: formData.state,
        radiusOverride: formData.radiusOverride || 100,
        workHoursStart: formData.workHoursStart || 9,
        workHoursEnd: formData.workHoursEnd || 19,
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Kiosco
        </Button>
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
                    <Chip label={kiosk.productType} size="small" />
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
                <TextField
                  label="Tipo de Producto"
                  fullWidth
                  value={formData.productType || ''}
                  onChange={e => setFormData({ ...formData, productType: e.target.value })}
                  placeholder="Ej: BA, Construrama, etc."
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Ciudad"
                  fullWidth
                  value={formData.city || ''}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ej: Ciudad de México"
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Estado"
                  fullWidth
                  value={formData.state || ''}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Ej: CDMX"
                  required
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

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Radio Permitido (metros)"
                  fullWidth
                  type="number"
                  value={formData.radiusOverride || 100}
                  onChange={e => setFormData({ ...formData, radiusOverride: parseFloat(e.target.value) })}
                  InputProps={{ inputProps: { min: 10, max: 1000 } }}
                  helperText="Distancia máxima permitida"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Hora Inicio"
                  fullWidth
                  type="number"
                  value={formData.workHoursStart || 9}
                  onChange={e => setFormData({ ...formData, workHoursStart: parseInt(e.target.value) })}
                  InputProps={{ inputProps: { min: 0, max: 23 } }}
                  helperText="Hora de inicio (0-23)"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Hora Fin"
                  fullWidth
                  type="number"
                  value={formData.workHoursEnd || 19}
                  onChange={e => setFormData({ ...formData, workHoursEnd: parseInt(e.target.value) })}
                  InputProps={{ inputProps: { min: 0, max: 23 } }}
                  helperText="Hora de fin (0-23)"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status || 'ACTIVE'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    label="Estado"
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
                  <InputLabel>Requiere Presencia</InputLabel>
                  <Select
                    value={formData.requiresPresence !== undefined ? formData.requiresPresence : true}
                    onChange={e => setFormData({ ...formData, requiresPresence: e.target.value as boolean })}
                    label="Requiere Presencia"
                  >
                    <MenuItem value={true as any}>Sí</MenuItem>
                    <MenuItem value={false as any}>No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Hub ID (opcional)"
                  fullWidth
                  value={formData.hubId || ''}
                  onChange={e => setFormData({ ...formData, hubId: e.target.value || null })}
                  placeholder="ID de integración con HubSpot"
                />
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
    </Box>
  );
};

export default Kioscos;
