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
  Select,
  FormControl,
  InputLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Scorecard {
  id: string;
  userId: string;
  userEmail: string;
  nombreUsuario: string;
  mes: string; // formato: "octubre_2025"
  mesDisplay: string; // formato: "Octubre 2025"

  // CAC
  cac_metricas: string;
  cac_resultado: string;
  cac_categoria: string;
  cac_puntaje: string;

  // Calidad
  calidad_metricas: string;
  calidad_resultado: string;
  calidad_categoria: string;
  calidad_puntaje: string;

  // NIM
  nim_metricas: string;
  nim_resultado: string;
  nim_categoria: string;
  nim_puntaje: string;

  // Crecimiento
  crecimiento_metricas: string;
  crecimiento_resultado: string;
  crecimiento_categoria: string;
  crecimiento_puntaje: string;

  // Totales
  puntajeTotal: string;
  multiplicador: string;
  gananciaMensual: string;

  // Metadata
  fechaActualizacion?: Date;
  actualizadoPor?: string;
}

interface User {
  id: string;
  email: string;
  nombre: string;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const AÑOS = ['2024', '2025', '2026'];

const Bonos: React.FC = () => {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScorecard, setEditingScorecard] = useState<Scorecard | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Form fields
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedAño, setSelectedAño] = useState('2025');

  const [cacMetricas, setCacMetricas] = useState('');
  const [cacResultado, setCacResultado] = useState('');
  const [cacCategoria, setCacCategoria] = useState('');
  const [cacPuntaje, setCacPuntaje] = useState('');

  const [calidadMetricas, setCalidadMetricas] = useState('');
  const [calidadResultado, setCalidadResultado] = useState('');
  const [calidadCategoria, setCalidadCategoria] = useState('');
  const [calidadPuntaje, setCalidadPuntaje] = useState('');

  const [nimMetricas, setNimMetricas] = useState('');
  const [nimResultado, setNimResultado] = useState('');
  const [nimCategoria, setNimCategoria] = useState('');
  const [nimPuntaje, setNimPuntaje] = useState('');

  const [crecimientoMetricas, setCrecimientoMetricas] = useState('');
  const [crecimientoResultado, setCrecimientoResultado] = useState('');
  const [crecimientoCategoria, setCrecimientoCategoria] = useState('');
  const [crecimientoPuntaje, setCrecimientoPuntaje] = useState('');

  const [puntajeTotal, setPuntajeTotal] = useState('');
  const [multiplicador, setMultiplicador] = useState('');
  const [gananciaMensual, setGananciaMensual] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchScorecards(), fetchUsers()]);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecards = async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'scorecards'), orderBy('fechaActualizacion', 'desc'))
      );
      const scorecardsData: Scorecard[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scorecardsData.push({
          id: doc.id,
          ...data,
          fechaActualizacion: data.fechaActualizacion?.toDate()
        } as Scorecard);
      });
      setScorecards(scorecardsData);
    } catch (err) {
      console.error('Error fetching scorecards:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          email: data.email,
          nombre: data.nombre || data.email
        });
      });
      setUsers(usersData.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleOpenDialog = (scorecard?: Scorecard) => {
    if (scorecard) {
      // Editing existing scorecard
      setEditingScorecard(scorecard);
      const [mes, año] = scorecard.mes.split('_');

      setSelectedUserId(scorecard.userId);
      setSelectedMes(mes);
      setSelectedAño(año);

      setCacMetricas(scorecard.cac_metricas);
      setCacResultado(scorecard.cac_resultado);
      setCacCategoria(scorecard.cac_categoria);
      setCacPuntaje(scorecard.cac_puntaje);

      setCalidadMetricas(scorecard.calidad_metricas);
      setCalidadResultado(scorecard.calidad_resultado);
      setCalidadCategoria(scorecard.calidad_categoria);
      setCalidadPuntaje(scorecard.calidad_puntaje);

      setNimMetricas(scorecard.nim_metricas);
      setNimResultado(scorecard.nim_resultado);
      setNimCategoria(scorecard.nim_categoria);
      setNimPuntaje(scorecard.nim_puntaje);

      setCrecimientoMetricas(scorecard.crecimiento_metricas);
      setCrecimientoResultado(scorecard.crecimiento_resultado);
      setCrecimientoCategoria(scorecard.crecimiento_categoria);
      setCrecimientoPuntaje(scorecard.crecimiento_puntaje);

      setPuntajeTotal(scorecard.puntajeTotal);
      setMultiplicador(scorecard.multiplicador);
      setGananciaMensual(scorecard.gananciaMensual);
    } else {
      // New scorecard
      setEditingScorecard(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedUserId('');
    setSelectedMes('');
    setSelectedAño('2025');

    setCacMetricas('');
    setCacResultado('');
    setCacCategoria('');
    setCacPuntaje('');

    setCalidadMetricas('');
    setCalidadResultado('');
    setCalidadCategoria('');
    setCalidadPuntaje('');

    setNimMetricas('');
    setNimResultado('');
    setNimCategoria('');
    setNimPuntaje('');

    setCrecimientoMetricas('');
    setCrecimientoResultado('');
    setCrecimientoCategoria('');
    setCrecimientoPuntaje('');

    setPuntajeTotal('');
    setMultiplicador('');
    setGananciaMensual('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError('');
    setSuccess('');
    setEditingScorecard(null);
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccess('');

      if (!selectedUserId || !selectedMes || !selectedAño) {
        setError('Debes seleccionar usuario, mes y año');
        return;
      }

      const user = users.find(u => u.id === selectedUserId);
      if (!user) {
        setError('Usuario no encontrado');
        return;
      }

      const mes = `${selectedMes}_${selectedAño}`;
      const mesDisplay = `${selectedMes.charAt(0).toUpperCase() + selectedMes.slice(1)} ${selectedAño}`;

      const scorecardData = {
        userId: selectedUserId,
        userEmail: user.email,
        nombreUsuario: user.nombre,
        mes,
        mesDisplay,

        cac_metricas: cacMetricas,
        cac_resultado: cacResultado,
        cac_categoria: cacCategoria,
        cac_puntaje: cacPuntaje,

        calidad_metricas: calidadMetricas,
        calidad_resultado: calidadResultado,
        calidad_categoria: calidadCategoria,
        calidad_puntaje: calidadPuntaje,

        nim_metricas: nimMetricas,
        nim_resultado: nimResultado,
        nim_categoria: nimCategoria,
        nim_puntaje: nimPuntaje,

        crecimiento_metricas: crecimientoMetricas,
        crecimiento_resultado: crecimientoResultado,
        crecimiento_categoria: crecimientoCategoria,
        crecimiento_puntaje: crecimientoPuntaje,

        puntajeTotal,
        multiplicador,
        gananciaMensual,

        fechaActualizacion: new Date(),
        actualizadoPor: 'admin' // TODO: usar email del admin actual
      };

      if (editingScorecard) {
        // Update existing
        await updateDoc(doc(db, 'scorecards', editingScorecard.id), scorecardData);
        setSuccess('Scorecard actualizado exitosamente');
      } else {
        // Create new
        await addDoc(collection(db, 'scorecards'), scorecardData);
        setSuccess('Scorecard creado exitosamente');
      }

      await fetchScorecards();
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (err) {
      setError('Error al guardar scorecard');
      console.error(err);
    }
  };

  const handleDelete = async (id: string, nombreUsuario: string, mesDisplay: string) => {
    if (window.confirm(`¿Eliminar scorecard de ${nombreUsuario} para ${mesDisplay}?`)) {
      try {
        await deleteDoc(doc(db, 'scorecards', id));
        await fetchScorecards();
        setSuccess('Scorecard eliminado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Error al eliminar scorecard');
        console.error(err);
      }
    }
  };

  if (loading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Bonos - Scorecards</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Configura los bonos y métricas para cada vendedor por mes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Agregar Scorecard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vendedor</TableCell>
              <TableCell>Mes</TableCell>
              <TableCell>Puntaje Total</TableCell>
              <TableCell>Multiplicador</TableCell>
              <TableCell>Ganancia Mensual</TableCell>
              <TableCell>Última Actualización</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scorecards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    No hay scorecards configurados. Agrega uno para comenzar.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              scorecards.map((scorecard) => (
                <TableRow key={scorecard.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <MonetizationOnIcon fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {scorecard.nombreUsuario}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {scorecard.userEmail}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={scorecard.mesDisplay} color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={scorecard.puntajeTotal} color="success" />
                  </TableCell>
                  <TableCell>
                    <strong>{scorecard.multiplicador}</strong>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {scorecard.gananciaMensual}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {scorecard.fechaActualizacion
                      ? scorecard.fechaActualizacion.toLocaleDateString('es-MX')
                      : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(scorecard)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(scorecard.id, scorecard.nombreUsuario, scorecard.mesDisplay)}
                    >
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
          {editingScorecard ? 'Editar Scorecard' : 'Nuevo Scorecard'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            {/* Usuario, Mes y Año */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Vendedor</InputLabel>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    label="Vendedor"
                    disabled={!!editingScorecard}
                  >
                    {users.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Mes</InputLabel>
                  <Select
                    value={selectedMes}
                    onChange={(e) => setSelectedMes(e.target.value)}
                    label="Mes"
                    disabled={!!editingScorecard}
                  >
                    {MESES.map(mes => (
                      <MenuItem key={mes} value={mes}>
                        {mes.charAt(0).toUpperCase() + mes.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Año</InputLabel>
                  <Select
                    value={selectedAño}
                    onChange={(e) => setSelectedAño(e.target.value)}
                    label="Año"
                    disabled={!!editingScorecard}
                  >
                    {AÑOS.map(año => (
                      <MenuItem key={año} value={año}>
                        {año}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider />

            {/* Métricas en Accordions */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">CAC (Costo Operativo / Venta Mensual)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Métricas"
                      fullWidth
                      multiline
                      rows={2}
                      value={cacMetricas}
                      onChange={(e) => setCacMetricas(e.target.value)}
                      placeholder="$68,520/\n$553,000"
                      helperText="Formato: Costo / Venta"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Resultado"
                      fullWidth
                      value={cacResultado}
                      onChange={(e) => setCacResultado(e.target.value)}
                      placeholder="12.4%"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Categoría"
                      fullWidth
                      value={cacCategoria}
                      onChange={(e) => setCacCategoria(e.target.value)}
                      placeholder="B"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Puntaje"
                      fullWidth
                      value={cacPuntaje}
                      onChange={(e) => setCacPuntaje(e.target.value)}
                      placeholder="25"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">CALIDAD (Pagos y Performance)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Métricas"
                      fullWidth
                      multiline
                      rows={2}
                      value={calidadMetricas}
                      onChange={(e) => setCalidadMetricas(e.target.value)}
                      placeholder="Pagos completados: 73%\nPrimeros pagos no hechos: 7.6%"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Resultado"
                      fullWidth
                      value={calidadResultado}
                      onChange={(e) => setCalidadResultado(e.target.value)}
                      placeholder="8.0"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Categoría"
                      fullWidth
                      value={calidadCategoria}
                      onChange={(e) => setCalidadCategoria(e.target.value)}
                      placeholder="B"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Puntaje"
                      fullWidth
                      value={calidadPuntaje}
                      onChange={(e) => setCalidadPuntaje(e.target.value)}
                      placeholder="15"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">NIM (Net Interest Margin)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Métricas"
                      fullWidth
                      multiline
                      rows={2}
                      value={nimMetricas}
                      onChange={(e) => setNimMetricas(e.target.value)}
                      placeholder="Ingresos: $382,111\nPérdidas: $143,041\nFondeo: $70,766"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Resultado"
                      fullWidth
                      value={nimResultado}
                      onChange={(e) => setNimResultado(e.target.value)}
                      placeholder="44%"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Categoría"
                      fullWidth
                      value={nimCategoria}
                      onChange={(e) => setNimCategoria(e.target.value)}
                      placeholder="B"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Puntaje"
                      fullWidth
                      value={nimPuntaje}
                      onChange={(e) => setNimPuntaje(e.target.value)}
                      placeholder="5"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">CRECIMIENTO (Growth)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Métricas"
                      fullWidth
                      multiline
                      rows={2}
                      value={crecimientoMetricas}
                      onChange={(e) => setCrecimientoMetricas(e.target.value)}
                      placeholder="Portafolio Sep: 4.5M\nPortafolio Oct: 4.9M"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Resultado"
                      fullWidth
                      value={crecimientoResultado}
                      onChange={(e) => setCrecimientoResultado(e.target.value)}
                      placeholder="9.0%"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Categoría"
                      fullWidth
                      value={crecimientoCategoria}
                      onChange={(e) => setCrecimientoCategoria(e.target.value)}
                      placeholder="2"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Puntaje"
                      fullWidth
                      value={crecimientoPuntaje}
                      onChange={(e) => setCrecimientoPuntaje(e.target.value)}
                      placeholder="5"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Divider />

            {/* Totales */}
            <Box>
              <Typography variant="h6" mb={2}>Totales y Bonos</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Puntaje Total"
                    fullWidth
                    required
                    value={puntajeTotal}
                    onChange={(e) => setPuntajeTotal(e.target.value)}
                    placeholder="50"
                    helperText="Suma de todos los puntajes"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Multiplicador"
                    fullWidth
                    required
                    value={multiplicador}
                    onChange={(e) => setMultiplicador(e.target.value)}
                    placeholder="0.5X"
                    helperText="Ej: 0.5X, 1.0X, 1.5X"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Ganancia Mensual"
                    fullWidth
                    required
                    value={gananciaMensual}
                    onChange={(e) => setGananciaMensual(e.target.value)}
                    placeholder="$6,768"
                    helperText="Monto del bono"
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingScorecard ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bonos;
