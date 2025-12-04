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
  Timestamp
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

interface League {
  id: string;
  name: string;
  description?: string;
  members: string[];
}

const MetasComerciales: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    period: 'weekly',
    targetType: 'all',
    targetIds: [],
    targetNames: [],
    metrics: {
      llamadas: '60',
      colocacion: '150000'
    },
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    active: true
  });

  useEffect(() => {
    console.log('🚀 MetasComerciales v2.0 - Con soporte para usuarios/kioscos/ligas');
    fetchGoals();
    fetchKiosks();
    fetchUsers();
    fetchLeagues();
  }, []);

  const fetchGoals = async () => {
    try {
      // Leer de la colección 'metas' (legacy) en lugar de 'goals'
      const querySnapshot = await getDocs(collection(db, 'metas'));
      const goalsData: Goal[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convertir del formato legacy al formato nuevo para mostrar en UI
        const goal: Goal = {
          id: doc.id,
          name: data.nombre || data.name || '',
          // Convertir SEMANAL/MENSUAL a weekly/monthly para la UI
          period: data.periodo === 'SEMANAL' ? 'weekly' :
                  data.periodo === 'MENSUAL' ? 'monthly' :
                  (data.period || 'weekly'),
          // Convertir GLOBAL/USUARIO/KIOSCO/LIGA a all/users/kiosks/league
          targetType: data.tipo === 'GLOBAL' ? 'all' :
                      data.tipo === 'USUARIO' ? 'users' :
                      data.tipo === 'KIOSCO' ? 'kiosks' :
                      data.tipo === 'LIGA' ? 'league' :
                      (data.targetType || 'all'),
          targetIds: data.targetIds || [],
          targetNames: data.targetNames || [],
          metrics: {
            llamadas: data.llamadasObjetivo || data.metrics?.llamadas || 0,
            colocacion: data.colocacionObjetivo || data.metrics?.colocacion || 0
          },
          startDate: data.fechaInicio || data.startDate,
          endDate: data.fechaFin || data.endDate,
          active: data.activo !== undefined ? data.activo : (data.active !== undefined ? data.active : true),
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now(),
          createdBy: data.createdBy || 'admin'
        };
        goalsData.push(goal);
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
      console.log(`✅ Kioscos cargados: ${kiosksData.length}`, kiosksData.map(k => k.name));
    } catch (err) {
      console.error('❌ Error al cargar kioscos:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      // Buscar todos los usuarios que no sean admin
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filtrar solo usuarios que no sean admin
        if (data.role !== 'admin') {
          usersData.push({
            id: doc.id,
            displayName: data.displayName || data.email || '',
            email: data.email || '',
            role: data.role || ''
          });
        }
      });
      setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      console.log(`✅ Usuarios cargados: ${usersData.length}`, usersData.map(u => `${u.displayName} (${u.role})`));
    } catch (err) {
      console.error('❌ Error al cargar promotores:', err);
    }
  };

  const fetchLeagues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'leagues'));
      const leaguesData: League[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leaguesData.push({
          id: doc.id,
          name: data.name || '',
          description: data.description,
          members: data.members || []
        });
      });
      setLeagues(leaguesData.sort((a, b) => a.name.localeCompare(b.name)));
      console.log(`✅ Ligas cargadas: ${leaguesData.length}`, leaguesData.map(l => l.name));
    } catch (err) {
      console.error('❌ Error al cargar ligas:', err);
    }
  };

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        period: goal.period,
        targetType: goal.targetType,
        targetIds: goal.targetIds || [],
        targetNames: goal.targetNames || [],
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
        targetIds: [],
        targetNames: [],
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
      // Clear targetIds and targetNames when changing target type
      setFormData({
        ...formData,
        [field]: value,
        targetIds: [],
        targetNames: []
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

      if (formData.targetType !== 'all' && formData.targetIds.length === 0) {
        setError('Debes seleccionar al menos un objetivo cuando el tipo no es "Todos"');
        return;
      }

      const startDate = Timestamp.fromDate(new Date(formData.startDate));
      const endDate = Timestamp.fromDate(new Date(formData.endDate));

      if (endDate.seconds <= startDate.seconds) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      // Guardar en formato legacy (colección 'metas' con campos en español)
      const dataToSave = {
        nombre: formData.name.trim(),
        // Convertir weekly/monthly a SEMANAL/MENSUAL
        periodo: formData.period === 'weekly' ? 'SEMANAL' :
                 formData.period === 'monthly' ? 'MENSUAL' : 'SEMANAL',
        // Convertir all/users/kiosks/league a GLOBAL/USUARIO/KIOSCO/LIGA
        tipo: formData.targetType === 'all' ? 'GLOBAL' :
              formData.targetType === 'users' ? 'USUARIO' :
              formData.targetType === 'kiosks' ? 'KIOSCO' :
              formData.targetType === 'league' ? 'LIGA' : 'GLOBAL',
        targetIds: formData.targetIds,
        targetNames: formData.targetNames,
        llamadasObjetivo: Number(formData.metrics.llamadas),
        colocacionObjetivo: Number(formData.metrics.colocacion),
        tasaCierreObjetivo: 25, // Valor por defecto
        fechaInicio: startDate,
        fechaFin: endDate,
        activo: formData.active,
        updatedAt: Timestamp.now(),
        descripcion: '',
        ...(editingGoal ? {} : { createdAt: Timestamp.now() })
      };

      console.log('💾 Guardando meta:', dataToSave);

      if (editingGoal) {
        console.log(`✏️ Actualizando meta existente: ${editingGoal.id}`);
        await updateDoc(doc(db, 'metas', editingGoal.id), dataToSave);
      } else {
        console.log('➕ Creando nueva meta');
        await addDoc(collection(db, 'metas'), dataToSave);
      }

      console.log('✅ Meta guardada exitosamente');
      await fetchGoals();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la meta comercial');
      console.error('❌ Error al guardar:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta meta comercial?')) {
      try {
        await deleteDoc(doc(db, 'metas', id));
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
      case 'kiosks': return 'Por Kioscos';
      case 'users': return 'Por Usuarios';
      case 'league': return 'Por Liga';
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
                    {goal.targetNames && goal.targetNames.length > 0 && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {goal.targetNames.join(', ')}
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
                    <MenuItem value="league">Por Liga</MenuItem>
                    <MenuItem value="users">Por Promotor Específico</MenuItem>
                    <MenuItem value="kiosks">Por Kiosco Específico</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {formData.targetType === 'kiosks' && (
              <Autocomplete
                multiple
                options={kiosks}
                getOptionLabel={(option) => `${option.name} - ${option.address}`}
                value={kiosks.filter(k => formData.targetIds.includes(k.id))}
                onChange={(_, newValue) => {
                  handleInputChange('targetIds', newValue.map(v => v.id));
                  handleInputChange('targetNames', newValue.map(v => v.name));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Seleccionar Kioscos"
                    required
                    placeholder="Buscar kioscos..."
                  />
                )}
              />
            )}

            {formData.targetType === 'users' && (
              <Autocomplete
                multiple
                options={users}
                getOptionLabel={(option) => `${option.displayName} (${option.email})`}
                value={users.filter(u => formData.targetIds.includes(u.id))}
                onChange={(_, newValue) => {
                  handleInputChange('targetIds', newValue.map(v => v.id));
                  handleInputChange('targetNames', newValue.map(v => v.displayName));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Seleccionar Promotores"
                    required
                    placeholder="Buscar promotores..."
                  />
                )}
              />
            )}

            {formData.targetType === 'league' && (
              <Autocomplete
                multiple
                options={leagues}
                getOptionLabel={(option) => option.name}
                value={leagues.filter(l => formData.targetIds.includes(l.id))}
                onChange={(_, newValue) => {
                  handleInputChange('targetIds', newValue.map(v => v.id));
                  handleInputChange('targetNames', newValue.map(v => v.name));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Seleccionar Ligas"
                    required
                    placeholder="Buscar ligas..."
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
