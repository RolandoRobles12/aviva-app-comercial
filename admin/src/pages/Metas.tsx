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
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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

// ==================== INTERFACES DEL SCORECARD ====================

// Tipos de métricas del Scorecard
type MetricaScorecard = 'CAC' | 'CALIDAD' | 'NIM' | 'CRECIMIENTO';

// Categorías de métricas (pueden ser letras o números)
type CategoriaMetrica = 'A' | 'B' | 'C' | '1' | '2' | '3';

// Configuración de rangos para cada métrica
interface RangoMetrica {
  categoria: CategoriaMetrica;
  min: number;
  max: number;
  puntaje: number;
}

// Configuración completa de una métrica del Scorecard
interface ConfiguracionMetrica {
  id: string;
  metrica: MetricaScorecard;
  nombre: string;
  descripcion: string;
  pesoMaximo: number; // Puntos máximos que puede otorgar esta métrica
  rangos: RangoMetrica[];
  activo: boolean;
  orden: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Configuración del multiplicador de bonos
interface ConfiguracionMultiplicador {
  id: string;
  puntajeMin: number;
  puntajeMax: number;
  multiplicador: number; // Ej: 0.5 para 0.5X, 1.0 para 1.0X
  baseSalarial: number; // Base en centavos
  descripcion: string;
  activo: boolean;
  orden: number;
  createdAt?: Timestamp;
}

// ==================== INTERFACES DE METAS ====================

type MetaPeriodo = 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL';
type MetaTipo = 'GLOBAL' | 'INDIVIDUAL' | 'EQUIPO';

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
  userId?: string;
  teamId?: string;

  // Fechas
  fechaInicio: Timestamp;
  fechaFin: Timestamp;

