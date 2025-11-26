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
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos de metas
enum MetaPeriodo {
  SEMANAL = 'SEMANAL',
  MENSUAL = 'MENSUAL',
  TRIMESTRAL = 'TRIMESTRAL'
}

enum MetaTipo {
  GLOBAL = 'GLOBAL',
  INDIVIDUAL = 'INDIVIDUAL',
  EQUIPO = 'EQUIPO'
}

// Categorías de bonos
enum CategoriaBono {
  CAC_A = 'CAC_A',
  CAC_B = 'CAC_B',
  CAC_C = 'CAC_C'
}

interface ConfiguracionBono {
  id: string;
  categoria: CategoriaBono;
  nombre: string;
  colocacionMinima: number; // en centavos
  colocacionMaxima: number; // en centavos
  montoBono: number; // en centavos
  llamadasMinimas: number;
  tasaCierreMinima: number; // porcentaje
  activo: boolean;
  orden: number;
}

interface Meta {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: MetaTipo;
  periodo: MetaPeriodo;

  // Targets
  llamadasObjetivo: number;
  colocacionObjetivo: number; // en centavos
  tasaCierreObjetivo: number; // porcentaje

  // Asignación
  userId?: string; // Para metas individuales
  teamId?: string; // Para metas de equipo

  // Fechas
  fechaInicio: Timestamp;
  fechaFin: Timestamp;

