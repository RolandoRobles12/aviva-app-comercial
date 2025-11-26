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
  CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
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

// Coincide con League.kt
enum LeagueTier {
  BRONCE = 'BRONCE',
  PLATA = 'PLATA',
  ORO = 'ORO',
  PLATINO = 'PLATINO',
  DIAMANTE = 'DIAMANTE',
  MASTER = 'MASTER',
  LEYENDA = 'LEYENDA'
}

enum LeagueStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED'
}

interface League {
  id: string;
  tier: LeagueTier;
  season: number;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  maxParticipants: number;
  promotionSpots: number;
  relegationSpots: number;
  status: LeagueStatus;
  createdAt?: Timestamp;
}

const tierLabels: Record<LeagueTier, string> = {
  [LeagueTier.BRONCE]: 'Bronce',
  [LeagueTier.PLATA]: 'Plata',
  [LeagueTier.ORO]: 'Oro',
  [LeagueTier.PLATINO]: 'Platino',
  [LeagueTier.DIAMANTE]: 'Diamante',
  [LeagueTier.MASTER]: 'Master',
  [LeagueTier.LEYENDA]: 'Leyenda'
};

const tierColors: Record<LeagueTier, string> = {
  [LeagueTier.BRONCE]: '#CD7F32',
  [LeagueTier.PLATA]: '#C0C0C0',
  [LeagueTier.ORO]: '#FFD700',
  [LeagueTier.PLATINO]: '#E5E4E2',
  [LeagueTier.DIAMANTE]: '#B9F2FF',
  [LeagueTier.MASTER]: '#FF1744',
  [LeagueTier.LEYENDA]: '#9C27B0'
};

const tierMinPoints: Record<LeagueTier, number> = {
  [LeagueTier.BRONCE]: 0,
  [LeagueTier.PLATA]: 1000,
  [LeagueTier.ORO]: 2500,
  [LeagueTier.PLATINO]: 5000,
  [LeagueTier.DIAMANTE]: 10000,
  [LeagueTier.MASTER]: 20000,
  [LeagueTier.LEYENDA]: 50000
};

const statusLabels: Record<LeagueStatus, string> = {
  [LeagueStatus.PENDING]: 'Pendiente',
  [LeagueStatus.ACTIVE]: 'Activa',
  [LeagueStatus.FINISHED]: 'Finalizada'
};

const statusColors: Record<LeagueStatus, "warning" | "success" | "default"> = {
  [LeagueStatus.PENDING]: 'warning',
  [LeagueStatus.ACTIVE]: 'success',
  [LeagueStatus.FINISHED]: 'default'
};

