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
  
  
  Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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

// ==================== INTERFACES DE METAS ====================

type MetaPeriodo = 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL';
type MetaTipo = 'GLOBAL' | 'LIGA' | 'USUARIO' | 'KIOSCO';

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

  // Asignación dinámica
  targetIds?: string[];        // IDs de ligas, usuarios o kioscos
  targetNames?: string[];      // Nombres para mostrar en UI

  // Fechas
  fechaInicio: Timestamp;
  fechaFin: Timestamp;

  activo: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Interfaces auxiliares para datos de Firestore
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
// ==================== LABELS Y CONSTANTES ====================

const periodoLabels: Record<MetaPeriodo, string> = {
  'SEMANAL': 'Semanal',
  'MENSUAL': 'Mensual',
  'TRIMESTRAL': 'Trimestral'
};

const tipoLabels: Record<MetaTipo, string> = {
  'GLOBAL': 'Todos los Promotores',
  'LIGA': 'Por Liga',
  'USUARIO': 'Por Promotor Específico',
  'KIOSCO': 'Por Kiosco Específico'
};

const Metas: React.FC = () => {
  // Estados para Metas
  // Estados para Metas
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  // Estados para datos dinámicos
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [error, setError] = useState<string>('');
  // Form Data para Metas
  const [metaFormData, setMetaFormData] = useState<Omit<Meta, 'id'>>({
    nombre: '',
    descripcion: '',
    tipo: 'GLOBAL',
    periodo: 'SEMANAL',
    llamadasObjetivo: 0,
    colocacionObjetivo: 0,
    tasaCierreObjetivo: 0,
    targetIds: [],
    targetNames: [],
    fechaInicio: Timestamp.now(),
    fechaFin: Timestamp.now(),
    activo: true
  });

  useEffect(() => {
    console.log('🚀 Metas v3.0 - Con selección dinámica de ligas/usuarios/kioscos');
    fetchMetas();
    fetchKiosks();
    fetchUsers();
    fetchLeagues();
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
        targetIds: meta.targetIds || [],
        targetNames: meta.targetNames || [],
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
        llamadasObjetivo: 0,
        colocacionObjetivo: 0,
        tasaCierreObjetivo: 0,
        targetIds: [],
        targetNames: [],
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
    if (field === 'tipo') {
      // Clear targetIds and targetNames when changing tipo
      setMetaFormData({
        ...metaFormData,
        [field]: value,
        targetIds: [],
        targetNames: []
      });
    } else {
      setMetaFormData({ ...metaFormData, [field]: value });
    }
  };

  const handleSubmitMeta = async () => {
    try {
      setError('');

      if (!metaFormData.nombre) {
        setError('El nombre de la meta es obligatorio');
        return;
      }

      // Validar que si el tipo no es GLOBAL, se seleccionaron targets
      if (metaFormData.tipo !== 'GLOBAL' && (!metaFormData.targetIds || metaFormData.targetIds.length === 0)) {
        setError('Debes seleccionar al menos un objetivo cuando el tipo no es "Todos los Promotores"');
        return;
      }

      // Preparar datos
      const dataToSave: any = {
        nombre: metaFormData.nombre,
        descripcion: metaFormData.descripcion,
        tipo: metaFormData.tipo,
        periodo: metaFormData.periodo,
        llamadasObjetivo: metaFormData.llamadasObjetivo,
        colocacionObjetivo: metaFormData.colocacionObjetivo,
        tasaCierreObjetivo: metaFormData.tasaCierreObjetivo,
        fechaInicio: metaFormData.fechaInicio,
        fechaFin: metaFormData.fechaFin,
        activo: metaFormData.activo,
        updatedAt: Timestamp.now()
      };

      // Agregar targetIds y targetNames si tienen valores
      if (metaFormData.targetIds && metaFormData.targetIds.length > 0) {
        dataToSave.targetIds = metaFormData.targetIds;
        dataToSave.targetNames = metaFormData.targetNames;
      }

      if (!editingMeta) {
        dataToSave.createdAt = Timestamp.now();
      }

      console.log('💾 Guardando meta:', dataToSave);

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
          <Typography variant="h4">Metas</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Configura metas para los promotores
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ==================== METAS ==================== */}
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
                    Metas por Liga
                  </Typography>
                  <Typography variant="h4">
                    {metas.filter(m => m.tipo === 'LIGA').length}
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
                      {meta.targetNames && meta.targetNames.length > 0 && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {meta.targetNames.join(', ')}
                        </Typography>
                      )}
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
    </Box>
  );
};

export default Metas;
