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
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
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

type LeagueStatus = 'PENDING' | 'ACTIVE' | 'FINISHED';

interface LeagueTier {
  id: string;
  name: string;
  code: string; // Código único (ej: BRONCE, ORO, etc.)
  minPoints: number;
  color: string;
  order: number; // Para ordenar los tiers
  createdAt?: Timestamp;
}

interface League {
  id: string;
  tierId: string; // ID del tier en lugar de código hardcodeado
  tierName?: string; // Cache del nombre del tier
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

interface LeagueParticipant {
  id: string;
  leagueId: string;
  userId: string;
  userName: string;
  userEmail: string;
  points: number;
  position: number;
  joinedAt: Timestamp;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
}

const statusLabels: Record<LeagueStatus, string> = {
  'PENDING': 'Pendiente',
  'ACTIVE': 'Activa',
  'FINISHED': 'Finalizada'
};

const statusColors: Record<LeagueStatus, "warning" | "success" | "default"> = {
  'PENDING': 'warning',
  'ACTIVE': 'success',
  'FINISHED': 'default'
};

const Ligas: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [tiers, setTiers] = useState<LeagueTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string>('');

  // Estados para el diálogo de participantes
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [participants, setParticipants] = useState<LeagueParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Estados para el diálogo de tiers
  const [tiersDialogOpen, setTiersDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LeagueTier | null>(null);
  const [tierFormData, setTierFormData] = useState({
    name: '',
    code: '',
    minPoints: 0,
    color: '#16b877',
    order: 0
  });

  const [formData, setFormData] = useState<Omit<League, 'id'>>({
    tierId: '',
    season: 1,
    name: '',
    startDate: Timestamp.now(),
    endDate: Timestamp.now(),
    maxParticipants: 50,
    promotionSpots: 10,
    relegationSpots: 10,
    status: 'PENDING'
  });

  useEffect(() => {
    fetchTiers();
    fetchLeagues();
    fetchUsers();
  }, []);

  const fetchTiers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'leagueTiers'));
      const tiersData: LeagueTier[] = [];
      querySnapshot.forEach((doc) => {
        tiersData.push({ id: doc.id, ...doc.data() } as LeagueTier);
      });
      setTiers(tiersData.sort((a, b) => a.order - b.order));
    } catch (err) {
      console.error('Error al cargar tiers:', err);
    }
  };

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
        tierId: league.tierId,
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
        tierId: tiers.length > 0 ? tiers[0].id : '',
        season: nextSeason,
        name: '',
        startDate: Timestamp.now(),
        endDate: Timestamp.now(),
        maxParticipants: 50,
        promotionSpots: 10,
        relegationSpots: 10,
        status: 'PENDING'
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

      if (!formData.tierId) {
        setError('Debes seleccionar un tier para la liga');
        return;
      }

      if (formData.startDate.seconds >= formData.endDate.seconds) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      // Obtener el nombre del tier para guardarlo en cache
      const tier = getTierById(formData.tierId);
      if (!tier) {
        setError('Tier seleccionado no encontrado');
        return;
      }

      const dataToSave = {
        ...formData,
        tierName: tier.name, // Guardar nombre del tier en cache
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

  // Funciones para gestionar participantes
  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Solo usuarios activos y que no sean admins
        if (data.status === 'ACTIVE' && data.role !== 'ADMIN' && data.role !== 'SUPER_ADMIN') {
          usersData.push({
            id: doc.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            status: data.status
          });
        }
      });
      setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const fetchParticipants = async (leagueId: string) => {
    try {
      const q = query(collection(db, 'leagueParticipants'), where('leagueId', '==', leagueId));
      const querySnapshot = await getDocs(q);
      const participantsData: LeagueParticipant[] = [];
      querySnapshot.forEach((doc) => {
        participantsData.push({ id: doc.id, ...doc.data() } as LeagueParticipant);
      });
      setParticipants(participantsData.sort((a, b) => b.points - a.points));
    } catch (err) {
      console.error('Error al cargar participantes:', err);
      setError('Error al cargar participantes');
    }
  };

  const handleOpenParticipantsDialog = async (league: League) => {
    setSelectedLeague(league);
    await fetchParticipants(league.id);
    setParticipantsDialogOpen(true);
  };

  const handleCloseParticipantsDialog = () => {
    setParticipantsDialogOpen(false);
    setSelectedLeague(null);
    setParticipants([]);
    setSelectedUserId('');
    setError('');
  };

  const handleAddParticipant = async () => {
    if (!selectedUserId || !selectedLeague) return;

    try {
      const user = users.find(u => u.id === selectedUserId);
      if (!user) {
        setError('Usuario no encontrado');
        return;
      }

      // Verificar que no esté ya en la liga
      const existing = participants.find(p => p.userId === selectedUserId);
      if (existing) {
        setError('El usuario ya está en esta liga');
        return;
      }

      // Verificar capacidad máxima
      if (participants.length >= selectedLeague.maxParticipants) {
        setError(`La liga ha alcanzado su capacidad máxima (${selectedLeague.maxParticipants} participantes)`);
        return;
      }

      await addDoc(collection(db, 'leagueParticipants'), {
        leagueId: selectedLeague.id,
        userId: user.id,
        userName: user.displayName,
        userEmail: user.email,
        points: 0,
        position: participants.length + 1,
        joinedAt: Timestamp.now()
      });

      await fetchParticipants(selectedLeague.id);
      setSelectedUserId('');
      setError('');
    } catch (err) {
      console.error('Error al agregar participante:', err);
      setError('Error al agregar participante');
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedLeague) return;

    if (window.confirm('¿Estás seguro de remover este participante de la liga?')) {
      try {
        await deleteDoc(doc(db, 'leagueParticipants', participantId));
        await fetchParticipants(selectedLeague.id);
      } catch (err) {
        console.error('Error al remover participante:', err);
        setError('Error al remover participante');
      }
    }
  };

  // Funciones para gestionar tiers
  const handleOpenTiersDialog = (tier?: LeagueTier) => {
    if (tier) {
      setEditingTier(tier);
      setTierFormData({
        name: tier.name,
        code: tier.code,
        minPoints: tier.minPoints,
        color: tier.color,
        order: tier.order
      });
    } else {
      setEditingTier(null);
      const nextOrder = tiers.length > 0 ? Math.max(...tiers.map(t => t.order)) + 1 : 0;
      setTierFormData({
        name: '',
        code: '',
        minPoints: 0,
        color: '#16b877',
        order: nextOrder
      });
    }
    setTiersDialogOpen(true);
  };

  const handleCloseTiersDialog = () => {
    setTiersDialogOpen(false);
    setEditingTier(null);
    setError('');
  };

  const handleTierInputChange = (field: keyof typeof tierFormData, value: any) => {
    setTierFormData({ ...tierFormData, [field]: value });
  };

  const handleSubmitTier = async () => {
    try {
      setError('');

      if (!tierFormData.name || !tierFormData.code) {
        setError('Nombre y código son obligatorios');
        return;
      }

      if (tierFormData.minPoints < 0) {
        setError('Los puntos mínimos no pueden ser negativos');
        return;
      }

      // Verificar código único (si no es edición o si cambió el código)
      if (!editingTier || (editingTier && editingTier.code !== tierFormData.code)) {
        const existing = tiers.find(t => t.code === tierFormData.code.toUpperCase());
        if (existing) {
          setError('Ya existe un tier con ese código');
          return;
        }
      }

      const dataToSave = {
        name: tierFormData.name,
        code: tierFormData.code.toUpperCase(),
        minPoints: tierFormData.minPoints,
        color: tierFormData.color,
        order: tierFormData.order,
        ...(editingTier ? {} : { createdAt: Timestamp.now() })
      };

      if (editingTier) {
        await updateDoc(doc(db, 'leagueTiers', editingTier.id), dataToSave);
      } else {
        await addDoc(collection(db, 'leagueTiers'), dataToSave);
      }

      await fetchTiers();
      handleCloseTiersDialog();
    } catch (err) {
      setError('Error al guardar el tier');
      console.error(err);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    // Verificar si hay ligas usando este tier
    const leaguesUsingTier = leagues.filter(l => l.tierId === tierId);
    if (leaguesUsingTier.length > 0) {
      setError(`No se puede eliminar: ${leaguesUsingTier.length} liga(s) están usando este tier`);
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar este tier?')) {
      try {
        await deleteDoc(doc(db, 'leagueTiers', tierId));
        await fetchTiers();
      } catch (err) {
        setError('Error al eliminar el tier');
        console.error(err);
      }
    }
  };

  const getTierById = (tierId: string) => {
    return tiers.find(t => t.id === tierId);
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
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<EmojiEventsIcon />}
            onClick={() => handleOpenTiersDialog()}
          >
            Gestionar Tiers
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Liga
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tiers.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>No hay tiers configurados.</strong> Haz clic en "Gestionar Tiers" para crear los tiers de las ligas.
        </Alert>
      )}

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
                {leagues.filter(l => l.status === 'ACTIVE').length}
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
                {tiers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {tiers.length > 0 && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Configuración de Tiers
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenTiersDialog()}
            >
              Nuevo Tier
            </Button>
          </Box>
          <Grid container spacing={1}>
            {tiers.map((tier) => (
              <Grid item key={tier.id}>
                <Chip
                  icon={<EmojiEventsIcon />}
                  label={`${tier.name} (${tier.minPoints.toLocaleString()} pts)`}
                  onDelete={() => handleDeleteTier(tier.id)}
                  onClick={() => handleOpenTiersDialog(tier)}
                  sx={{
                    bgcolor: tier.color,
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

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
                  {(() => {
                    const tier = getTierById(league.tierId);
                    return tier ? (
                      <Chip
                        icon={<EmojiEventsIcon />}
                        label={tier.name}
                        size="small"
                        sx={{
                          bgcolor: tier.color,
                          color: '#fff',
                          fontWeight: 600
                        }}
                      />
                    ) : (
                      <Chip
                        label="Tier no encontrado"
                        size="small"
                        color="error"
                      />
                    );
                  })()}
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
                    color="primary"
                    onClick={() => handleOpenParticipantsDialog(league)}
                    title="Ver/Gestionar Participantes"
                  >
                    <PeopleIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(league)}
                    title="Editar Liga"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(league.id)}
                    title="Eliminar Liga"
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
                    value={formData.tierId}
                    onChange={(e) => handleInputChange('tierId', e.target.value)}
                    label="Tier"
                  >
                    {tiers.length === 0 ? (
                      <MenuItem value="" disabled>
                        No hay tiers disponibles
                      </MenuItem>
                    ) : (
                      tiers.map((tier) => (
                        <MenuItem key={tier.id} value={tier.id}>
                          {tier.name} ({tier.minPoints.toLocaleString()} pts mínimo)
                        </MenuItem>
                      ))
                    )}
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

      {/* Diálogo de Gestión de Tiers */}
      <Dialog open={tiersDialogOpen} onClose={handleCloseTiersDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTier ? 'Editar Tier' : 'Nuevo Tier'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre del Tier"
              fullWidth
              required
              value={tierFormData.name}
              onChange={(e) => handleTierInputChange('name', e.target.value)}
              placeholder="Ej: Bronce, Plata, Oro..."
              helperText="Nombre visible del tier"
            />
            <TextField
              label="Código"
              fullWidth
              required
              value={tierFormData.code}
              onChange={(e) => handleTierInputChange('code', e.target.value.toUpperCase())}
              placeholder="Ej: BRONCE, ORO"
              helperText="Código único en mayúsculas (ej: BRONCE, ORO, PLATINO)"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField
              label="Puntos Mínimos"
              type="number"
              fullWidth
              required
              value={tierFormData.minPoints}
              onChange={(e) => handleTierInputChange('minPoints', parseInt(e.target.value) || 0)}
              placeholder="0"
              helperText="Puntos necesarios para acceder a este tier"
              inputProps={{ min: 0 }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Color del Tier
              </Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField
                  type="color"
                  value={tierFormData.color}
                  onChange={(e) => handleTierInputChange('color', e.target.value)}
                  sx={{ width: '80px' }}
                />
                <Chip
                  icon={<EmojiEventsIcon />}
                  label={tierFormData.name || 'Vista Previa'}
                  sx={{
                    bgcolor: tierFormData.color,
                    color: '#fff',
                    fontWeight: 'bold',
                    flex: 1
                  }}
                />
              </Box>
            </Box>
            <TextField
              label="Orden"
              type="number"
              fullWidth
              required
              value={tierFormData.order}
              onChange={(e) => handleTierInputChange('order', parseInt(e.target.value) || 0)}
              placeholder="0"
              helperText="Orden de clasificación (0 = más bajo, mayor = más alto)"
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTiersDialog}>Cancelar</Button>
          <Button onClick={handleSubmitTier} variant="contained">
            {editingTier ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Participantes */}
      <Dialog open={participantsDialogOpen} onClose={handleCloseParticipantsDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PeopleIcon color="primary" />
            <Box>
              <Typography variant="h6">
                Participantes: {selectedLeague?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {participants.length} / {selectedLeague?.maxParticipants} participantes
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Formulario para agregar participantes */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Agregar Participante
            </Typography>
            <Box display="flex" gap={2} alignItems="flex-start">
              <FormControl fullWidth>
                <InputLabel>Seleccionar Usuario</InputLabel>
                <Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  label="Seleccionar Usuario"
                  disabled={participants.length >= (selectedLeague?.maxParticipants || 0)}
                >
                  <MenuItem value="">
                    <em>Seleccione un usuario...</em>
                  </MenuItem>
                  {users
                    .filter(u => !participants.find(p => p.userId === u.id))
                    .map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.displayName} ({user.email})
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleAddParticipant}
                disabled={!selectedUserId || participants.length >= (selectedLeague?.maxParticipants || 0)}
                sx={{ minWidth: '140px', height: '56px' }}
              >
                Agregar
              </Button>
            </Box>
            {participants.length >= (selectedLeague?.maxParticipants || 0) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                La liga ha alcanzado su capacidad máxima
              </Alert>
            )}
          </Box>

          {/* Lista de participantes */}
          {participants.length === 0 ? (
            <Alert severity="info">
              No hay participantes en esta liga. Usa el formulario arriba para agregar usuarios.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Posición</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">Puntos</TableCell>
                    <TableCell align="center">Fecha Ingreso</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {participants.map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color={index === 0 ? 'success' : index === 1 ? 'info' : index === 2 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {participant.userName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {participant.userEmail}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>
                          {participant.points.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption">
                          {participant.joinedAt.toDate().toLocaleDateString('es-MX')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          title="Remover de la liga"
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseParticipantsDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Ligas;
