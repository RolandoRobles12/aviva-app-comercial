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
  Card,
  CardContent,
  Switch,
  FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
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
import type {
  HubSpotMetric,
  HubSpotMetricFormData,
  HubSpotCalculationMethod,
  HubSpotExtractField
} from '../types/hubspotMetric';
import { DEFAULT_HUBSPOT_METRICS as defaultMetrics } from '../types/hubspotMetric';

const HubSpotMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<HubSpotMetric[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<HubSpotMetric | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState<HubSpotMetricFormData>({
    name: '',
    description: '',
    calculationMethod: 'calculateGoalProgress',
    extractField: 'llamadas',
    usesProductLine: true,
    usesDateRange: true,
    active: true
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'hubspotMetrics'));
      const metricsData: HubSpotMetric[] = [];
      querySnapshot.forEach((doc) => {
        metricsData.push({ id: doc.id, ...doc.data() } as HubSpotMetric);
      });
      setMetrics(metricsData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError('Error al cargar métricas');
      console.error(err);
    }
  };

  const handleOpenDialog = (metric?: HubSpotMetric) => {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        name: metric.name,
        description: metric.description,
        calculationMethod: metric.calculationMethod,
        extractField: metric.extractField,
        usesProductLine: metric.usesProductLine,
        usesDateRange: metric.usesDateRange,
        active: metric.active
      });
    } else {
      setEditingMetric(null);
      setFormData({
        name: '',
        description: '',
        calculationMethod: 'calculateGoalProgress',
        extractField: 'llamadas',
        usesProductLine: true,
        usesDateRange: true,
        active: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMetric(null);
    setError('');
  };

  const handleInputChange = (field: keyof HubSpotMetricFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      // Validaciones
      if (!formData.name.trim()) {
        setError('El nombre de la métrica es obligatorio');
        return;
      }

      const dataToSave: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        calculationMethod: formData.calculationMethod,
        extractField: formData.extractField,
        usesProductLine: formData.usesProductLine,
        usesDateRange: formData.usesDateRange,
        active: formData.active,
        updatedAt: Timestamp.now()
      };

      if (editingMetric) {
        await updateDoc(doc(db, 'hubspotMetrics', editingMetric.id), dataToSave);
        setSuccess('Métrica actualizada exitosamente');
      } else {
        dataToSave.createdAt = Timestamp.now();
        dataToSave.createdBy = 'admin';
        await addDoc(collection(db, 'hubspotMetrics'), dataToSave);
        setSuccess('Métrica creada exitosamente');
      }

      setTimeout(() => setSuccess(''), 3000);
      await fetchMetrics();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la métrica');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta métrica? Las ligas que la usen dejarán de funcionar.')) {
      try {
        await deleteDoc(doc(db, 'hubspotMetrics', id));
        setSuccess('Métrica eliminada exitosamente');
        setTimeout(() => setSuccess(''), 3000);
        await fetchMetrics();
      } catch (err) {
        setError('Error al eliminar la métrica');
        console.error(err);
      }
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('¿Crear métricas predefinidas? Esto agregará las métricas básicas (Llamadas, Colocación, Tasa de Cierre).')) {
      return;
    }

    try {
      for (const metric of defaultMetrics) {
        await addDoc(collection(db, 'hubspotMetrics'), {
          ...metric,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'system'
        });
      }
      setSuccess(`${defaultMetrics.length} métricas predefinidas creadas exitosamente`);
      setTimeout(() => setSuccess(''), 3000);
      await fetchMetrics();
    } catch (err) {
      setError('Error al crear métricas predefinidas');
      console.error(err);
    }
  };

  const activeMetrics = metrics.filter(m => m.active);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Métricas de HubSpot</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Define las métricas disponibles para usar en ligas
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          {metrics.length === 0 && (
            <Button
              variant="outlined"
              onClick={handleSeedDefaults}
            >
              Crear Métricas Predefinidas
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Métrica
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <BarChartIcon color="primary" />
                <Typography color="textSecondary">
                  Métricas Activas
                </Typography>
              </Box>
              <Typography variant="h4">
                {activeMetrics.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <InfoIcon color="success" />
                <Typography color="textSecondary">
                  Total Métricas
                </Typography>
              </Box>
              <Typography variant="h4">
                {metrics.length}
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
              <TableCell>Método de Cálculo</TableCell>
              <TableCell>Campo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {metrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay métricas configuradas. Crea la primera métrica o usa las predefinidas.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              metrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {metric.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {metric.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={metric.calculationMethod}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={metric.extractField}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={metric.active ? 'Activa' : 'Inactiva'}
                      size="small"
                      color={metric.active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(metric)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(metric.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de crear/editar métrica */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMetric ? 'Editar Métrica' : 'Nueva Métrica'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Nombre de la Métrica"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Llamadas (Deals Creados)"
              helperText="Nombre descriptivo que aparecerá en las ligas"
            />

            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe qué mide esta métrica y cómo se calcula..."
              helperText="Ayuda a entender qué representa esta métrica"
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Método de Cálculo"
                  fullWidth
                  select
                  required
                  value={formData.calculationMethod}
                  onChange={(e) => handleInputChange('calculationMethod', e.target.value as HubSpotCalculationMethod)}
                  SelectProps={{ native: true }}
                  helperText="Función de HubSpotService que se usará"
                >
                  <option value="calculateGoalProgress">calculateGoalProgress</option>
                  <option value="calculateClosureRate">calculateClosureRate</option>
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Campo a Extraer"
                  fullWidth
                  select
                  required
                  value={formData.extractField}
                  onChange={(e) => handleInputChange('extractField', e.target.value as HubSpotExtractField)}
                  SelectProps={{ native: true }}
                  helperText="Qué campo del resultado usar"
                >
                  <option value="llamadas">llamadas</option>
                  <option value="colocacion">colocacion</option>
                  <option value="tasaCierre">tasaCierre</option>
                </TextField>
              </Grid>
            </Grid>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Opciones de Filtrado
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.usesProductLine}
                    onChange={(e) => handleInputChange('usesProductLine', e.target.checked)}
                  />
                }
                label="Filtrar por línea de producto del usuario"
              />

              <Typography variant="caption" color="text.secondary" display="block" ml={4}>
                Si está activado, solo contará datos del productLine asignado al usuario
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.usesDateRange}
                    onChange={(e) => handleInputChange('usesDateRange', e.target.checked)}
                  />
                }
                label="Usar rango de fechas de la liga"
              />

              <Typography variant="caption" color="text.secondary" display="block" ml={4}>
                Si está activado, solo contará datos dentro de las fechas de la liga
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                />
              }
              label="Métrica Activa"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingMetric ? 'Actualizar' : 'Crear Métrica'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HubSpotMetrics;
