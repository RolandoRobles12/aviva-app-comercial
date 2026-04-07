import React, { useEffect, useState, useRef } from 'react';
import { useLoadScript } from '@react-google-maps/api';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  deleteField,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Coincide con User.kt de Android
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'GERENTE_AVIVA_CONTIGO' | 'PROMOTOR_AVIVA_TU_NEGOCIO' | 'EMBAJADOR_AVIVA_TU_COMPRA' | 'PROMOTOR_AVIVA_TU_CASA';

interface ProductCatalog {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_ACTIVATION';

interface User {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
  productLine?: string; // código del producto (ej: "aviva_tu_negocio")
  status: UserStatus;
  phoneNumber?: string;
  employeeId?: string;
  managerId?: string;
  assignedPromoters?: string[];
  assignedKioskId?: string;
  hubspotOwnerId?: string;
  homeAddress?: string;
  homeLat?: number;
  homeLng?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface Kiosk {
  id: string;
  name: string;
  productType: string;
  city: string;
  state: string;
}

const roleLabels: Record<UserRole, string> = {
  'SUPER_ADMIN': 'Super Administrador',
  'ADMIN': 'Administrador',
  'GERENTE_AVIVA_CONTIGO': 'Gerente Aviva Contigo',
  'PROMOTOR_AVIVA_TU_NEGOCIO': 'Promotor Aviva Tu Negocio',
  'EMBAJADOR_AVIVA_TU_COMPRA': 'Embajador Aviva Tu Compra',
  'PROMOTOR_AVIVA_TU_CASA': 'Promotor Aviva Tu Casa'
};

const statusLabels: Record<UserStatus, string> = {
  'ACTIVE': 'Activo',
  'INACTIVE': 'Inactivo',
  'SUSPENDED': 'Suspendido',
  'PENDING_ACTIVATION': 'Pendiente de Activación'
};

const statusColors: Record<UserStatus, "success" | "default" | "error" | "warning"> = {
  'ACTIVE': 'success',
  'INACTIVE': 'default',
  'SUSPENDED': 'error',
  'PENDING_ACTIVATION': 'warning'
};

const PLACES_LIBRARIES: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const Usuarios: React.FC = () => {
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: PLACES_LIBRARIES,
  });
  const homeInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Eleva el z-index del dropdown de Google Places por encima del Dialog de MUI (1300)
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '.pac-container { z-index: 1400 !important; }';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Adjunta Google Places Autocomplete al input de domicilio cuando el diálogo abre
  useEffect(() => {
    if (!mapsLoaded || !dialogOpen) return;
    // Pequeño delay para asegurar que el DOM del diálogo esté listo
    const timer = setTimeout(() => {
      if (!homeInputRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(homeInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'mx' },
      });
      const listener = ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          setFormData((prev) => ({
            ...prev,
            homeAddress: place.formatted_address || '',
            homeLat: place.geometry!.location!.lat(),
            homeLng: place.geometry!.location!.lng(),
          }));
          // Actualizar el valor visible del input manualmente
          if (homeInputRef.current) {
            homeInputRef.current.value = place.formatted_address || '';
          }
        }
      });
      return () => { window.google.maps.event.removeListener(listener); };
    }, 100);
    return () => clearTimeout(timer);
  }, [mapsLoaded, dialogOpen]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    email: '',
    displayName: '',
    role: 'PROMOTOR_AVIVA_TU_NEGOCIO',
    productLine: '',
    status: 'ACTIVE',
    phoneNumber: '',
    employeeId: '',
    managerId: '',
    assignedPromoters: [],
    assignedKioskId: '',
    hubspotOwnerId: '',
    homeAddress: '',
    homeLat: undefined,
    homeLng: undefined
  });

  useEffect(() => {
    fetchUsers();
    fetchKiosks();
    fetchProducts();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)));

      // Filtrar gerentes para el selector
      const managersData = usersData.filter(u =>
        u.role === 'GERENTE_AVIVA_CONTIGO' ||
        u.role === 'ADMIN' ||
        u.role === 'SUPER_ADMIN'
      );
      setManagers(managersData);
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, 'products'), orderBy('name', 'asc')));
      const productsData: ProductCatalog[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isActive !== false) {
          productsData.push({
            id: docSnap.id,
            name: data.name || '',
            code: data.code || '',
            isActive: data.isActive ?? true
          });
        }
      });
      setProducts(productsData);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  const fetchKiosks = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'kiosks'));
      const kiosksData: Kiosk[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        kiosksData.push({
          id: doc.id,
          name: data.name,
          productType: data.productType,
          city: data.city,
          state: data.state
        });
      });
      setKiosks(kiosksData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error al cargar kioscos:', err);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        productLine: user.productLine || '',
        status: user.status,
        phoneNumber: user.phoneNumber || '',
        employeeId: user.employeeId || '',
        managerId: user.managerId || '',
        assignedPromoters: user.assignedPromoters || [],
        assignedKioskId: user.assignedKioskId || '',
        hubspotOwnerId: user.hubspotOwnerId || '',
        homeAddress: user.homeAddress || '',
        homeLat: user.homeLat,
        homeLng: user.homeLng
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        displayName: '',
        role: 'PROMOTOR_AVIVA_TU_NEGOCIO',
        productLine: '',
        status: 'ACTIVE',
        phoneNumber: '',
        employeeId: '',
        managerId: '',
        assignedPromoters: [],
        assignedKioskId: '',
        hubspotOwnerId: '',
        homeAddress: '',
        homeLat: undefined,
        homeLng: undefined
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setError('');
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    // Si se cambia el rol a ADMIN o SUPER_ADMIN, limpiar productLine
    if (field === 'role' && (value === 'ADMIN' || value === 'SUPER_ADMIN')) {
      setFormData({ ...formData, [field]: value, productLine: undefined as any });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.email || !formData.displayName) {
        setError('Email y nombre son obligatorios');
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Email inválido');
        return;
      }

      // Validar que productLine sea requerido solo para roles de vendedor
      const isAdminRole = formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN';
      if (!isAdminRole && !formData.productLine) {
        setError('Línea de producto es obligatoria para roles de vendedor');
        return;
      }

      // Preparar datos para guardar - SOLO campos definidos
      const dataToSave: any = {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        status: formData.status,
        updatedAt: Timestamp.now()
      };

      // Campos opcionales: se guardan si tienen valor; se borran SOLO si el campo
      // existía antes y ahora está explícitamente vacío (para campos no críticos).
      // Los campos críticos (hubspotOwnerId, productLine) NUNCA se borran automáticamente.
      const setIfValue = (field: string, value: string | undefined) => {
        if (value && value.trim()) {
          dataToSave[field] = value.trim();
        }
        // Si está vacío, simplemente no lo incluimos → Firestore no lo toca
      };

      const setOrDelete = (field: string, value: string | undefined) => {
        if (value && value.trim()) {
          dataToSave[field] = value.trim();
        } else if (editingUser) {
          dataToSave[field] = deleteField();
        }
      };

      setOrDelete('photoUrl', formData.photoUrl);
      setOrDelete('phoneNumber', formData.phoneNumber);
      setOrDelete('employeeId', formData.employeeId);
      setOrDelete('managerId', formData.managerId);
      setOrDelete('assignedKioskId', formData.assignedKioskId);
      setIfValue('hubspotOwnerId', formData.hubspotOwnerId);
      setIfValue('uid', (formData as any).uid);
      setIfValue('homeAddress', formData.homeAddress);
      if (formData.homeLat !== undefined && formData.homeLng !== undefined) {
        dataToSave.homeLat = formData.homeLat;
        dataToSave.homeLng = formData.homeLng;
      }

      if (formData.assignedPromoters && formData.assignedPromoters.length > 0) {
        dataToSave.assignedPromoters = formData.assignedPromoters;
      } else if (editingUser) {
        dataToSave.assignedPromoters = deleteField();
      }

      // Agregar productLine solo si NO es admin; si es admin y es edición, borrar el campo
      if (!isAdminRole && formData.productLine) {
        dataToSave.productLine = formData.productLine;
      } else if (isAdminRole && editingUser) {
        dataToSave.productLine = deleteField();
      }

      // Agregar createdAt solo si es nuevo
      if (!editingUser) {
        dataToSave.createdAt = Timestamp.now();
      }

      console.log('💾 Guardando usuario:', dataToSave);

      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), dataToSave);
      } else {
        await addDoc(collection(db, 'users'), dataToSave);
      }

      await fetchUsers();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar el usuario');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        await fetchUsers();
      } catch (err) {
        setError('Error al eliminar el usuario');
        console.error(err);
      }
    }
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return '-';
    const manager = managers.find(m => m.id === managerId);
    return manager ? manager.displayName : '-';
  };

  if (loading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Gestión de Usuarios</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Administra usuarios, roles y configuración de HubSpot
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Agregar Usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Total de usuarios:</strong> {users.length}
        <br />
        <strong>Activos:</strong> {users.filter(u => u.status === 'ACTIVE').length} |
        <strong> Inactivos:</strong> {users.filter(u => u.status === 'INACTIVE').length}
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Línea de Producto</TableCell>
              <TableCell>Gerente</TableCell>
              <TableCell>HubSpot ID</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="action" />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {user.displayName}
                      </Typography>
                      {user.employeeId && (
                        <Typography variant="caption" color="text.secondary">
                          ID: {user.employeeId}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={roleLabels[user.role]}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {user.productLine
                      ? (products.find(p => p.code === user.productLine)?.name || user.productLine)
                      : <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>
                    }
                  </Typography>
                </TableCell>
                <TableCell>{getManagerName(user.managerId)}</TableCell>
                <TableCell>
                  {user.hubspotOwnerId ? (
                    <code>{user.hubspotOwnerId}</code>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No configurado
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[user.status]}
                    color={statusColors[user.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(user)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(user.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Editar Usuario' : 'Agregar Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nombre Completo"
                  fullWidth
                  required
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  fullWidth
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="usuario@avivacredito.com"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ID de Empleado"
                  fullWidth
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  placeholder="EMP-12345"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Teléfono"
                  fullWidth
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Rol</InputLabel>
                  <Select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    label="Rol"
                  >
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {/* Línea de Producto — dinámica desde Firestore */}
              {formData.role !== 'ADMIN' && formData.role !== 'SUPER_ADMIN' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Línea de Producto</InputLabel>
                    <Select
                      value={formData.productLine || ''}
                      onChange={(e) => handleInputChange('productLine', e.target.value)}
                      label="Línea de Producto"
                    >
                      <MenuItem value=""><em>Sin asignar</em></MenuItem>
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.code}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Gerente/Supervisor</InputLabel>
                  <Select
                    value={formData.managerId || ''}
                    onChange={(e) => handleInputChange('managerId', e.target.value)}
                    label="Gerente/Supervisor"
                  >
                    <MenuItem value="">Sin asignar</MenuItem>
                    {managers.map((manager) => (
                      <MenuItem key={manager.id} value={manager.id}>
                        {manager.displayName} ({roleLabels[manager.role]})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    label="Estado"
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="HubSpot Owner ID"
                  fullWidth
                  value={formData.hubspotOwnerId}
                  onChange={(e) => handleInputChange('hubspotOwnerId', e.target.value)}
                  placeholder="123456789"
                  helperText="ID del propietario en HubSpot para sincronización de contactos y deals"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  key={editingUser?.id ?? 'new-user'}
                  label="Domicilio del vendedor"
                  fullWidth
                  inputRef={homeInputRef}
                  defaultValue={formData.homeAddress || ''}
                  onChange={(e) => handleInputChange('homeAddress', e.target.value)}
                  placeholder={mapsLoaded ? 'Escribe la dirección y selecciona del desplegable…' : 'Cargando buscador de mapas…'}
                  disabled={!mapsLoaded}
                  helperText={
                    formData.homeLat
                      ? `Coordenadas guardadas: ${formData.homeLat.toFixed(6)}, ${formData.homeLng?.toFixed(6)}`
                      : 'Selecciona del desplegable de Google Maps para guardar las coordenadas automáticamente'
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Kiosco Asignado</InputLabel>
                  <Select
                    value={formData.assignedKioskId || ''}
                    onChange={(e) => handleInputChange('assignedKioskId', e.target.value)}
                    label="Kiosco Asignado"
                  >
                    <MenuItem value="">Sin asignar</MenuItem>
                    {kiosks.map((kiosk) => (
                      <MenuItem key={kiosk.id} value={kiosk.id}>
                        {kiosk.name} - {kiosk.productType} ({kiosk.city}, {kiosk.state})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Usuarios;