  activo: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const periodoLabels: Record<MetaPeriodo, string> = {
  [MetaPeriodo.SEMANAL]: 'Semanal',
  [MetaPeriodo.MENSUAL]: 'Mensual',
  [MetaPeriodo.TRIMESTRAL]: 'Trimestral'
};

const tipoLabels: Record<MetaTipo, string> = {
  [MetaTipo.GLOBAL]: 'Global (Todos)',
  [MetaTipo.INDIVIDUAL]: 'Individual',
  [MetaTipo.EQUIPO]: 'Por Equipo'
};

const categoriaBonoLabels: Record<CategoriaBono, string> = {
  [CategoriaBono.CAC_A]: 'CAC A - Premium',
  [CategoriaBono.CAC_B]: 'CAC B - Estándar',
  [CategoriaBono.CAC_C]: 'CAC C - Básico'
};

const Metas: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  // Metas
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metasLoading, setMetasLoading] = useState(true);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);

  // Bonos
  const [bonos, setBonos] = useState<ConfiguracionBono[]>([]);
  const [bonosLoading, setBonosLoading] = useState(true);
  const [bonoDialogOpen, setBonoDialogOpen] = useState(false);
  const [editingBono, setEditingBono] = useState<ConfiguracionBono | null>(null);

  const [error, setError] = useState<string>('');

  const [metaFormData, setMetaFormData] = useState<Omit<Meta, 'id'>>({
    nombre: '',
    descripcion: '',
    tipo: MetaTipo.GLOBAL,
    periodo: MetaPeriodo.SEMANAL,
    llamadasObjetivo: 60,
    colocacionObjetivo: 15000000, // $150,000 MXN
    tasaCierreObjetivo: 25,
    fechaInicio: Timestamp.now(),
    fechaFin: Timestamp.now(),
    activo: true
  });

  const [bonoFormData, setBonoFormData] = useState<Omit<ConfiguracionBono, 'id'>>({
    categoria: CategoriaBono.CAC_C,
    nombre: '',
    colocacionMinima: 0,
    colocacionMaxima: 15000000,
    montoBono: 250000, // $2,500
    llamadasMinimas: 50,
    tasaCierreMinima: 20,
    activo: true,
    orden: 1
  });

  useEffect(() => {
    fetchMetas();
    fetchBonos();
  }, []);

  const fetchMetas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'metas'));
      const metasData: Meta[] = [];
      querySnapshot.forEach((doc) => {
        metasData.push({ id: doc.id, ...doc.data() } as Meta);
      });
      setMetas(metasData.sort((a, b) => b.fechaInicio.seconds - a.fechaInicio.seconds));
    } catch (err) {
      setError('Error al cargar metas');
      console.error(err);
    } finally {
      setMetasLoading(false);
    }
  };

  const fetchBonos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'configuracion_bonos'));
      const bonosData: ConfiguracionBono[] = [];
      querySnapshot.forEach((doc) => {
        bonosData.push({ id: doc.id, ...doc.data() } as ConfiguracionBono);
      });
      setBonos(bonosData.sort((a, b) => a.orden - b.orden));
    } catch (err) {
      setError('Error al cargar configuración de bonos');
      console.error(err);
    } finally {
      setBonosLoading(false);
    }
  };

  // Handlers para Metas
  const handleOpenMetaDialog = (meta?: Meta) => {
    if (meta) {
      setEditingMeta(meta);
      setMetaFormData({
        nombre: meta.nombre,
        descripcion: meta.descripcion,
        tipo: meta.tipo,
        periodo: meta.periodo,
        llamadasObjetivo: meta.llamadasObjetivo,
        colocacionObjetivo: meta.colocacionObjetivo,
        tasaCierreObjetivo: meta.tasaCierreObjetivo,
        userId: meta.userId,
        teamId: meta.teamId,
        fechaInicio: meta.fechaInicio,
        fechaFin: meta.fechaFin,
        activo: meta.activo
      });
    } else {
      setEditingMeta(null);
      setMetaFormData({
        nombre: '',
        descripcion: '',
        tipo: MetaTipo.GLOBAL,
        periodo: MetaPeriodo.SEMANAL,
        llamadasObjetivo: 60,
        colocacionObjetivo: 15000000,
        tasaCierreObjetivo: 25,
        fechaInicio: Timestamp.now(),
        fechaFin: Timestamp.now(),
        activo: true
      });
    }
    setMetaDialogOpen(true);
  };

  const handleCloseMetaDialog = () => {
    setMetaDialogOpen(false);
    setEditingMeta(null);
    setError('');
  };

  const handleMetaInputChange = (field: keyof typeof metaFormData, value: any) => {
    setMetaFormData({ ...metaFormData, [field]: value });
  };

  const handleSubmitMeta = async () => {
    try {
      setError('');

      if (!metaFormData.nombre) {
        setError('El nombre de la meta es obligatorio');
        return;
      }

      const dataToSave = {
        ...metaFormData,
        updatedAt: Timestamp.now(),
        ...(editingMeta ? {} : { createdAt: Timestamp.now() })
      };

      if (editingMeta) {
        await updateDoc(doc(db, 'metas', editingMeta.id), dataToSave);
      } else {
        await addDoc(collection(db, 'metas'), dataToSave);
      }

      await fetchMetas();
      handleCloseMetaDialog();
    } catch (err) {
      setError('Error al guardar la meta');
      console.error(err);
    }
  };

  const handleDeleteMeta = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta meta?')) {
      try {
        await deleteDoc(doc(db, 'metas', id));
        await fetchMetas();
      } catch (err) {
        setError('Error al eliminar la meta');
        console.error(err);
      }
    }
  };

  // Handlers para Bonos
  const handleOpenBonoDialog = (bono?: ConfiguracionBono) => {
    if (bono) {
      setEditingBono(bono);
      setBonoFormData({
        categoria: bono.categoria,
        nombre: bono.nombre,
        colocacionMinima: bono.colocacionMinima,
        colocacionMaxima: bono.colocacionMaxima,
        montoBono: bono.montoBono,
        llamadasMinimas: bono.llamadasMinimas,
        tasaCierreMinima: bono.tasaCierreMinima,
        activo: bono.activo,
        orden: bono.orden
      });
    } else {
      setEditingBono(null);
      setBonoFormData({
        categoria: CategoriaBono.CAC_C,
        nombre: '',
        colocacionMinima: 0,
        colocacionMaxima: 15000000,
        montoBono: 250000,
        llamadasMinimas: 50,
        tasaCierreMinima: 20,
        activo: true,
        orden: bonos.length + 1
      });
    }
    setBonoDialogOpen(true);
  };

  const handleCloseBonoDialog = () => {
    setBonoDialogOpen(false);
    setEditingBono(null);
    setError('');
  };

  const handleBonoInputChange = (field: keyof typeof bonoFormData, value: any) => {
    setBonoFormData({ ...bonoFormData, [field]: value });
  };

  const handleSubmitBono = async () => {
    try {
      setError('');

      if (!bonoFormData.nombre) {
        setError('El nombre del bono es obligatorio');
        return;
      }

      if (bonoFormData.colocacionMinima >= bonoFormData.colocacionMaxima) {
        setError('La colocación mínima debe ser menor a la máxima');
        return;
      }

      if (editingBono) {
        await updateDoc(doc(db, 'configuracion_bonos', editingBono.id), bonoFormData);
      } else {
        await addDoc(collection(db, 'configuracion_bonos'), bonoFormData);
      }

      await fetchBonos();
      handleCloseBonoDialog();
    } catch (err) {
      setError('Error al guardar el bono');
      console.error(err);
    }
  };

  const handleDeleteBono = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta configuración de bono?')) {
      try {
        await deleteDoc(doc(db, 'configuracion_bonos', id));
        await fetchBonos();
      } catch (err) {
        setError('Error al eliminar el bono');
        console.error(err);
      }
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(centavos / 100);
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('es-MX');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Metas Comerciales</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Configura metas y bonos para los promotores
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Actualmente en MetasBonoFragment.kt:</strong> Los valores están hardcodeados (líneas 48-83).
        <br />
        <strong>Para aplicar:</strong> Modificar la app para que lea de Firestore estas configuraciones.
      </Alert>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Metas" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="Configuración de Bonos" icon={<EmojiEventsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* TAB 1: METAS */}
      {tabValue === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Metas Definidas</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenMetaDialog()}
            >
              Nueva Meta
            </Button>
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Metas Activas
                  </Typography>
                  <Typography variant="h4">
                    {metas.filter(m => m.activo).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Metas Globales
                  </Typography>
                  <Typography variant="h4">
                    {metas.filter(m => m.tipo === MetaTipo.GLOBAL).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Metas Individuales
                  </Typography>
                  <Typography variant="h4">
                    {metas.filter(m => m.tipo === MetaTipo.INDIVIDUAL).length}
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
                  <TableCell>Tipo</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell>Llamadas</TableCell>
                  <TableCell>Colocación</TableCell>
                  <TableCell>Tasa Cierre</TableCell>
                  <TableCell>Vigencia</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metas.map((meta) => (
                  <TableRow key={meta.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {meta.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {meta.descripcion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={tipoLabels[meta.tipo]} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{periodoLabels[meta.periodo]}</TableCell>
                    <TableCell>{meta.llamadasObjetivo}</TableCell>
                    <TableCell>{formatCurrency(meta.colocacionObjetivo)}</TableCell>
                    <TableCell>{meta.tasaCierreObjetivo}%</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(meta.fechaInicio)} - {formatDate(meta.fechaFin)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={meta.activo ? 'Activa' : 'Inactiva'}
                        color={meta.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenMetaDialog(meta)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteMeta(meta.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 2: BONOS */}
      {tabValue === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Configuración de Bonos (CAC)</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenBonoDialog()}
            >
              Nuevo Bono
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            Los bonos se calculan según la categoría CAC (Colocación, Asistencia, Cierre) alcanzada por el promotor.
          </Alert>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Rango de Colocación</TableCell>
                  <TableCell>Monto del Bono</TableCell>
                  <TableCell>Llamadas Mín.</TableCell>
                  <TableCell>Tasa Cierre Mín.</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bonos.map((bono) => (
                  <TableRow key={bono.id}>
                    <TableCell>
                      <Chip
                        label={categoriaBonoLabels[bono.categoria]}
                        size="small"
                        color={
                          bono.categoria === CategoriaBono.CAC_A ? 'success' :
                          bono.categoria === CategoriaBono.CAC_B ? 'primary' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{bono.nombre}</TableCell>
                    <TableCell>
                      {formatCurrency(bono.colocacionMinima)} - {formatCurrency(bono.colocacionMaxima)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        {formatCurrency(bono.montoBono)}
                      </Typography>
                    </TableCell>
                    <TableCell>{bono.llamadasMinimas}</TableCell>
                    <TableCell>{bono.tasaCierreMinima}%</TableCell>
                    <TableCell>
                      <Chip
                        label={bono.activo ? 'Activo' : 'Inactivo'}
                        color={bono.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenBonoDialog(bono)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteBono(bono.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* DIALOG: CREAR/EDITAR META */}
      <Dialog open={metaDialogOpen} onClose={handleCloseMetaDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMeta ? 'Editar Meta' : 'Nueva Meta'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Nombre de la Meta"
                  fullWidth
                  required
                  value={metaFormData.nombre}
                  onChange={(e) => handleMetaInputChange('nombre', e.target.value)}
                  placeholder="Ej: Meta Semanal Julio 2024"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Descripción"
                  fullWidth
                  multiline
                  rows={2}
                  value={metaFormData.descripcion}
                  onChange={(e) => handleMetaInputChange('descripcion', e.target.value)}
                  placeholder="Descripción opcional de la meta"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo de Meta</InputLabel>
                  <Select
                    value={metaFormData.tipo}
                    onChange={(e) => handleMetaInputChange('tipo', e.target.value)}
                    label="Tipo de Meta"
                  >
                    {Object.entries(tipoLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Período</InputLabel>
                  <Select
                    value={metaFormData.periodo}
                    onChange={(e) => handleMetaInputChange('periodo', e.target.value)}
                    label="Período"
                  >
                    {Object.entries(periodoLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Llamadas Objetivo"
                  type="number"
                  fullWidth
                  required
                  value={metaFormData.llamadasObjetivo}
                  onChange={(e) => handleMetaInputChange('llamadasObjetivo', parseInt(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Colocación Objetivo (MXN)"
                  type="number"
                  fullWidth
                  required
                  value={metaFormData.colocacionObjetivo / 100}
                  onChange={(e) => handleMetaInputChange('colocacionObjetivo', parseFloat(e.target.value) * 100)}
                  helperText={formatCurrency(metaFormData.colocacionObjetivo)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Tasa de Cierre Objetivo (%)"
                  type="number"
                  fullWidth
                  required
                  value={metaFormData.tasaCierreObjetivo}
                  onChange={(e) => handleMetaInputChange('tasaCierreObjetivo', parseFloat(e.target.value))}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMetaDialog}>Cancelar</Button>
          <Button onClick={handleSubmitMeta} variant="contained">
            {editingMeta ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CREAR/EDITAR BONO */}
      <Dialog open={bonoDialogOpen} onClose={handleCloseBonoDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBono ? 'Editar Configuración de Bono' : 'Nueva Configuración de Bono'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Categoría CAC</InputLabel>
                  <Select
                    value={bonoFormData.categoria}
                    onChange={(e) => handleBonoInputChange('categoria', e.target.value)}
                    label="Categoría CAC"
                  >
                    {Object.entries(categoriaBonoLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nombre del Bono"
                  fullWidth
                  required
                  value={bonoFormData.nombre}
                  onChange={(e) => handleBonoInputChange('nombre', e.target.value)}
                  placeholder="Ej: Bono CAC A - Premium"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Colocación Mínima (MXN)"
                  type="number"
                  fullWidth
                  required
                  value={bonoFormData.colocacionMinima / 100}
                  onChange={(e) => handleBonoInputChange('colocacionMinima', parseFloat(e.target.value) * 100)}
                  helperText={formatCurrency(bonoFormData.colocacionMinima)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Colocación Máxima (MXN)"
                  type="number"
                  fullWidth
                  required
                  value={bonoFormData.colocacionMaxima / 100}
                  onChange={(e) => handleBonoInputChange('colocacionMaxima', parseFloat(e.target.value) * 100)}
                  helperText={formatCurrency(bonoFormData.colocacionMaxima)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Monto del Bono (MXN)"
                  type="number"
                  fullWidth
                  required
                  value={bonoFormData.montoBono / 100}
                  onChange={(e) => handleBonoInputChange('montoBono', parseFloat(e.target.value) * 100)}
                  helperText={formatCurrency(bonoFormData.montoBono)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Llamadas Mínimas"
                  type="number"
                  fullWidth
                  required
                  value={bonoFormData.llamadasMinimas}
                  onChange={(e) => handleBonoInputChange('llamadasMinimas', parseInt(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Tasa de Cierre Mínima (%)"
                  type="number"
                  fullWidth
                  required
                  value={bonoFormData.tasaCierreMinima}
                  onChange={(e) => handleBonoInputChange('tasaCierreMinima', parseFloat(e.target.value))}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBonoDialog}>Cancelar</Button>
          <Button onClick={handleSubmitBono} variant="contained">
            {editingBono ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Metas;
