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
  MenuItem,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { v4 as uuidv4 } from 'uuid';
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
  HubSpotMetricFilter,
  HubSpotDateRangeFilter,
  HubSpotCalculationType,
  HubSpotFilterOperator
} from '../types/hubspotMetric';
import type { HubSpotProperty, HubSpotObjectType } from '../types/hubspotProperty';

const HubSpotMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<HubSpotMetric[]>([]);
  const [properties, setProperties] = useState<HubSpotProperty[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<HubSpotMetric | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState<HubSpotMetricFormData>({
    name: '',
    description: '',
    objectType: 'deals',
    calculationType: 'COUNT',
    sumPropertyId: undefined,
    filters: [],
    dateRangeFilter: undefined,
    filterByOwnerId: true,
    ownerIdPropertyId: undefined,
    filterByProductLine: false,
    productLinePropertyId: undefined,
    active: true
  });

  useEffect(() => {
    fetchMetrics();
    fetchProperties();
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

  const fetchProperties = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'hubspotProperties'));
      const propertiesData: HubSpotProperty[] = [];
      querySnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() } as HubSpotProperty);
      });
      setProperties(propertiesData.filter(p => p.active));
    } catch (err) {
      console.error('Error al cargar properties:', err);
    }
  };

  const handleOpenDialog = (metric?: HubSpotMetric) => {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        name: metric.name,
        description: metric.description || '',
        objectType: metric.objectType,
        calculationType: metric.calculationType,
        sumPropertyId: metric.sumPropertyId,
        filters: metric.filters || [],
        dateRangeFilter: metric.dateRangeFilter,
        filterByOwnerId: metric.filterByOwnerId,
        ownerIdPropertyId: metric.ownerIdPropertyId,
        filterByProductLine: metric.filterByProductLine,
        productLinePropertyId: metric.productLinePropertyId,
        active: metric.active
      });
    } else {
      setEditingMetric(null);
      setFormData({
        name: '',
        description: '',
        objectType: 'deals',
        calculationType: 'COUNT',
        sumPropertyId: undefined,
        filters: [],
        dateRangeFilter: undefined,
        filterByOwnerId: true,
        ownerIdPropertyId: undefined,
        filterByProductLine: false,
        productLinePropertyId: undefined,
        active: true
      });
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMetric(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.name.trim()) {
        setError('El nombre es obligatorio');
        return;
      }

      if ((formData.calculationType === 'SUM' || formData.calculationType === 'AVERAGE') && !formData.sumPropertyId) {
        setError('Debes seleccionar un campo para sumar/promediar');
        return;
      }

      if (formData.filterByOwnerId && !formData.ownerIdPropertyId) {
        setError('Debes seleccionar la property de Owner ID');
        return;
      }

      if (formData.filterByProductLine && !formData.productLinePropertyId) {
        setError('Debes seleccionar la property de Línea de Producto');
        return;
      }

      const dataToSave: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        objectType: formData.objectType,
        calculationType: formData.calculationType,
        sumPropertyId: formData.sumPropertyId || null,
        filters: formData.filters || [],
        dateRangeFilter: formData.dateRangeFilter || null,
        filterByOwnerId: formData.filterByOwnerId,
        ownerIdPropertyId: formData.ownerIdPropertyId || null,
        filterByProductLine: formData.filterByProductLine,
        productLinePropertyId: formData.productLinePropertyId || null,
        active: formData.active,
        updatedAt: Timestamp.now(),
        createdBy: 'admin'
      };

      if (editingMetric) {
        await updateDoc(doc(db, 'hubspotMetrics', editingMetric.id), dataToSave);
        setSuccess('Métrica actualizada exitosamente');
      } else {
        dataToSave.createdAt = Timestamp.now();
        await addDoc(collection(db, 'hubspotMetrics'), dataToSave);
        setSuccess('Métrica creada exitosamente');
      }

      handleCloseDialog();
      fetchMetrics();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al guardar la métrica');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta métrica? Esto podría afectar ligas, metas o bonos que la usen.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'hubspotMetrics', id));
      setSuccess('Métrica eliminada');
      fetchMetrics();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al eliminar la métrica');
    }
  };

  const handleAddFilter = () => {
    const newFilter: HubSpotMetricFilter = {
      id: uuidv4(),
      propertyId: '',
      operator: '==',
      value: ''
    };
    setFormData({
      ...formData,
      filters: [...formData.filters, newFilter]
    });
  };

  const handleUpdateFilter = (index: number, field: keyof HubSpotMetricFilter, value: any) => {
    const newFilters = [...formData.filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFormData({ ...formData, filters: newFilters });
  };

  const handleRemoveFilter = (index: number) => {
    setFormData({
      ...formData,
      filters: formData.filters.filter((_, i) => i !== index)
    });
  };

  const handleToggleDateFilter = (enabled: boolean) => {
    if (enabled) {
      setFormData({
        ...formData,
        dateRangeFilter: {
          enabled: true,
          propertyId: '',
          useLeagueDates: true,
          customStartDate: undefined,
          customEndDate: undefined
        }
      });
    } else {
      setFormData({
        ...formData,
        dateRangeFilter: undefined
      });
    }
  };

  const handleUpdateDateFilter = (field: keyof HubSpotDateRangeFilter, value: any) => {
    if (!formData.dateRangeFilter) return;
    setFormData({
      ...formData,
      dateRangeFilter: {
        ...formData.dateRangeFilter,
        [field]: value
      }
    });
  };

  const availableProperties = properties.filter(p => p.objectType === formData.objectType);
  const numberProperties = availableProperties.filter(p => p.dataType === 'number');
  const dateProperties = availableProperties.filter(p => p.dataType === 'date');
  const textProperties = availableProperties.filter(p => p.dataType === 'text');

  const getProperty = (id: string) => properties.find(p => p.id === id);

  const getOperatorsForProperty = (propertyId: string): HubSpotFilterOperator[] => {
    const property = getProperty(propertyId);
    if (!property) return ['=='];

    switch (property.dataType) {
      case 'number':
      case 'date':
        return ['==', '!=', '>', '<', '>=', '<='];
      case 'text':
        return ['==', '!=', 'contains'];
      case 'enum':
        return ['==', '!=', 'in'];
      case 'boolean':
        return ['=='];
      default:
        return ['=='];
    }
  };

  const getCalculationTypeLabel = (type: HubSpotCalculationType) => {
    const labels: Record<HubSpotCalculationType, string> = {
      COUNT: 'Contar',
      SUM: 'Sumar',
      AVERAGE: 'Promedio'
    };
    return labels[type];
  };

  const getObjectTypeLabel = (type: HubSpotObjectType) => {
    const labels: Record<HubSpotObjectType, string> = {
      deals: 'Deals',
      contacts: 'Contactos',
      companies: 'Empresas'
    };
    return labels[type];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Métricas de HubSpot
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea métricas personalizadas con filtros flexibles para usar en ligas, metas y bonos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Métrica
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {properties.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No hay properties de HubSpot configuradas. Ve a la sección de Properties de HubSpot para crear algunas primero.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Objeto</TableCell>
              <TableCell>Cálculo</TableCell>
              <TableCell>Filtros</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {metrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay métricas configuradas. Crea tu primera métrica.
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
                      {metric.description && (
                        <Typography variant="caption" color="text.secondary">
                          {metric.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getObjectTypeLabel(metric.objectType)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getCalculationTypeLabel(metric.calculationType)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip label={`${metric.filters.length} filtros`} size="small" />
                      {metric.filterByOwnerId && <Chip label="Owner ID" size="small" color="info" />}
                      {metric.filterByProductLine && <Chip label="Product Line" size="small" color="info" />}
                      {metric.dateRangeFilter?.enabled && <Chip label="Fechas" size="small" color="warning" />}
                    </Stack>
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

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMetric ? 'Editar Métrica' : 'Nueva Métrica'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Información básica */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  Información Básica
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Nombre de la Métrica"
                      fullWidth
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Ventas de Vida en 2024"
                      helperText="Nombre descriptivo de lo que mide esta métrica"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Descripción"
                      fullWidth
                      multiline
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe qué mide y cómo se usa..."
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label="Objeto de HubSpot"
                      fullWidth
                      required
                      value={formData.objectType}
                      onChange={(e) => setFormData({
                        ...formData,
                        objectType: e.target.value as HubSpotObjectType,
                        filters: [],
                        sumPropertyId: undefined
                      })}
                      helperText="Tipo de objeto en HubSpot"
                    >
                      <MenuItem value="deals">Deals</MenuItem>
                      <MenuItem value="contacts">Contactos</MenuItem>
                      <MenuItem value="companies">Empresas</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label="Tipo de Cálculo"
                      fullWidth
                      required
                      value={formData.calculationType}
                      onChange={(e) => setFormData({
                        ...formData,
                        calculationType: e.target.value as HubSpotCalculationType
                      })}
                    >
                      <MenuItem value="COUNT">Contar registros</MenuItem>
                      <MenuItem value="SUM">Sumar campo</MenuItem>
                      <MenuItem value="AVERAGE">Promedio de campo</MenuItem>
                    </TextField>
                  </Grid>
                  {(formData.calculationType === 'SUM' || formData.calculationType === 'AVERAGE') && (
                    <Grid item xs={12}>
                      <TextField
                        select
                        label="Campo a Sumar/Promediar"
                        fullWidth
                        required
                        value={formData.sumPropertyId || ''}
                        onChange={(e) => setFormData({ ...formData, sumPropertyId: e.target.value })}
                        helperText="Selecciona el campo numérico"
                      >
                        <MenuItem value="">-- Selecciona un campo --</MenuItem>
                        {numberProperties.map(prop => (
                          <MenuItem key={prop.id} value={prop.id}>
                            {prop.name} ({prop.internalName})
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Filtros personalizados */}
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" color="primary">
                    <FilterListIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    Filtros Personalizados
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={handleAddFilter}>
                    Agregar Filtro
                  </Button>
                </Box>

                {formData.filters.length === 0 ? (
                  <Alert severity="info">
                    No hay filtros. Agrega filtros para refinar los datos que se incluyen en la métrica.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {formData.filters.map((filter, index) => {
                      const selectedProperty = getProperty(filter.propertyId);
                      const operators = getOperatorsForProperty(filter.propertyId);

                      return (
                        <Paper key={filter.id} variant="outlined" sx={{ p: 2 }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <TextField
                                select
                                label="Campo"
                                fullWidth
                                size="small"
                                required
                                value={filter.propertyId}
                                onChange={(e) => handleUpdateFilter(index, 'propertyId', e.target.value)}
                              >
                                <MenuItem value="">-- Selecciona --</MenuItem>
                                {availableProperties.map(prop => (
                                  <MenuItem key={prop.id} value={prop.id}>
                                    {prop.name}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                select
                                label="Operador"
                                fullWidth
                                size="small"
                                required
                                value={filter.operator}
                                onChange={(e) => handleUpdateFilter(index, 'operator', e.target.value)}
                                disabled={!filter.propertyId}
                              >
                                {operators.map(op => (
                                  <MenuItem key={op} value={op}>{op}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                label="Valor"
                                fullWidth
                                size="small"
                                required
                                value={filter.value}
                                onChange={(e) => {
                                  let value: any = e.target.value;
                                  if (selectedProperty?.dataType === 'number') {
                                    value = parseFloat(value) || 0;
                                  } else if (selectedProperty?.dataType === 'boolean') {
                                    value = value === 'true';
                                  }
                                  handleUpdateFilter(index, 'value', value);
                                }}
                                type={selectedProperty?.dataType === 'number' ? 'number' : 'text'}
                                disabled={!filter.propertyId}
                              />
                            </Grid>
                            <Grid item xs={12} sm={1}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveFilter(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Filtro de fechas */}
            <Card variant="outlined">
              <CardContent>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.dateRangeFilter?.enabled || false}
                      onChange={(e) => handleToggleDateFilter(e.target.checked)}
                    />
                  }
                  label="Filtrar por Rango de Fechas"
                />
                {formData.dateRangeFilter?.enabled && (
                  <Box mt={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          select
                          label="Campo de Fecha"
                          fullWidth
                          required
                          value={formData.dateRangeFilter.propertyId}
                          onChange={(e) => handleUpdateDateFilter('propertyId', e.target.value)}
                        >
                          <MenuItem value="">-- Selecciona un campo --</MenuItem>
                          {dateProperties.map(prop => (
                            <MenuItem key={prop.id} value={prop.id}>
                              {prop.name} ({prop.internalName})
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.dateRangeFilter.useLeagueDates}
                              onChange={(e) => handleUpdateDateFilter('useLeagueDates', e.target.checked)}
                            />
                          }
                          label="Usar fechas de la Liga/Meta automáticamente"
                        />
                      </Grid>
                      {!formData.dateRangeFilter.useLeagueDates && (
                        <>
                          <Grid item xs={6}>
                            <TextField
                              label="Fecha Inicio"
                              type="date"
                              fullWidth
                              InputLabelProps={{ shrink: true }}
                              value={formData.dateRangeFilter.customStartDate?.toISOString().split('T')[0] || ''}
                              onChange={(e) => handleUpdateDateFilter('customStartDate', e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              label="Fecha Fin"
                              type="date"
                              fullWidth
                              InputLabelProps={{ shrink: true }}
                              value={formData.dateRangeFilter.customEndDate?.toISOString().split('T')[0] || ''}
                              onChange={(e) => handleUpdateDateFilter('customEndDate', e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Filtros automáticos por usuario */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  Filtros Automáticos por Usuario
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Estos filtros se aplican automáticamente basándose en el usuario que consulta la métrica
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.filterByOwnerId}
                          onChange={(e) => setFormData({ ...formData, filterByOwnerId: e.target.checked })}
                        />
                      }
                      label="Filtrar por Owner ID del usuario"
                    />
                    {formData.filterByOwnerId && (
                      <TextField
                        select
                        label="Property de Owner ID"
                        fullWidth
                        size="small"
                        required
                        value={formData.ownerIdPropertyId || ''}
                        onChange={(e) => setFormData({ ...formData, ownerIdPropertyId: e.target.value })}
                        sx={{ mt: 1 }}
                      >
                        <MenuItem value="">-- Selecciona --</MenuItem>
                        {textProperties.map(prop => (
                          <MenuItem key={prop.id} value={prop.id}>
                            {prop.name} ({prop.internalName})
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.filterByProductLine}
                          onChange={(e) => setFormData({ ...formData, filterByProductLine: e.target.checked })}
                        />
                      }
                      label="Filtrar por Línea de Producto del usuario"
                    />
                    {formData.filterByProductLine && (
                      <TextField
                        select
                        label="Property de Línea de Producto"
                        fullWidth
                        size="small"
                        required
                        value={formData.productLinePropertyId || ''}
                        onChange={(e) => setFormData({ ...formData, productLinePropertyId: e.target.value })}
                        sx={{ mt: 1 }}
                      >
                        <MenuItem value="">-- Selecciona --</MenuItem>
                        {textProperties.map(prop => (
                          <MenuItem key={prop.id} value={prop.id}>
                            {prop.name} ({prop.internalName})
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Métrica Activa"
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingMetric ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HubSpotMetrics;
