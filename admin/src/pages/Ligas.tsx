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
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
import {
  League,
  LeagueFormData,
  LeagueTier,
  LeagueStatus,
  PrizeType,
  LeaguePrize
} from '../types/league';

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

// Configuración de tiers con colores y puntos
const TIER_CONFIG = {
  BRONCE: { displayName: 'Bronce', colorHex: '#CD7F32', minPoints: 0 },
  PLATA: { displayName: 'Plata', colorHex: '#C0C0C0', minPoints: 1000 },
  ORO: { displayName: 'Oro', colorHex: '#FFD700', minPoints: 2500 },
  PLATINO: { displayName: 'Platino', colorHex: '#E5E4E2', minPoints: 5000 },
  DIAMANTE: { displayName: 'Diamante', colorHex: '#B9F2FF', minPoints: 10000 },
  MASTER: { displayName: 'Master', colorHex: '#FF1744', minPoints: 20000 },
  LEYENDA: { displayName: 'Leyenda', colorHex: '#9C27B0', minPoints: 50000 }
};

const Ligas: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [expandedPrizes, setExpandedPrizes] = useState(false);

  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    description: '',
    color: '#1976d2',
    icon: '🏆',
    members: [],
    active: true,
    competitiveMode: false,
    tier: LeagueTier.BRONCE,
    season: 1,
    startDate: null,
    endDate: null,
    maxParticipants: 50,
    promotionSpots: 10,
    relegationSpots: 10,
    prizes: [],
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
        color: league.color || '#1976d2',
        icon: league.icon || '🏆',
        members: league.members,
        active: league.active,
        competitiveMode: league.competitiveMode || false,
        tier: league.tier || LeagueTier.BRONCE,
        season: league.season || 1,
        startDate: league.startDate ? league.startDate.toDate() : null,
        endDate: league.endDate ? league.endDate.toDate() : null,
        maxParticipants: league.maxParticipants || 50,
        promotionSpots: league.promotionSpots || 10,
        relegationSpots: league.relegationSpots || 10,
        prizes: league.prizes || [],
        status: league.status || LeagueStatus.ACTIVE
      });
    } else {
      setEditingLeague(null);
      setFormData({
        name: '',
        description: '',
        color: '#1976d2',
        icon: '🏆',
        members: [],
        active: true,
        competitiveMode: false,
        tier: LeagueTier.BRONCE,
        season: 1,
        startDate: null,
        endDate: null,
        maxParticipants: 50,
        promotionSpots: 10,
        relegationSpots: 10,
        prizes: [],
        status: LeagueStatus.ACTIVE
      });
    }
    setDialogOpen(true);
    setTabValue(0);
    setExpandedPrizes(false);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLeague(null);
    setError('');
  };

  const handleInputChange = (field: keyof LeagueFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddPrize = () => {
    const newPrize: LeaguePrize = {
      position: 1,
      prizeType: PrizeType.PUNTOS,
      prizeValue: '',
      description: ''
    };
    setFormData({
      ...formData,
      prizes: [...(formData.prizes || []), newPrize]
    });
  };

  const handleRemovePrize = (index: number) => {
    const newPrizes = [...(formData.prizes || [])];
    newPrizes.splice(index, 1);
    setFormData({ ...formData, prizes: newPrizes });
  };

  const handlePrizeChange = (index: number, field: keyof LeaguePrize, value: any) => {
    const newPrizes = [...(formData.prizes || [])];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setFormData({ ...formData, prizes: newPrizes });
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

      if (formData.competitiveMode) {
        if (!formData.startDate || !formData.endDate) {
          setError('Las fechas de inicio y fin son obligatorias en modo competitivo');
          return;
        }
        if (formData.startDate >= formData.endDate) {
          setError('La fecha de fin debe ser posterior a la fecha de inicio');
          return;
        }
      }

      // Preparar datos para guardar
      const dataToSave: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        color: formData.color || '#1976d2',
        icon: formData.icon || '🏆',
        members: formData.members,
        active: formData.active,
        updatedAt: Timestamp.now(),
        createdBy: 'admin',
        ...(editingLeague ? {} : { createdAt: Timestamp.now() })
      };

      // Agregar campos del modo competitivo si está habilitado
      if (formData.competitiveMode) {
        dataToSave.competitiveMode = true;
        dataToSave.tier = formData.tier;
        dataToSave.season = formData.season;
        dataToSave.startDate = formData.startDate ? Timestamp.fromDate(formData.startDate) : null;
        dataToSave.endDate = formData.endDate ? Timestamp.fromDate(formData.endDate) : null;
        dataToSave.maxParticipants = formData.maxParticipants;
        dataToSave.promotionSpots = formData.promotionSpots;
        dataToSave.relegationSpots = formData.relegationSpots;
        dataToSave.prizes = formData.prizes || [];
        dataToSave.status = formData.status;
      } else {
        // Limpiar campos competitivos si no está en modo competitivo
        dataToSave.competitiveMode = false;
      }

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

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const activeLeagues = leagues.filter(l => l.active);
  const competitiveLeagues = leagues.filter(l => l.competitiveMode);
  const totalMembers = leagues.reduce((sum, league) => sum + league.members.length, 0);

  const commonIcons = ['🏆', '⭐', '🥇', '🥈', '🥉', '💎', '👑', '🎯', '🔥', '⚡'];
  const commonColors = [
    '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0',
    '#0288d1', '#00796b', '#f57c00', '#c62828', '#7b1fa2'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Gestión de Ligas</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Sistema unificado de benchmarking y competencias
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

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Dos modos disponibles:</strong>
        <br />
        • <strong>Benchmarking Simple:</strong> Agrupa promotores para comparar métricas
        <br />
        • <strong>Sistema Competitivo:</strong> Sistema completo con tiers, temporadas, promoción/descenso y premios
      </Alert>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WorkspacePremiumIcon color="warning" />
                <Typography color="textSecondary">
                  Ligas Competitivas
                </Typography>
              </Box>
              <Typography variant="h4">
                {competitiveLeagues.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignments="center" gap={1} mb={1}>
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
        <Grid item xs={12} md={3}>
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
              <TableCell>Tipo</TableCell>
              <TableCell>Tier/Temporada</TableCell>
              <TableCell>Miembros</TableCell>
              <TableCell>Período</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leagues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
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
                          bgcolor: league.competitiveMode && league.tier
                            ? TIER_CONFIG[league.tier].colorHex
                            : (league.color || '#1976d2'),
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
                    <Chip
                      label={league.competitiveMode ? 'Competitiva' : 'Benchmarking'}
                      size="small"
                      color={league.competitiveMode ? 'warning' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {league.competitiveMode ? (
                      <Box>
                        <Chip
                          label={league.tier ? TIER_CONFIG[league.tier].displayName : 'N/A'}
                          size="small"
                          sx={{
                            bgcolor: league.tier ? TIER_CONFIG[league.tier].colorHex : '#ccc',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                        <Typography variant="caption" display="block" mt={0.5}>
                          Temporada {league.season || 1}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
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
                    {league.competitiveMode && league.startDate && league.endDate ? (
                      <Box>
                        <Typography variant="caption" display="block">
                          {formatDate(league.startDate)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          al {formatDate(league.endDate)}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Sin período definido
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {league.competitiveMode ? (
                      <Chip
                        label={league.status || 'ACTIVE'}
                        size="small"
                        color={
                          league.status === LeagueStatus.ACTIVE ? 'success' :
                          league.status === LeagueStatus.PENDING ? 'warning' : 'default'
                        }
                      />
                    ) : (
                      <Chip
                        label={league.active ? 'Activa' : 'Inactiva'}
                        size="small"
                        color={league.active ? 'success' : 'default'}
                      />
                    )}
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingLeague ? 'Editar Liga' : 'Nueva Liga'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
              <Tab label="Información Básica" />
              <Tab label="Configuración Competitiva" />
              <Tab label="Premios" />
            </Tabs>

            {/* Tab 0: Información Básica */}
            {tabValue === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nombre de la Liga"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Liga Plata Norte"
                />

                <TextField
                  label="Descripción"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
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
                    <Typography variant="caption" color="text.secondary" gutterBottom>
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
            )}

            {/* Tab 1: Configuración Competitiva */}
            {tabValue === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info">
                  Habilita el modo competitivo para usar tiers, temporadas, promoción/descenso y el sistema completo de puntos.
                </Alert>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.competitiveMode || false}
                      onChange={(e) => handleInputChange('competitiveMode', e.target.checked)}
                    />
                  }
                  label="Habilitar Modo Competitivo"
                />

                {formData.competitiveMode && (
                  <>
                    <Divider />

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Tier de la Liga</InputLabel>
                          <Select
                            value={formData.tier}
                            onChange={(e) => handleInputChange('tier', e.target.value)}
                            label="Tier de la Liga"
                          >
                            {Object.entries(TIER_CONFIG).map(([key, config]) => (
                              <MenuItem key={key} value={key}>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Box
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      bgcolor: config.colorHex,
                                      borderRadius: 1
                                    }}
                                  />
                                  {config.displayName} ({config.minPoints}+ pts)
                                </Box>
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
                          value={formData.season}
                          onChange={(e) => handleInputChange('season', parseInt(e.target.value) || 1)}
                          InputProps={{ inputProps: { min: 1 } }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Fecha de Inicio"
                          type="date"
                          fullWidth
                          required
                          value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleInputChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Fecha de Fin"
                          type="date"
                          fullWidth
                          required
                          value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleInputChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Máximo de Participantes"
                          type="number"
                          fullWidth
                          value={formData.maxParticipants}
                          onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || 50)}
                          InputProps={{ inputProps: { min: 1 } }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Plazas de Promoción"
                          type="number"
                          fullWidth
                          value={formData.promotionSpots}
                          onChange={(e) => handleInputChange('promotionSpots', parseInt(e.target.value) || 10)}
                          InputProps={{ inputProps: { min: 0 } }}
                          helperText="Top N usuarios ascienden"
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Plazas de Descenso"
                          type="number"
                          fullWidth
                          value={formData.relegationSpots}
                          onChange={(e) => handleInputChange('relegationSpots', parseInt(e.target.value) || 10)}
                          InputProps={{ inputProps: { min: 0 } }}
                          helperText="Bottom N usuarios descienden"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Estado de la Liga</InputLabel>
                          <Select
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            label="Estado de la Liga"
                          >
                            <MenuItem value={LeagueStatus.PENDING}>Pendiente (No iniciada)</MenuItem>
                            <MenuItem value={LeagueStatus.ACTIVE}>Activa (En curso)</MenuItem>
                            <MenuItem value={LeagueStatus.FINISHED}>Finalizada</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Box>
            )}

            {/* Tab 2: Premios */}
            {tabValue === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {!formData.competitiveMode ? (
                  <Alert severity="warning">
                    Los premios solo están disponibles en modo competitivo. Habilita el modo competitivo en la pestaña anterior.
                  </Alert>
                ) : (
                  <>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">Premios y Recompensas</Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddPrize}
                      >
                        Agregar Premio
                      </Button>
                    </Box>

                    {formData.prizes && formData.prizes.length > 0 ? (
                      formData.prizes.map((prize, index) => (
                        <Paper key={index} sx={{ p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle2">Premio #{index + 1}</Typography>
                            <IconButton size="small" color="error" onClick={() => handleRemovePrize(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </Box>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                label="Posición"
                                type="number"
                                fullWidth
                                value={prize.position || ''}
                                onChange={(e) => handlePrizeChange(index, 'position', parseInt(e.target.value) || undefined)}
                                helperText="Posición específica (ej: 1 para 1er lugar)"
                                InputProps={{ inputProps: { min: 1 } }}
                              />
                            </Grid>

                            <Grid item xs={12} md={3}>
                              <TextField
                                label="Rango Inicio"
                                type="number"
                                fullWidth
                                value={prize.positionRangeStart || ''}
                                onChange={(e) => handlePrizeChange(index, 'positionRangeStart', parseInt(e.target.value) || undefined)}
                                helperText="Inicio de rango (opcional)"
                                InputProps={{ inputProps: { min: 1 } }}
                              />
                            </Grid>

                            <Grid item xs={12} md={3}>
                              <TextField
                                label="Rango Fin"
                                type="number"
                                fullWidth
                                value={prize.positionRangeEnd || ''}
                                onChange={(e) => handlePrizeChange(index, 'positionRangeEnd', parseInt(e.target.value) || undefined)}
                                helperText="Fin de rango (opcional)"
                                InputProps={{ inputProps: { min: 1 } }}
                              />
                            </Grid>

                            <Grid item xs={12} md={6}>
                              <FormControl fullWidth>
                                <InputLabel>Tipo de Premio</InputLabel>
                                <Select
                                  value={prize.prizeType}
                                  onChange={(e) => handlePrizeChange(index, 'prizeType', e.target.value)}
                                  label="Tipo de Premio"
                                >
                                  <MenuItem value={PrizeType.PUNTOS}>Puntos</MenuItem>
                                  <MenuItem value={PrizeType.DINERO}>Dinero</MenuItem>
                                  <MenuItem value={PrizeType.BONO}>Bono</MenuItem>
                                  <MenuItem value={PrizeType.PRODUCTO}>Producto</MenuItem>
                                  <MenuItem value={PrizeType.RECONOCIMIENTO}>Reconocimiento</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                              <TextField
                                label="Valor del Premio"
                                fullWidth
                                value={prize.prizeValue}
                                onChange={(e) => handlePrizeChange(index, 'prizeValue', e.target.value)}
                                placeholder="Ej: 1000, $500, Certificado"
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <TextField
                                label="Descripción"
                                fullWidth
                                multiline
                                rows={2}
                                value={prize.description}
                                onChange={(e) => handlePrizeChange(index, 'description', e.target.value)}
                                placeholder="Descripción del premio..."
                              />
                            </Grid>
                          </Grid>
                        </Paper>
                      ))
                    ) : (
                      <Alert severity="info">
                        No hay premios configurados. Haz clic en "Agregar Premio" para crear uno.
                      </Alert>
                    )}
                  </>
                )}
              </Box>
            )}
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
