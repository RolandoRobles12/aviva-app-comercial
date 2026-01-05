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
  Avatar,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import CalculateIcon from '@mui/icons-material/Calculate';
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
  LeagueFormData,
  LeagueCriteria
} from '../types/league';
import {
  LeagueStatus
} from '../types/league';
import type { HubSpotMetric } from '../types/hubspotMetric';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

const Ligas: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hubspotMetrics, setHubspotMetrics] = useState<HubSpotMetric[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [recalculatingLeague, setRecalculatingLeague] = useState<string | null>(null);

  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    description: '',
    color: '#16b877',
    icon: '🏆',
    members: [],
    active: true,
    season: 1,
    startDate: null,
    endDate: null,
    maxParticipants: undefined,
    promotionSpots: undefined,
    relegationSpots: undefined,
    prizes: [],
    criteria: [],
    status: LeagueStatus.ACTIVE
  });

  useEffect(() => {
    fetchLeagues();
    fetchUsers();
    fetchHubspotMetrics();
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

  const fetchHubspotMetrics = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'hubspotMetrics'));
      const metricsData: HubSpotMetric[] = [];
      querySnapshot.forEach((doc) => {
        metricsData.push({ id: doc.id, ...doc.data() } as HubSpotMetric);
      });
      setHubspotMetrics(metricsData.filter(m => m.active).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error al cargar métricas de HubSpot:', err);
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
        startDate: league.startDate ? league.startDate.toDate() : null,
        endDate: league.endDate ? league.endDate.toDate() : null,
        maxParticipants: league.maxParticipants,
        promotionSpots: league.promotionSpots,
        relegationSpots: league.relegationSpots,
        prizes: league.prizes || [],
        criteria: league.criteria || [],
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
        startDate: null,
        endDate: null,
        maxParticipants: undefined,
        promotionSpots: undefined,
        relegationSpots: undefined,
        prizes: [],
        criteria: [],
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

      // Agregar campos opcionales solo si tienen valores
      if (formData.startDate) {
        dataToSave.startDate = Timestamp.fromDate(formData.startDate);
      }
      if (formData.endDate) {
        dataToSave.endDate = Timestamp.fromDate(formData.endDate);
      }
      if (formData.maxParticipants && formData.maxParticipants > 0) {
        dataToSave.maxParticipants = formData.maxParticipants;
      }
      if (formData.promotionSpots && formData.promotionSpots > 0) {
        dataToSave.promotionSpots = formData.promotionSpots;
      }
      if (formData.relegationSpots && formData.relegationSpots > 0) {
        dataToSave.relegationSpots = formData.relegationSpots;
      }
      if (formData.prizes && formData.prizes.length > 0) {
        dataToSave.prizes = formData.prizes;
      }
      if (formData.criteria && formData.criteria.length > 0) {
        dataToSave.criteria = formData.criteria;
      }

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

  const handleRecalculatePoints = async (leagueId: string, leagueName: string) => {
    if (!window.confirm(`¿Recalcular puntos de la liga "${leagueName}"?\n\nEsto actualizará los puntos y rankings de todos los participantes según los criterios configurados.`)) {
      return;
    }

    try {
      setRecalculatingLeague(leagueId);
      setError('');
      setSuccess('');

      // Llamar a la Firebase Function
      const response = await fetch('https://us-central1-promotores-aviva-tu-negocio.cloudfunctions.net/updateLeaguePoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ leagueId })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(`✅ Puntos actualizados exitosamente para "${leagueName}". ${result.data.membersProcessed} miembros procesados.`);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(`Error: ${result.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      setError(`Error al recalcular puntos: ${err.message}`);
      console.error(err);
    } finally {
      setRecalculatingLeague(null);
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
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

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
                    {league.criteria && league.criteria.length > 0 && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRecalculatePoints(league.id, league.name)}
                        disabled={recalculatingLeague === league.id}
                        title="Recalcular puntos"
                      >
                        {recalculatingLeague === league.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <CalculateIcon />
                        )}
                      </IconButton>
                    )}
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

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Temporada"
                  type="number"
                  fullWidth
                  value={formData.season}
                  onChange={(e) => handleInputChange('season', parseInt(e.target.value) || 1)}
                  InputProps={{ inputProps: { min: 1 } }}
                  helperText="Número de temporada"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Fecha de Inicio (Opcional)"
                  type="date"
                  fullWidth
                  value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Inicio de temporada"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Fecha de Fin (Opcional)"
                  type="date"
                  fullWidth
                  value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Fin de temporada"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
              Configuración de Competencia (Opcional)
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Máximo de Participantes"
                  type="number"
                  fullWidth
                  value={formData.maxParticipants || ''}
                  onChange={(e) => handleInputChange('maxParticipants', e.target.value ? parseInt(e.target.value) : undefined)}
                  InputProps={{ inputProps: { min: 1 } }}
                  helperText="Límite de miembros"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Espacios de Promoción"
                  type="number"
                  fullWidth
                  value={formData.promotionSpots || ''}
                  onChange={(e) => handleInputChange('promotionSpots', e.target.value ? parseInt(e.target.value) : undefined)}
                  InputProps={{ inputProps: { min: 0 } }}
                  helperText="Top N ascienden"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Espacios de Relegación"
                  type="number"
                  fullWidth
                  value={formData.relegationSpots || ''}
                  onChange={(e) => handleInputChange('relegationSpots', e.target.value ? parseInt(e.target.value) : undefined)}
                  InputProps={{ inputProps: { min: 0 } }}
                  helperText="Bottom N descienden"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Premios (Opcional)
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newPrizes = [...(formData.prizes || []), {
                      position: (formData.prizes?.length || 0) + 1,
                      description: '',
                      amount: undefined
                    }];
                    handleInputChange('prizes', newPrizes);
                  }}
                >
                  Agregar Premio
                </Button>
              </Box>

              {formData.prizes && formData.prizes.length > 0 && (
                <Stack spacing={2}>
                  {formData.prizes.map((prize, index) => (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Posición"
                            type="number"
                            fullWidth
                            size="small"
                            value={prize.position || ''}
                            onChange={(e) => {
                              const newPrizes = [...formData.prizes!];
                              newPrizes[index] = {
                                ...newPrizes[index],
                                position: parseInt(e.target.value) || undefined
                              };
                              handleInputChange('prizes', newPrizes);
                            }}
                            InputProps={{ inputProps: { min: 1 } }}
                          />
                        </Grid>
                        <Grid item xs={12} md={5}>
                          <TextField
                            label="Descripción"
                            fullWidth
                            size="small"
                            value={prize.description}
                            onChange={(e) => {
                              const newPrizes = [...formData.prizes!];
                              newPrizes[index] = {
                                ...newPrizes[index],
                                description: e.target.value
                              };
                              handleInputChange('prizes', newPrizes);
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Monto (Opcional)"
                            type="number"
                            fullWidth
                            size="small"
                            value={prize.amount || ''}
                            onChange={(e) => {
                              const newPrizes = [...formData.prizes!];
                              newPrizes[index] = {
                                ...newPrizes[index],
                                amount: e.target.value ? parseFloat(e.target.value) : undefined
                              };
                              handleInputChange('prizes', newPrizes);
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={1}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const newPrizes = formData.prizes!.filter((_, i) => i !== index);
                              handleInputChange('prizes', newPrizes);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Sección de Criterios de Puntuación */}
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Criterios de Puntuación
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Define cómo se calculan los puntos de cada participante
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newCriteria: LeagueCriteria = {
                      id: uuidv4(),
                      name: '',
                      description: '',
                      source: 'VISITS',
                      pointsPerUnit: 1,
                      calculationType: 'COUNT',
                      enabled: true
                    };
                    handleInputChange('criteria', [...(formData.criteria || []), newCriteria]);
                  }}
                >
                  Agregar Criterio
                </Button>
              </Box>

              {formData.criteria && formData.criteria.length > 0 && (
                <Stack spacing={2}>
                  {formData.criteria.map((criteria, index) => (
                    <Paper key={criteria.id} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight="bold">
                              Criterio #{index + 1}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                const newCriteria = formData.criteria!.filter((_, i) => i !== index);
                                handleInputChange('criteria', newCriteria);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Nombre del Criterio"
                            fullWidth
                            size="small"
                            required
                            value={criteria.name}
                            onChange={(e) => {
                              const newCriteria = [...formData.criteria!];
                              newCriteria[index] = { ...newCriteria[index], name: e.target.value };
                              handleInputChange('criteria', newCriteria);
                            }}
                            placeholder="Ej: Visitas Realizadas"
                          />
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Puntos por Unidad"
                            fullWidth
                            size="small"
                            type="number"
                            required
                            value={criteria.pointsPerUnit}
                            onChange={(e) => {
                              const newCriteria = [...formData.criteria!];
                              newCriteria[index] = { ...newCriteria[index], pointsPerUnit: parseInt(e.target.value) || 0 };
                              handleInputChange('criteria', newCriteria);
                            }}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Descripción (Opcional)"
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            value={criteria.description || ''}
                            onChange={(e) => {
                              const newCriteria = [...formData.criteria!];
                              newCriteria[index] = { ...newCriteria[index], description: e.target.value };
                              handleInputChange('criteria', newCriteria);
                            }}
                            placeholder="Describe qué mide este criterio..."
                          />
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Fuente de Datos"
                            fullWidth
                            size="small"
                            select
                            required
                            value={criteria.source}
                            onChange={(e) => {
                              const newCriteria = [...formData.criteria!];
                              newCriteria[index] = { ...newCriteria[index], source: e.target.value as any };
                              handleInputChange('criteria', newCriteria);
                            }}
                            SelectProps={{ native: true }}
                          >
                            <option value="VISITS">Visitas (Firestore)</option>
                            <option value="CUSTOM_FIELD">Campo Personalizado</option>
                            <option value="HUBSPOT_METRIC">Métrica de HubSpot</option>
                            <option value="MANUAL">Manual (sin cálculo)</option>
                          </TextField>
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Tipo de Cálculo"
                            fullWidth
                            size="small"
                            select
                            required
                            value={criteria.calculationType}
                            onChange={(e) => {
                              const newCriteria = [...formData.criteria!];
                              newCriteria[index] = { ...newCriteria[index], calculationType: e.target.value as any };
                              handleInputChange('criteria', newCriteria);
                            }}
                            SelectProps={{ native: true }}
                          >
                            <option value="COUNT">Contar registros</option>
                            <option value="SUM">Sumar valores</option>
                            <option value="AVERAGE">Promedio</option>
                          </TextField>
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={criteria.enabled}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], enabled: e.target.checked };
                                  handleInputChange('criteria', newCriteria);
                                }}
                              />
                            }
                            label="Activo"
                          />
                        </Grid>

                        {/* Campos condicionales para CUSTOM_FIELD */}
                        {criteria.source === 'CUSTOM_FIELD' && (
                          <>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Colección de Firestore"
                                fullWidth
                                size="small"
                                required
                                value={criteria.firestoreCollection || ''}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], firestoreCollection: e.target.value };
                                  handleInputChange('criteria', newCriteria);
                                }}
                                placeholder="Ej: sales, orders"
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Campo Usuario"
                                fullWidth
                                size="small"
                                required
                                value={criteria.firestoreUserField || ''}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], firestoreUserField: e.target.value };
                                  handleInputChange('criteria', newCriteria);
                                }}
                                placeholder="Ej: userId, promotorId"
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Campo a Sumar (opcional)"
                                fullWidth
                                size="small"
                                value={criteria.firestoreField || ''}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], firestoreField: e.target.value };
                                  handleInputChange('criteria', newCriteria);
                                }}
                                placeholder="Ej: amount, quantity"
                                helperText="Solo si tipo = SUM"
                              />
                            </Grid>

                            {/* Filtros opcionales */}
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Filtro (Opcional)
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Campo del Filtro"
                                fullWidth
                                size="small"
                                value={criteria.whereField || ''}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], whereField: e.target.value };
                                  handleInputChange('criteria', newCriteria);
                                }}
                                placeholder="Ej: status"
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Operador"
                                fullWidth
                                size="small"
                                select
                                value={criteria.whereOperator || '=='}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], whereOperator: e.target.value as any };
                                  handleInputChange('criteria', newCriteria);
                                }}
                                SelectProps={{ native: true }}
                              >
                                <option value="==">Igual (==)</option>
                                <option value="!=">Diferente (!=)</option>
                                <option value=">">Mayor (&gt;)</option>
                                <option value="<">Menor (&lt;)</option>
                                <option value=">=">Mayor o igual (&gt;=)</option>
                                <option value="<=">Menor o igual (&lt;=)</option>
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Valor del Filtro"
                                fullWidth
                                size="small"
                                value={criteria.whereValue || ''}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], whereValue: e.target.value };
                                  handleInputChange('criteria', newCriteria);
                                }}
                                placeholder="Ej: completed"
                              />
                            </Grid>
                          </>
                        )}

                        {/* Campos condicionales para HUBSPOT_METRIC */}
                        {criteria.source === 'HUBSPOT_METRIC' && (
                          <>
                            <Grid item xs={12}>
                              <TextField
                                label="Métrica de HubSpot"
                                fullWidth
                                size="small"
                                select
                                required
                                value={criteria.hubspotMetricId || ''}
                                onChange={(e) => {
                                  const newCriteria = [...formData.criteria!];
                                  newCriteria[index] = { ...newCriteria[index], hubspotMetricId: e.target.value };
                                  handleInputChange('criteria', newCriteria);
                                }}
                                SelectProps={{ native: true }}
                                helperText={
                                  criteria.hubspotMetricId
                                    ? hubspotMetrics.find(m => m.id === criteria.hubspotMetricId)?.description
                                    : 'Selecciona una métrica predefinida de HubSpot'
                                }
                              >
                                <option value="">-- Selecciona una métrica --</option>
                                {hubspotMetrics.map(metric => (
                                  <option key={metric.id} value={metric.id}>
                                    {metric.name}
                                  </option>
                                ))}
                              </TextField>
                              {hubspotMetrics.length === 0 && (
                                <Alert severity="warning" sx={{ mt: 1 }}>
                                  No hay métricas de HubSpot disponibles. Ve a la sección de Métricas de HubSpot para crear algunas.
                                </Alert>
                              )}
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}

              {(!formData.criteria || formData.criteria.length === 0) && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  No hay criterios configurados. Agrega al menos un criterio para calcular puntos automáticamente.
                </Alert>
              )}
            </Box>

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
