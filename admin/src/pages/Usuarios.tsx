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
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Coincide con User.kt de Android
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'GERENTE_AVIVA_CONTIGO' | 'PROMOTOR_AVIVA_TU_NEGOCIO' | 'EMBAJADOR_AVIVA_TU_COMPRA' | 'PROMOTOR_AVIVA_TU_CASA';

type ProductLine = 'AVIVA_TU_NEGOCIO' | 'AVIVA_CONTIGO' | 'AVIVA_TU_COMPRA' | 'AVIVA_TU_CASA';

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_ACTIVATION';

interface User {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
  productLine: ProductLine;
  status: UserStatus;
  phoneNumber?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  managerId?: string;
  assignedPromoters?: string[];
  hubspotOwnerId?: string; // Nuevo campo para HubSpot
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const roleLabels: Record<UserRole, string> = {
  'SUPER_ADMIN': 'Super Administrador',
  'ADMIN': 'Administrador',
  'GERENTE_AVIVA_CONTIGO': 'Gerente Aviva Contigo',
  'PROMOTOR_AVIVA_TU_NEGOCIO': 'Promotor Aviva Tu Negocio',
  'EMBAJADOR_AVIVA_TU_COMPRA': 'Embajador Aviva Tu Compra',
  'PROMOTOR_AVIVA_TU_CASA': 'Promotor Aviva Tu Casa'
};

const productLineLabels: Record<ProductLine, string> = {
  'AVIVA_TU_NEGOCIO': 'Aviva Tu Negocio',
  'AVIVA_CONTIGO': 'Aviva Contigo',
  'AVIVA_TU_COMPRA': 'Aviva Tu Compra',
  'AVIVA_TU_CASA': 'Aviva Tu Casa'
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

const Usuarios: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    email: '',
    displayName: '',
    role: 'PROMOTOR_AVIVA_TU_NEGOCIO',
    productLine: 'AVIVA_TU_NEGOCIO',
    status: 'ACTIVE',
    phoneNumber: '',
    employeeId: '',
    department: '',
    position: '',
    managerId: '',
    assignedPromoters: [],
    hubspotOwnerId: ''
  });

  useEffect(() => {
    fetchUsers();
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
        u.role === UserRole.GERENTE_AVIVA_CONTIGO ||
        u.role === UserRole.ADMIN ||
        u.role === UserRole.SUPER_ADMIN
      );
      setManagers(managersData);
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        productLine: user.productLine,
        status: user.status,
        phoneNumber: user.phoneNumber || '',
        employeeId: user.employeeId || '',
        department: user.department || '',
        position: user.position || '',
        managerId: user.managerId || '',
        assignedPromoters: user.assignedPromoters || [],
        hubspotOwnerId: user.hubspotOwnerId || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        displayName: '',
        role: 'PROMOTOR_AVIVA_TU_NEGOCIO',
        productLine: 'AVIVA_TU_NEGOCIO',
        status: 'ACTIVE',
        phoneNumber: '',
        employeeId: '',
        department: '',
        position: '',
        managerId: '',
        assignedPromoters: [],
        hubspotOwnerId: ''
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
    setFormData({ ...formData, [field]: value });
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

      const dataToSave = {
        ...formData,
        updatedAt: Timestamp.now(),
        ...(editingUser ? {} : { createdAt: Timestamp.now() })
      };

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
                    {productLineLabels[user.productLine]}
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
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Línea de Producto</InputLabel>
                  <Select
                    value={formData.productLine}
                    onChange={(e) => handleInputChange('productLine', e.target.value)}
                    label="Línea de Producto"
                  >
                    {Object.entries(productLineLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
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
              <Grid item xs={12} md={6}>
                <TextField
                  label="Departamento"
                  fullWidth
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Ej: Ventas"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Puesto"
                  fullWidth
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="Ej: Promotor de Ventas"
                />
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