const Ligas: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<Omit<League, 'id'>>({
    tier: LeagueTier.BRONCE,
    season: 1,
    name: '',
    startDate: Timestamp.now(),
    endDate: Timestamp.now(),
    maxParticipants: 50,
    promotionSpots: 10,
    relegationSpots: 10,
    status: LeagueStatus.PENDING
  });

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'leagues'));
      const leaguesData: League[] = [];
      querySnapshot.forEach((doc) => {
        leaguesData.push({ id: doc.id, ...doc.data() } as League);
      });
      setLeagues(leaguesData.sort((a, b) => b.season - a.season));
    } catch (err) {
      setError('Error al cargar ligas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (league?: League) => {
    if (league) {
      setEditingLeague(league);
      setFormData({
        tier: league.tier,
        season: league.season,
        name: league.name,
        startDate: league.startDate,
        endDate: league.endDate,
        maxParticipants: league.maxParticipants,
        promotionSpots: league.promotionSpots,
        relegationSpots: league.relegationSpots,
        status: league.status
      });
    } else {
      setEditingLeague(null);
      const nextSeason = leagues.length > 0 ? Math.max(...leagues.map(l => l.season)) + 1 : 1;
      setFormData({
        tier: LeagueTier.BRONCE,
        season: nextSeason,
        name: '',
        startDate: Timestamp.now(),
        endDate: Timestamp.now(),
        maxParticipants: 50,
        promotionSpots: 10,
        relegationSpots: 10,
        status: LeagueStatus.PENDING
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLeague(null);
    setError('');
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.name) {
        setError('El nombre de la liga es obligatorio');
        return;
      }

      if (formData.startDate.seconds >= formData.endDate.seconds) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      const dataToSave = {
        ...formData,
        ...(editingLeague ? {} : { createdAt: Timestamp.now() })
      };

      if (editingLeague) {
        await updateDoc(doc(db, 'leagues', editingLeague.id), dataToSave);
      } else {
        await addDoc(collection(db, 'leagues'), dataToSave);
      }

      await fetchLeagues();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la liga');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta liga? Se perderán todos los participantes y estadísticas.')) {
      try {
        await deleteDoc(doc(db, 'leagues', id));
        await fetchLeagues();
      } catch (err) {
        setError('Error al eliminar la liga');
        console.error(err);
      }
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('es-MX');
  };

  if (loading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Administración de Ligas</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Gestiona las ligas de competencia y temporadas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Liga
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Sistema de Ligas hardcodeado en League.kt (líneas 40-52):</strong>
        <br />
        7 tiers: Bronce (0 pts), Plata (1K), Oro (2.5K), Platino (5K), Diamante (10K), Master (20K), Leyenda (50K)
        <br />
        <strong>Para aplicar:</strong> La app Android debe leer configuración dinámica de Firestore.
      </Alert>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Ligas
              </Typography>
              <Typography variant="h4">
                {leagues.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Ligas Activas
              </Typography>
              <Typography variant="h4">
                {leagues.filter(l => l.status === LeagueStatus.ACTIVE).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Temporada Actual
              </Typography>
              <Typography variant="h4">
                {leagues.length > 0 ? Math.max(...leagues.map(l => l.season)) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tiers Disponibles
              </Typography>
              <Typography variant="h4">
                {Object.keys(tierLabels).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Configuración de Tiers
        </Typography>
        <Grid container spacing={1}>
          {Object.entries(tierLabels).map(([key, label]) => (
            <Grid item key={key}>
              <Chip
                icon={<EmojiEventsIcon />}
                label={`${label} (${tierMinPoints[key as LeagueTier].toLocaleString()} pts)`}
                sx={{
                  bgcolor: tierColors[key as LeagueTier],
                  color: key === 'BRONCE' || key === 'PLATINO' || key === 'DIAMANTE' ? '#000' : '#fff',
                  fontWeight: 'bold'
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Temporada</TableCell>
              <TableCell>Período</TableCell>
              <TableCell>Participantes</TableCell>
              <TableCell>Ascensos/Descensos</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leagues.map((league) => (
              <TableRow key={league.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {league.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={<EmojiEventsIcon />}
                    label={tierLabels[league.tier]}
                    size="small"
                    sx={{
                      bgcolor: tierColors[league.tier],
                      color: ['BRONCE', 'PLATINO', 'DIAMANTE'].includes(league.tier) ? '#000' : '#fff'
                    }}
                  />
                </TableCell>
                <TableCell>Temporada {league.season}</TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {formatDate(league.startDate)} - {formatDate(league.endDate)}
                  </Typography>
                </TableCell>
                <TableCell>
                  Max: {league.maxParticipants}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    ↑ {league.promotionSpots} / ↓ {league.relegationSpots}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[league.status]}
                    color={statusColors[league.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(league)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(league.id)}
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
          {editingLeague ? 'Editar Liga' : 'Nueva Liga'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Nombre de la Liga"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Liga Bronce - Temporada 1"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tier</InputLabel>
                  <Select
                    value={formData.tier}
                    onChange={(e) => handleInputChange('tier', e.target.value)}
                    label="Tier"
                  >
                    {Object.entries(tierLabels).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label} ({tierMinPoints[key as LeagueTier].toLocaleString()} pts mínimo)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Temporada"
                  type="number"
                  fullWidth
                  required
                  value={formData.season}
                  onChange={(e) => handleInputChange('season', parseInt(e.target.value))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Fecha de Inicio"
                  type="date"
                  fullWidth
                  required
                  value={formData.startDate.toDate().toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('startDate', Timestamp.fromDate(new Date(e.target.value)))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Fecha de Fin"
                  type="date"
                  fullWidth
                  required
                  value={formData.endDate.toDate().toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('endDate', Timestamp.fromDate(new Date(e.target.value)))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Máximo de Participantes"
                  type="number"
                  fullWidth
                  required
                  value={formData.maxParticipants}
                  onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                  inputProps={{ min: 1 }}
                  helperText="Capacidad máxima de la liga"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Plazas de Ascenso"
                  type="number"
                  fullWidth
                  required
                  value={formData.promotionSpots}
                  onChange={(e) => handleInputChange('promotionSpots', parseInt(e.target.value))}
                  inputProps={{ min: 0 }}
                  helperText="Top N ascienden"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Plazas de Descenso"
                  type="number"
                  fullWidth
                  required
                  value={formData.relegationSpots}
                  onChange={(e) => handleInputChange('relegationSpots', parseInt(e.target.value))}
                  inputProps={{ min: 0 }}
                  helperText="Bottom N descienden"
                />
              </Grid>
              <Grid item xs={12}>
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
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingLeague ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Ligas;
