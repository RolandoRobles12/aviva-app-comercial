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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DeleteIcon from '@mui/icons-material/Delete';
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
import type { LocationConfig } from '../types/location';
import { validationTypeLabels, getValidationTypeForProductLine } from '../types/location';

type ProductLine = 'AVIVA_TU_NEGOCIO' | 'AVIVA_CONTIGO' | 'AVIVA_TU_COMPRA' | 'AVIVA_TU_CASA';

interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  productLine: ProductLine;
}

interface UserWithConfig extends User {
  config: LocationConfig | null;
}

const UbicacionesConfig: React.FC = () => {
  const [users, setUsers] = useState<UserWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithConfig | null>(null);
  const [formData, setFormData] = useState<Partial<LocationConfig>>({
    assignedLocationName: '',
    allowedRadius: 150,
    trackingInterval: 15 * 60 * 1000,
    minAccuracy: 100,
    isActive: true
  });

  // Coordenadas del mapa
  const [mapLat, setMapLat] = useState<string>('');
  const [mapLng, setMapLng] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todos los usuarios
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      // Obtener configuraciones de ubicación
      const configsSnapshot = await getDocs(collection(db, 'locationConfigs'));
      const configsMap = new Map<string, LocationConfig>();

      configsSnapshot.docs.forEach(doc => {
        const config = { id: doc.id, ...doc.data() } as LocationConfig;
        configsMap.set(config.userId, config);
      });

      // Combinar usuarios con sus configuraciones
      const usersWithConfig: UserWithConfig[] = usersData.map(user => ({
        ...user,
        config: configsMap.get(user.uid) || null
      }));

      setUsers(usersWithConfig);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user: UserWithConfig) => {
    setEditingUser(user);

    if (user.config) {
      // Editar configuración existente
      setFormData({
        assignedLocationName: user.config.assignedLocationName || '',
        allowedRadius: user.config.allowedRadius,
        trackingInterval: user.config.trackingInterval,
        minAccuracy: user.config.minAccuracy,
        isActive: user.config.isActive,
        validationType: user.config.validationType
      });

      if (user.config.assignedLocation) {
        setMapLat(user.config.assignedLocation.latitude.toString());
        setMapLng(user.config.assignedLocation.longitude.toString());
      }
    } else {
      // Crear nueva configuración
      const validationType = getValidationTypeForProductLine(user.productLine);
      setFormData({
        assignedLocationName: '',
        allowedRadius: 150,
        trackingInterval: 15 * 60 * 1000,
        minAccuracy: 100,
        isActive: true,
        validationType
      });
      setMapLat('');
      setMapLng('');
    }

    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData({
      assignedLocationName: '',
      allowedRadius: 150,
      trackingInterval: 15 * 60 * 1000,
      minAccuracy: 100,
      isActive: true
    });
    setMapLat('');
    setMapLng('');
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      setError(null);

      // Validar coordenadas si es vendedor estático
      const validationType = formData.validationType || getValidationTypeForProductLine(editingUser.productLine);
      let assignedLocation: GeoPoint | null = null;

      if (validationType === 'FIXED_LOCATION') {
        const lat = parseFloat(mapLat);
        const lng = parseFloat(mapLng);

        if (isNaN(lat) || isNaN(lng)) {
          setError('Las coordenadas son obligatorias para vendedores estáticos');
          return;
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          setError('Coordenadas inválidas');
          return;
        }

        assignedLocation = new GeoPoint(lat, lng);
      }

      const configData: Partial<LocationConfig> = {
        userId: editingUser.uid,
        assignedLocation,
        assignedLocationName: formData.assignedLocationName || null,
        allowedRadius: formData.allowedRadius || 150,
        trackingInterval: formData.trackingInterval || (15 * 60 * 1000),
        minAccuracy: formData.minAccuracy || 100,
        validationType,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        updatedAt: Timestamp.now()
      };

      if (editingUser.config) {
        // Actualizar configuración existente
        await updateDoc(doc(db, 'locationConfigs', editingUser.config.id), configData);
        setSuccess('Configuración actualizada exitosamente');
      } else {
        // Crear nueva configuración
        await addDoc(collection(db, 'locationConfigs'), {
          ...configData,
          createdAt: Timestamp.now()
        });
        setSuccess('Configuración creada exitosamente');
      }

      handleCloseDialog();
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving config:', err);
      setError(err.message || 'Error al guardar configuración');
    }
  };

  const handleDelete = async (config: LocationConfig) => {
    if (!window.confirm('¿Estás seguro de eliminar esta configuración?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'locationConfigs', config.id));
      setSuccess('Configuración eliminada exitosamente');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting config:', err);
      setError(err.message || 'Error al eliminar configuración');
    }
  };

  const getValidationTypeChip = (productLine: ProductLine) => {
    const validationType = getValidationTypeForProductLine(productLine);
    return (
      <Chip
        label={validationTypeLabels[validationType]}
        color={validationType === 'ROUTE_ONLY' ? 'success' : 'warning'}
        size="small"
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Configuración de Ubicaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Asigna ubicaciones fijas para vendedores estáticos y configura parámetros de tracking
          </Typography>
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
              <TableCell>Usuario</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Tipo de Validación</TableCell>
              <TableCell>Ubicación Asignada</TableCell>
              <TableCell>Radio (m)</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {user.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>{user.productLine.replace(/_/g, ' ')}</TableCell>
                <TableCell>{getValidationTypeChip(user.productLine)}</TableCell>
                <TableCell>
                  {user.config?.assignedLocationName || (
                    <Typography variant="body2" color="text.secondary">
                      No asignada
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {user.config?.allowedRadius || '-'}
                </TableCell>
                <TableCell>
                  {user.config ? (
                    <Chip
                      label={user.config.isActive ? 'Activo' : 'Inactivo'}
                      color={user.config.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin configurar
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(user)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  {user.config && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(user.config!)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de configuración */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Configurar Ubicación - {editingUser?.displayName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Tipo de vendedor:</strong>{' '}
                    {editingUser && getValidationTypeChip(editingUser.productLine)}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {editingUser && formData.validationType === 'ROUTE_ONLY'
                      ? 'Vendedor de campo: Solo se rastreará su ruta, no se valida ubicación fija'
                      : 'Vendedor estático: Debe permanecer en ubicación asignada'}
                  </Typography>
                </Alert>
              </Grid>

              {formData.validationType === 'FIXED_LOCATION' && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      label="Nombre de Ubicación"
                      fullWidth
                      value={formData.assignedLocationName || ''}
                      onChange={e =>
                        setFormData({ ...formData, assignedLocationName: e.target.value })
                      }
                      placeholder="Ej: Bodega Aurrera Centro, Plaza Los Arcos"
                      required
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      label="Latitud"
                      fullWidth
                      type="number"
                      value={mapLat}
                      onChange={e => setMapLat(e.target.value)}
                      placeholder="19.432608"
                      required
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
                      required
                      inputProps={{ step: '0.000001' }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Puedes obtener las coordenadas de{' '}
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Maps
                      </a>{' '}
                      haciendo clic derecho en el mapa
                    </Typography>
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Radio Permitido (metros)"
                  fullWidth
                  type="number"
                  value={formData.allowedRadius || 150}
                  onChange={e =>
                    setFormData({ ...formData, allowedRadius: parseInt(e.target.value) })
                  }
                  InputProps={{ inputProps: { min: 10, max: 1000 } }}
                  helperText="Distancia máxima permitida desde la ubicación asignada"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Precisión Mínima GPS (metros)"
                  fullWidth
                  type="number"
                  value={formData.minAccuracy || 100}
                  onChange={e =>
                    setFormData({ ...formData, minAccuracy: parseFloat(e.target.value) })
                  }
                  InputProps={{ inputProps: { min: 10, max: 500 } }}
                  helperText="Precisión mínima requerida para aceptar ubicaciones"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.isActive !== undefined ? formData.isActive : true}
                    onChange={e => setFormData({ ...formData, isActive: e.target.value as boolean })}
                    label="Estado"
                  >
                    <MenuItem value={true as any}>Activo</MenuItem>
                    <MenuItem value={false as any}>Inactivo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UbicacionesConfig;