  activo: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ==================== LABELS Y CONSTANTES ====================

const periodoLabels: Record<MetaPeriodo, string> = {
  'SEMANAL': 'Semanal',
  'MENSUAL': 'Mensual',
  'TRIMESTRAL': 'Trimestral'
};

const tipoLabels: Record<MetaTipo, string> = {
  'GLOBAL': 'Global (Todos)',
  'INDIVIDUAL': 'Individual',
  'EQUIPO': 'Por Equipo'
};

const metricaLabels: Record<MetricaScorecard, string> = {
  'CAC': 'CAC (Costo de Adquisición)',
  'CALIDAD': 'Calidad de Cartera',
  'NIM': 'NIM (Net Interest Margin)',
  'CRECIMIENTO': 'Crecimiento de Portafolio'
};

const metricaDescripciones: Record<MetricaScorecard, string> = {
  'CAC': 'Costo Operativo / Venta Mensual',
  'CALIDAD': 'Calificación entre los clientes que hacen sus primeros pagos y los clientes que no pagan',
  'NIM': 'Pagos hechos por los clientes menos el costo de fondeo y las pérdidas de crédito',
  'CRECIMIENTO': 'Crecimiento del portafolio contra el mes anterior'
};

const Metas: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  // Estados para Metas
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);

  // Estados para Configuración de Métricas del Scorecard
  const [metricas, setMetricas] = useState<ConfiguracionMetrica[]>([]);
  const [metricaDialogOpen, setMetricaDialogOpen] = useState(false);
  const [editingMetrica, setEditingMetrica] = useState<ConfiguracionMetrica | null>(null);

  // Estados para Multiplicadores de Bonos
  const [multiplicadores, setMultiplicadores] = useState<ConfiguracionMultiplicador[]>([]);
  const [multiplicadorDialogOpen, setMultiplicadorDialogOpen] = useState(false);
  const [editingMultiplicador, setEditingMultiplicador] = useState<ConfiguracionMultiplicador | null>(null);

  const [error, setError] = useState<string>('');

  // Form Data para Metas
  const [metaFormData, setMetaFormData] = useState<Omit<Meta, 'id'>>({
    nombre: '',
    descripcion: '',
    tipo: 'GLOBAL',
    periodo: 'SEMANAL',
    llamadasObjetivo: 60,
    colocacionObjetivo: 15000000, // $150,000 MXN
    tasaCierreObjetivo: 25,
    fechaInicio: Timestamp.now(),
    fechaFin: Timestamp.now(),
    activo: true
  });

  // Form Data para Métrica
  const [metricaFormData, setMetricaFormData] = useState<Omit<ConfiguracionMetrica, 'id'>>({
    metrica: 'CAC',
    nombre: '',
    descripcion: '',
    pesoMaximo: 25,
    rangos: [],
    activo: true,
    orden: 1
  });

  // Form Data para Multiplicador
  const [multiplicadorFormData, setMultiplicadorFormData] = useState<Omit<ConfiguracionMultiplicador, 'id'>>({
    puntajeMin: 0,
    puntajeMax: 25,
    multiplicador: 0.25,
    baseSalarial: 1353600, // $13,536 base
    descripcion: '',
    activo: true,
    orden: 1
  });

  useEffect(() => {
    fetchMetas();
    fetchMetricas();
    fetchMultiplicadores();
  }, []);

  // ==================== FETCH FUNCTIONS ====================

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
    }
  };

  const fetchMetricas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'scorecard_metricas'));
      const metricasData: ConfiguracionMetrica[] = [];
      querySnapshot.forEach((doc) => {
        metricasData.push({ id: doc.id, ...doc.data() } as ConfiguracionMetrica);
      });
      setMetricas(metricasData.sort((a, b) => a.orden - b.orden));
    } catch (err) {
      setError('Error al cargar métricas del scorecard');
      console.error(err);
    }
  };

  const fetchMultiplicadores = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'scorecard_multiplicadores'));
      const multiplicadoresData: ConfiguracionMultiplicador[] = [];
      querySnapshot.forEach((doc) => {
        multiplicadoresData.push({ id: doc.id, ...doc.data() } as ConfiguracionMultiplicador);
      });
      setMultiplicadores(multiplicadoresData.sort((a, b) => a.orden - b.orden));
    } catch (err) {
      setError('Error al cargar multiplicadores');
      console.error(err);
    }
  };

  // ==================== HANDLERS PARA METAS ====================

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
        tipo: 'GLOBAL',
        periodo: 'SEMANAL',
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

  // ==================== HANDLERS PARA MÉTRICAS ====================

  const handleOpenMetricaDialog = (metrica?: ConfiguracionMetrica) => {
    if (metrica) {
      setEditingMetrica(metrica);
      setMetricaFormData({
        metrica: metrica.metrica,
        nombre: metrica.nombre,
        descripcion: metrica.descripcion,
        pesoMaximo: metrica.pesoMaximo,
        rangos: metrica.rangos,
        activo: metrica.activo,
        orden: metrica.orden
      });
    } else {
      setEditingMetrica(null);
      setMetricaFormData({
        metrica: 'CAC',
        nombre: '',
        descripcion: '',
        pesoMaximo: 25,
        rangos: [],
        activo: true,
        orden: metricas.length + 1
      });
    }
    setMetricaDialogOpen(true);
  };

  const handleCloseMetricaDialog = () => {
    setMetricaDialogOpen(false);
    setEditingMetrica(null);
    setError('');
  };

  const handleMetricaInputChange = (field: keyof typeof metricaFormData, value: any) => {
    setMetricaFormData({ ...metricaFormData, [field]: value });
  };

  const handleSubmitMetrica = async () => {
    try {
      setError('');

      if (!metricaFormData.nombre) {
        setError('El nombre de la métrica es obligatorio');
        return;
      }

      const dataToSave = {
        ...metricaFormData,
        updatedAt: Timestamp.now(),
        ...(editingMetrica ? {} : { createdAt: Timestamp.now() })
      };

      if (editingMetrica) {
        await updateDoc(doc(db, 'scorecard_metricas', editingMetrica.id), dataToSave);
      } else {
        await addDoc(collection(db, 'scorecard_metricas'), dataToSave);
      }

      await fetchMetricas();
      handleCloseMetricaDialog();
    } catch (err) {
      setError('Error al guardar la métrica');
      console.error(err);
    }
  };

  const handleDeleteMetrica = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta métrica?')) {
      try {
        await deleteDoc(doc(db, 'scorecard_metricas', id));
        await fetchMetricas();
      } catch (err) {
        setError('Error al eliminar la métrica');
        console.error(err);
      }
    }
  };

  // ==================== HANDLERS PARA MULTIPLICADORES ====================

  const handleOpenMultiplicadorDialog = (multiplicador?: ConfiguracionMultiplicador) => {
    if (multiplicador) {
      setEditingMultiplicador(multiplicador);
      setMultiplicadorFormData({
        puntajeMin: multiplicador.puntajeMin,
        puntajeMax: multiplicador.puntajeMax,
        multiplicador: multiplicador.multiplicador,
        baseSalarial: multiplicador.baseSalarial,
        descripcion: multiplicador.descripcion,
        activo: multiplicador.activo,
        orden: multiplicador.orden
      });
    } else {
      setEditingMultiplicador(null);
      setMultiplicadorFormData({
        puntajeMin: 0,
        puntajeMax: 25,
        multiplicador: 0.25,
        baseSalarial: 1353600,
        descripcion: '',
        activo: true,
        orden: multiplicadores.length + 1
      });
    }
    setMultiplicadorDialogOpen(true);
  };

  const handleCloseMultiplicadorDialog = () => {
    setMultiplicadorDialogOpen(false);
    setEditingMultiplicador(null);
    setError('');
  };

  const handleMultiplicadorInputChange = (field: keyof typeof multiplicadorFormData, value: any) => {
    setMultiplicadorFormData({ ...multiplicadorFormData, [field]: value });
  };

  const handleSubmitMultiplicador = async () => {
    try {
      setError('');

      if (multiplicadorFormData.puntajeMin >= multiplicadorFormData.puntajeMax) {
        setError('El puntaje mínimo debe ser menor al máximo');
        return;
      }

      const dataToSave = {
        ...multiplicadorFormData,
        ...(editingMultiplicador ? {} : { createdAt: Timestamp.now() })
      };

      if (editingMultiplicador) {
        await updateDoc(doc(db, 'scorecard_multiplicadores', editingMultiplicador.id), dataToSave);
      } else {
        await addDoc(collection(db, 'scorecard_multiplicadores'), dataToSave);
      }

      await fetchMultiplicadores();
      handleCloseMultiplicadorDialog();
    } catch (err) {
      setError('Error al guardar el multiplicador');
      console.error(err);
    }
  };

  const handleDeleteMultiplicador = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este multiplicador?')) {
      try {
        await deleteDoc(doc(db, 'scorecard_multiplicadores', id));
        await fetchMultiplicadores();
      } catch (err) {
        setError('Error al eliminar el multiplicador');
        console.error(err);
      }
    }
  };

  // ==================== UTILITY FUNCTIONS ====================

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
          <Typography variant="h4">Metas y Scorecard</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Configura metas, métricas del scorecard y bonos para los promotores
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Sistema de Scorecard de Incentivos:</strong> Configuración de las 4 métricas (CAC, CALIDAD, NIM, CRECIMIENTO)
        que determinan el multiplicador de bonos. Los datos se leen desde Firestore colecciones:
        <strong> scorecard_metricas</strong> y <strong>scorecard_multiplicadores</strong>.
      </Alert>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Metas" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="Métricas Scorecard" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="Multiplicadores de Bono" icon={<MonetizationOnIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ==================== TAB 1: METAS ==================== */}
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
                    {metas.filter(m => m.tipo === 'GLOBAL').length}
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
                    {metas.filter(m => m.tipo === 'INDIVIDUAL').length}
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

      {/* ==================== TAB 2: MÉTRICAS SCORECARD ==================== */}
      {tabValue === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Configuración de Métricas del Scorecard</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenMetricaDialog()}
            >
              Nueva Métrica
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            El Scorecard se compone de 4 métricas principales: <strong>CAC</strong> (Costo de Adquisición),
            <strong> CALIDAD</strong> (Calidad de Cartera), <strong> NIM</strong> (Net Interest Margin), y
            <strong> CRECIMIENTO</strong> (Crecimiento de Portafolio). Cada métrica otorga puntos según rangos configurables.
          </Alert>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Métrica</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Peso Máximo</TableCell>
                  <TableCell>Rangos</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metricas.map((metrica) => (
                  <TableRow key={metrica.id}>
                    <TableCell>
                      <Chip
                        label={metrica.metrica}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {metrica.nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {metrica.descripcion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {metrica.pesoMaximo} pts
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {metrica.rangos.length} rangos configurados
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={metrica.activo ? 'Activa' : 'Inactiva'}
                        color={metrica.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenMetricaDialog(metrica)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteMetrica(metrica.id)}>
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

      {/* ==================== TAB 3: MULTIPLICADORES ==================== */}
      {tabValue === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Multiplicadores de Bono</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenMultiplicadorDialog()}
            >
              Nuevo Multiplicador
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            Los multiplicadores determinan el bono final según el puntaje total del Scorecard.
            <strong> Ganancia Mensual = Base Salarial × Multiplicador</strong>. El puntaje total se obtiene
            sumando los puntos de las 4 métricas configuradas.
          </Alert>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rango de Puntaje</TableCell>
                  <TableCell>Multiplicador</TableCell>
                  <TableCell>Base Salarial</TableCell>
                  <TableCell>Ganancia Estimada</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {multiplicadores.map((mult) => (
                  <TableRow key={mult.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {mult.puntajeMin} - {mult.puntajeMax} pts
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${mult.multiplicador}X`}
                        color="secondary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(mult.baseSalarial)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        {formatCurrency(Math.round(mult.baseSalarial * mult.multiplicador))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {mult.descripcion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={mult.activo ? 'Activo' : 'Inactivo'}
                        color={mult.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenMultiplicadorDialog(mult)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteMultiplicador(mult.id)}>
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

      {/* ==================== DIALOG: CREAR/EDITAR META ==================== */}
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
                  placeholder="Ej: Meta Semanal Octubre 2025"
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

      {/* ==================== DIALOG: CREAR/EDITAR MÉTRICA ==================== */}
      <Dialog open={metricaDialogOpen} onClose={handleCloseMetricaDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMetrica ? 'Editar Métrica del Scorecard' : 'Nueva Métrica del Scorecard'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Métrica</InputLabel>
                  <Select
                    value={metricaFormData.metrica}
                    onChange={(e) => {
                      const metrica = e.target.value as MetricaScorecard;
                      handleMetricaInputChange('metrica', metrica);
                      handleMetricaInputChange('descripcion', metricaDescripciones[metrica]);
                    }}
                    label="Métrica"
                  >
                    {Object.entries(metricaLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nombre"
                  fullWidth
                  required
                  value={metricaFormData.nombre}
                  onChange={(e) => handleMetricaInputChange('nombre', e.target.value)}
                  placeholder="Ej: Costo de Adquisición"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Descripción"
                  fullWidth
                  multiline
                  rows={2}
                  value={metricaFormData.descripcion}
                  onChange={(e) => handleMetricaInputChange('descripcion', e.target.value)}
                  placeholder="Descripción de cómo se calcula la métrica"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Peso Máximo (Puntos)"
                  type="number"
                  fullWidth
                  required
                  value={metricaFormData.pesoMaximo}
                  onChange={(e) => handleMetricaInputChange('pesoMaximo', parseInt(e.target.value))}
                  helperText="Puntos máximos que puede otorgar esta métrica"
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Orden"
                  type="number"
                  fullWidth
                  required
                  value={metricaFormData.orden}
                  onChange={(e) => handleMetricaInputChange('orden', parseInt(e.target.value))}
                  helperText="Orden de visualización en el scorecard"
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Nota:</strong> La configuración de rangos (categorías A, B, C, etc.) se implementará
              en una futura actualización. Por ahora, usa los rangos predefinidos en la app.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMetricaDialog}>Cancelar</Button>
          <Button onClick={handleSubmitMetrica} variant="contained">
            {editingMetrica ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== DIALOG: CREAR/EDITAR MULTIPLICADOR ==================== */}
      <Dialog open={multiplicadorDialogOpen} onClose={handleCloseMultiplicadorDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMultiplicador ? 'Editar Multiplicador' : 'Nuevo Multiplicador'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Puntaje Mínimo"
                  type="number"
                  fullWidth
                  required
                  value={multiplicadorFormData.puntajeMin}
                  onChange={(e) => handleMultiplicadorInputChange('puntajeMin', parseInt(e.target.value))}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Puntaje Máximo"
                  type="number"
                  fullWidth
                  required
                  value={multiplicadorFormData.puntajeMax}
                  onChange={(e) => handleMultiplicadorInputChange('puntajeMax', parseInt(e.target.value))}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Multiplicador"
                  type="number"
                  fullWidth
                  required
                  value={multiplicadorFormData.multiplicador}
                  onChange={(e) => handleMultiplicadorInputChange('multiplicador', parseFloat(e.target.value))}
                  helperText={`Multiplicador: ${multiplicadorFormData.multiplicador}X`}
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Base Salarial (MXN)"
                  type="number"
                  fullWidth
                  required
                  value={multiplicadorFormData.baseSalarial / 100}
                  onChange={(e) => handleMultiplicadorInputChange('baseSalarial', parseFloat(e.target.value) * 100)}
                  helperText={formatCurrency(multiplicadorFormData.baseSalarial)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Descripción"
                  fullWidth
                  value={multiplicadorFormData.descripcion}
                  onChange={(e) => handleMultiplicadorInputChange('descripcion', e.target.value)}
                  placeholder="Ej: Multiplicador para puntaje bajo"
                />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info">
                  <strong>Ganancia Estimada:</strong> {formatCurrency(Math.round(multiplicadorFormData.baseSalarial * multiplicadorFormData.multiplicador))}
                  <br />
                  <Typography variant="caption">
                    (Base {formatCurrency(multiplicadorFormData.baseSalarial)} × {multiplicadorFormData.multiplicador}X)
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMultiplicadorDialog}>Cancelar</Button>
          <Button onClick={handleSubmitMultiplicador} variant="contained">
            {editingMultiplicador ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Metas;
