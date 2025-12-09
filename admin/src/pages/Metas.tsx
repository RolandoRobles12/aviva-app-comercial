import React, { useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  collection,
  getDocs,
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
  const [metas, setMetas] = useState<Meta[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('🚀 Metas v3.0 - Con selección dinámica de ligas/usuarios/kioscos');
    fetchMetas();
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
  // ==================== HANDLERS PARA METAS ====================

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
            {/* Meta creation/editing removed - functionality handled elsewhere */}
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
