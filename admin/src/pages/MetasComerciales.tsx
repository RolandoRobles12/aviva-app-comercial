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
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PhoneIcon from '@mui/icons-material/Phone';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
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
import type { Goal, GoalFormData, GoalPeriod, GoalTargetType } from '../types/goal';

interface Kiosk {
  id: string;
  name: string;
  address: string;
}

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

const MetasComerciales: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    period: 'weekly',
    targetType: 'all',
    targetId: undefined,
    targetName: undefined,
    metrics: {
      llamadas: '',
      colocacion: ''
    },
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    active: true
  });

  useEffect(() => {
    fetchGoals();
    fetchKiosks();
    fetchUsers();
  }, []);

  const fetchGoals = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'goals'));
      const goalsData: Goal[] = [];
      querySnapshot.forEach((doc) => {
        goalsData.push({ id: doc.id, ...doc.data() } as Goal);
      });
      setGoals(goalsData.sort((a, b) => b.startDate.seconds - a.startDate.seconds));
    } catch (err) {
      setError('Error al cargar metas comerciales');
      console.error(err);
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
          name: data.name || '',
          address: data.address || ''
        });
      });
      setKiosks(kiosksData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error al cargar kioscos:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'seller'));
      const querySnapshot = await getDocs(q);
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          displayName: data.displayName || data.email || '',
          email: data.email || '',
          role: data.role || ''
        });
      });
      setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } catch (err) {
      console.error('Error al cargar promotores:', err);
    }
  };

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        period: goal.period,
        targetType: goal.targetType,
        targetId: goal.targetId,
        targetName: goal.targetName,
        metrics: {
          llamadas: goal.metrics.llamadas.toString(),
          colocacion: goal.metrics.colocacion.toString()
        },
        startDate: goal.startDate.toDate().toISOString().split('T')[0],
        endDate: goal.endDate.toDate().toISOString().split('T')[0],
        active: goal.active
      });
    } else {
      setEditingGoal(null);
      setFormData({
        name: '',
        period: 'weekly',
        targetType: 'all',
        targetId: undefined,
        targetName: undefined,
        metrics: {
          llamadas: '60',
          colocacion: '150000'
        },
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        active: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGoal(null);
    setError('');
  };

  const handleInputChange = (field: keyof GoalFormData, value: any) => {
    if (field === 'targetType') {
      // Clear targetId and targetName when changing target type
      setFormData({
        ...formData,
        [field]: value,
        targetId: undefined,
        targetName: undefined
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleMetricsChange = (field: 'llamadas' | 'colocacion', value: string) => {
    setFormData({
      ...formData,
      metrics: {
        ...formData.metrics,
        [field]: value
      }
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      // Validaciones
      if (!formData.name.trim()) {
        setError('El nombre de la meta es obligatorio');
        return;
      }

      if (!formData.metrics.llamadas || isNaN(Number(formData.metrics.llamadas))) {
        setError('La meta de llamadas debe ser un número válido');
        return;
      }

      if (!formData.metrics.colocacion || isNaN(Number(formData.metrics.colocacion))) {
        setError('La meta de colocación debe ser un número válido');
        return;
      }

      if (formData.targetType !== 'all' && !formData.targetId) {
        setError('Debes seleccionar un objetivo cuando el tipo no es "Todos"');
        return;
      }

      const startDate = Timestamp.fromDate(new Date(formData.startDate));
      const endDate = Timestamp.fromDate(new Date(formData.endDate));

      if (endDate.seconds <= startDate.seconds) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      const dataToSave = {
        name: formData.name.trim(),
        period: formData.period,
        targetType: formData.targetType,
        targetId: formData.targetId || null,
        targetName: formData.targetName || null,
        metrics: {
          llamadas: Number(formData.metrics.llamadas),
          colocacion: Number(formData.metrics.colocacion)
        },
        startDate,
        endDate,
        active: formData.active,
        updatedAt: Timestamp.now(),
        createdBy: 'admin', // TODO: Get from auth context
        ...(editingGoal ? {} : { createdAt: Timestamp.now() })
      };

      if (editingGoal) {
        await updateDoc(doc(db, 'goals', editingGoal.id), dataToSave);
      } else {
        await addDoc(collection(db, 'goals'), dataToSave);
      }

      await fetchGoals();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la meta comercial');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta meta comercial?')) {
      try {
        await deleteDoc(doc(db, 'goals', id));
        await fetchGoals();
      } catch (err) {
        setError('Error al eliminar la meta comercial');
        console.error(err);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPeriodLabel = (period: GoalPeriod) => {
    return period === 'weekly' ? 'Semanal' : 'Mensual';
  };

  const getTargetTypeLabel = (type: GoalTargetType) => {
    switch (type) {
      case 'kiosk': return 'Por Kiosco';
      case 'seller': return 'Por Promotor';
      case 'all': return 'Todos';
      default: return type;
    }
  };

  const activeGoals = goals.filter(g => g.active);
  const weeklyGoals = goals.filter(g => g.period === 'weekly');
  const monthlyGoals = goals.filter(g => g.period === 'monthly');

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Metas Comerciales</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Configura metas de llamadas y colocación integradas con HubSpot
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Meta
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Integración con HubSpot:</strong> Las metas se calculan automáticamente usando datos de HubSpot.
        <br />
        • <strong>Llamadas:</strong> Deals creados donde el promotor es el deal owner
        <br />
        • <strong>Colocación:</strong> Suma de amounts de deals cuya fecha de disbursement cae dentro del período de la meta
      </Alert>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUpIcon color="primary" />
                <Typography color="textSecondary">
                  Metas Activas
                </Typography>
              </Box>
              <Typography variant="h4">
                {activeGoals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PhoneIcon color="success" />
                <Typography color="textSecondary">
                  Semanales
                </Typography>
              </Box>
              <Typography variant="h4">
                {weeklyGoals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <MonetizationOnIcon color="warning" />
                <Typography color="textSecondary">
                  Mensuales
                </Typography>
              </Box>
              <Typography variant="h4">
                {monthlyGoals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Período</TableCell>
              <TableCell>Objetivo</TableCell>
              <TableCell>Llamadas</TableCell>
              <TableCell>Colocación</TableCell>
              <TableCell>Vigencia</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {goals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay metas comerciales configuradas. Crea la primera meta para comenzar.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {goal.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPeriodLabel(goal.period)}
                      size="small"
                      color={goal.period === 'weekly' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getTargetTypeLabel(goal.targetType)}
                      size="small"
                      variant="outlined"
                    />
                    {goal.targetName && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {goal.targetName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {goal.metrics.llamadas}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(goal.metrics.colocacion)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      {formatDate(goal.startDate)}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {formatDate(goal.endDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={goal.active ? 'Activa' : 'Inactiva'}
                      color={goal.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(goal)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(goal.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGoal ? 'Editar Meta Comercial' : 'Nueva Meta Comercial'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre de la Meta"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Meta Semanal - Enero 2025"
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Período</InputLabel>
                  <Select
                    value={formData.period}
                    onChange={(e) => handleInputChange('period', e.target.value as GoalPeriod)}
                    label="Período"
                  >
                    <MenuItem value="weekly">Semanal</MenuItem>
                    <MenuItem value="monthly">Mensual</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo de Objetivo</InputLabel>
                  <Select
                    value={formData.targetType}
                    onChange={(e) => handleInputChange('targetType', e.target.value as GoalTargetType)}
                    label="Tipo de Objetivo"
                  >
                    <MenuItem value="all">Todos los Promotores</MenuItem>
                    <MenuItem value="seller">Por Promotor Específico</MenuItem>
                    <MenuItem value="kiosk">Por Kiosco Específico</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {formData.targetType === 'kiosk' && (
              <Autocomplete
                options={kiosks}
                getOptionLabel={(option) => `${option.name} - ${option.address}`}
                value={kiosks.find(k => k.id === formData.targetId) || null}
                onChange={(_, newValue) => {
                  handleInputChange('targetId', newValue?.id);
                  handleInputChange('targetName', newValue?.name);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Seleccionar Kiosco"
                    required
                    placeholder="Buscar kiosco..."
                  />
                )}
              />
            )}

            {formData.targetType === 'seller' && (
              <Autocomplete
                options={users}
                getOptionLabel={(option) => `${option.displayName} (${option.email})`}
                value={users.find(u => u.id === formData.targetId) || null}
                onChange={(_, newValue) => {
                  handleInputChange('targetId', newValue?.id);
                  handleInputChange('targetName', newValue?.displayName);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Seleccionar Promotor"
                    required
                    placeholder="Buscar promotor..."
                  />
                )}
              />
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Meta de Llamadas"
                  type="number"
                  fullWidth
                  required
                  value={formData.metrics.llamadas}
                  onChange={(e) => handleMetricsChange('llamadas', e.target.value)}
                  helperText="Número de deals a crear"
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Meta de Colocación (MXN)"
                  type="number"
                  fullWidth
                  required
                  value={formData.metrics.colocacion}
                  onChange={(e) => handleMetricsChange('colocacion', e.target.value)}
                  helperText={formData.metrics.colocacion ? formatCurrency(Number(formData.metrics.colocacion)) : 'Monto total a colocar'}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Fecha de Inicio"
                  type="date"
                  fullWidth
                  required
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Fecha de Fin"
                  type="date"
                  fullWidth
                  required
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                />
              }
              label="Meta Activa"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingGoal ? 'Actualizar' : 'Crear Meta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MetasComerciales;
