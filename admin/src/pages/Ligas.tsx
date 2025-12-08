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
  FormControlLabel,
  Autocomplete,
  Stack,
  Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
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
  League,
  LeagueFormData
} from '../types/league';
import {
  LeagueStatus
} from '../types/league';

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

const Ligas: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    description: '',
    color: '#16b877',
    icon: '🏆',
    members: [],
    active: true,
    season: 1,
    status: LeagueStatus.ACTIVE
  });

  useEffect(() => {
    fetchLeagues();
    fetchUsers();
  }, []);

  const fetchLeagues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'leagues'));
      const leaguesData: League[] = [];
      querySnapshot.forEach((doc) => {
        leaguesData.push({ id: doc.id, ...doc.data() } as League);
      });
      setLeagues(leaguesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError('Error al cargar ligas');
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
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
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const handleOpenDialog = (league?: League) => {
    if (league) {
      setEditingLeague(league);
      setFormData({
        name: league.name,
        description: league.description || '',
        color: league.color || '#16b877',
        icon: league.icon || '🏆',
        members: league.members,
        active: league.active,
        season: league.season || 1,
        status: league.status || LeagueStatus.ACTIVE
      });
    } else {
      setEditingLeague(null);
      setFormData({
        name: '',
        description: '',
        color: '#16b877',
        icon: '🏆',
        members: [],
        active: true,
        season: 1,
        status: LeagueStatus.ACTIVE
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLeague(null);
    setError('');
  };

  const handleInputChange = (field: keyof LeagueFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      // Validaciones
      if (!formData.name.trim()) {
        setError('El nombre de la liga es obligatorio');
        return;
      }

      if (formData.members.length < 2) {
        setError('Una liga debe tener al menos 2 miembros');
        return;
      }

      // Preparar datos para guardar
      const dataToSave: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        color: formData.color || '#16b877',
        icon: formData.icon || '🏆',
        members: formData.members,
        active: formData.active,
        season: formData.season || 1,
        updatedAt: Timestamp.now(),
        createdBy: 'admin',
        ...(editingLeague ? {} : { createdAt: Timestamp.now() }),
        // SIEMPRE guardar status para que Android pueda encontrar la liga
        status: formData.active ? 'ACTIVE' : 'PENDING'
      };

      let leagueId: string;

      if (editingLeague) {
        await updateDoc(doc(db, 'leagues', editingLeague.id), dataToSave);
        leagueId = editingLeague.id;
      } else {
        const docRef = await addDoc(collection(db, 'leagues'), dataToSave);
        leagueId = docRef.id;
      }

      // Sincronizar participantes en la colección leagueParticipants para Android
      await syncLeagueParticipants(leagueId, formData.members);

      await fetchLeagues();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la liga');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta liga?')) {
      try {
        await deleteDoc(doc(db, 'leagues', id));
        await fetchLeagues();
      } catch (err) {
        setError('Error al eliminar la liga');
        console.error(err);
      }
    }
  };

  /**
   * Sincroniza los participantes de una liga con la colección leagueParticipants
   * que usa la app Android
   */
  const syncLeagueParticipants = async (leagueId: string, memberIds: string[]) => {
    try {
      // Obtener participantes actuales
      const participantsSnapshot = await getDocs(
        collection(db, 'leagueParticipants')
      );

      const existingParticipants = new Map<string, any>();
      participantsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.leagueId === leagueId) {
          existingParticipants.set(data.userId, { id: doc.id, ...data });
        }
      });

      // Agregar o actualizar participantes
      for (const userId of memberIds) {
        const existing = existingParticipants.get(userId);

        if (!existing) {
          // Crear nuevo participante
          await addDoc(collection(db, 'leagueParticipants'), {
            leagueId: leagueId,
            userId: userId,
            currentPoints: 0,
            currentPosition: 0,
            previousPosition: 0,
            salesInSeason: 0,
            positionHistory: [],
            status: 'ACTIVE',
            joinedAt: Timestamp.now(),
            pointsEarned: 0
          });
        } else if (existing.status !== 'ACTIVE') {
          // Reactivar participante si estaba inactivo
          await updateDoc(doc(db, 'leagueParticipants', existing.id), {
            status: 'ACTIVE'
          });
        }
      }

      // Marcar como inactivos a los que ya no están en la liga
      for (const [userId, participant] of existingParticipants.entries()) {
        if (!memberIds.includes(userId) && participant.status === 'ACTIVE') {
          await updateDoc(doc(db, 'leagueParticipants', participant.id), {
            status: 'INACTIVE'
          });
        }
      }

      console.log(`✅ Participantes sincronizados para liga ${leagueId}`);
    } catch (err) {
      console.error('Error sincronizando participantes:', err);
      // No lanzar error para no bloquear la creación de la liga
    }
  };

  const activeLeagues = leagues.filter(l => l.active);
  const totalMembers = leagues.reduce((sum, league) => sum + league.members.length, 0);

  const commonIcons = ['🏆', '⭐', '🥇', '🥈', '🥉', '💎', '👑', '🎯', '🔥', '⚡'];
  const commonColors = [
    '#16b877', '#074739', '#026149', '#2e7d32', '#00796b',
    '#1976d2', '#0288d1', '#ed6c02', '#f57c00', '#9c27b0'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Ligas de Ventas</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Crea ligas personalizadas para competir y comparar resultados
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

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <EmojiEventsIcon color="primary" />
                <Typography color="textSecondary">
                  Ligas Activas
                </Typography>
              </Box>
              <Typography variant="h4">
                {activeLeagues.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PeopleIcon color="success" />
                <Typography color="textSecondary">
                  Total Miembros
                </Typography>
              </Box>
              <Typography variant="h4">
                {totalMembers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <GroupIcon color="info" />
                <Typography color="textSecondary">
                  Promedio/Liga
                </Typography>
              </Box>
              <Typography variant="h4">
                {leagues.length > 0 ? Math.round(totalMembers / leagues.length) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Liga</TableCell>
              <TableCell>Temporada</TableCell>
              <TableCell>Miembros</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leagues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay ligas configuradas. Crea la primera liga.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              leagues.map((league) => (
                <TableRow key={league.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar
                        sx={{
                          bgcolor: league.color || '#16b877',
                          width: 36,
                          height: 36,
                          fontSize: '1.2rem'
                        }}
                      >
                        {league.icon || '🏆'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {league.name}
                        </Typography>
                        {league.description && (
                          <Typography variant="caption" color="text.secondary">
                            {league.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      Temporada {league.season || 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${league.members.length} miembros`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={league.active ? 'Activa' : 'Inactiva'}
                      size="small"
                      color={league.active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(league)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(league.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de crear/editar liga */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingLeague ? 'Editar Liga' : 'Nueva Liga'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Nombre de la Liga"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Liga Promotores Zona Norte"
              helperText="Elige un nombre descriptivo y fácil de recordar"
            />

            <TextField
              label="Descripción (Opcional)"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe el propósito de esta liga..."
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Icono de la Liga
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {commonIcons.map(icon => (
                    <IconButton
                      key={icon}
                      onClick={() => handleInputChange('icon', icon)}
                      sx={{
                        border: formData.icon === icon ? 2 : 1,
                        borderColor: formData.icon === icon ? 'primary.main' : 'divider',
                        fontSize: '1.5rem'
                      }}
                    >
                      {icon}
                    </IconButton>
                  ))}
                </Stack>
                <TextField
                  label="O escribe uno personalizado"
                  fullWidth
                  size="small"
                  value={formData.icon}
                  onChange={(e) => handleInputChange('icon', e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Color de la Liga
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {commonColors.map(color => (
                    <IconButton
                      key={color}
                      onClick={() => handleInputChange('color', color)}
                      sx={{
                        border: formData.color === color ? 2 : 1,
                        borderColor: formData.color === color ? 'primary.main' : 'divider',
                        bgcolor: color,
                        width: 40,
                        height: 40,
                        '&:hover': {
                          bgcolor: color,
                          opacity: 0.8
                        }
                      }}
                    />
                  ))}
                </Stack>
                <TextField
                  label="O escribe un color personalizado (hex)"
                  fullWidth
                  size="small"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(option) => `${option.displayName} (${option.email})`}
              value={users.filter(u => formData.members.includes(u.id))}
              onChange={(_, newValue) => {
                handleInputChange('members', newValue.map(u => u.id));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Miembros de la Liga"
                  required
                  placeholder="Seleccionar usuarios..."
                  helperText={`${formData.members.length} miembros seleccionados (mínimo 2)`}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.displayName}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />

            <TextField
              label="Temporada"
              type="number"
              fullWidth
              value={formData.season}
              onChange={(e) => handleInputChange('season', parseInt(e.target.value) || 1)}
              InputProps={{ inputProps: { min: 1 } }}
              helperText="Número de temporada (ej: 1, 2, 3...)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                />
              }
              label="Liga Activa"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingLeague ? 'Actualizar' : 'Crear Liga'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Ligas;
