import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Collapse,
  ListItemButton
} from '@mui/material';
import {
  Route as RouteIcon,
  Place as PlaceIcon,
  Storefront as StorefrontIcon,
  Refresh as RefreshIcon,
  MyLocation as MyLocationIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning
} from '@mui/icons-material';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';
import TodayIcon from '@mui/icons-material/Today';
import PlaceIcon from '@mui/icons-material/Place';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { GoogleMap, useLoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  GeoPoint,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ['places', 'geometry'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 };

const COLORS = {
  routes: ['#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'],
  kiosk: '#4CAF50',
  longStop: '#FF9800',
  point: '#2196F3'
};

interface User {
  id: string;
  displayName: string;
  email: string;
}

interface LocationPoint {
  id: string;
  timestamp: Timestamp;
  location: GeoPoint;
  accuracy?: number;
  userId: string;
}

interface LongStop {
  id: string;
  userId: string;
  location: GeoPoint;
  startTime: Timestamp;
  durationMinutes: number;
}

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

const RutasPromotores: React.FC = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [longStops, setLongStops] = useState<LongStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null);
  const [selectedLongStop, setSelectedLongStop] = useState<LongStop | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getDateRangeForFilter = (filter: QuickFilter): { start: string; end: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today':
        const dateStr = today.toISOString().split('T')[0];
        return { start: dateStr, end: dateStr };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const ydateStr = yesterday.toISOString().split('T')[0];
        return { start: ydateStr, end: ydateStr };
      case 'thisWeek':
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay());
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        return {
          start: firstDay.toISOString().split('T')[0],
          end: lastDay.toISOString().split('T')[0]
        };
      case 'lastWeek':
        const lfirstDay = new Date(today);
        lfirstDay.setDate(today.getDate() - today.getDay() - 7);
        const llastDay = new Date(lfirstDay);
        llastDay.setDate(lfirstDay.getDate() + 6);
        return {
          start: lfirstDay.toISOString().split('T')[0],
          end: llastDay.toISOString().split('T')[0]
        };
      case 'thisMonth':
        const mfirstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const mlastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: mfirstDay.toISOString().split('T')[0],
          end: mlastDay.toISOString().split('T')[0]
        };
      case 'lastMonth':
        const lmfirstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lmlastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: lmfirstDay.toISOString().split('T')[0],
          end: lmlastDay.toISOString().split('T')[0]
        };
      case 'custom':
      default:
        return { start: startDate, end: endDate };
    }
  };

  useEffect(() => {
    const { start, end } = getDateRangeForFilter('today');
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    if (quickFilter !== 'custom') {
      const { start, end } = getDateRangeForFilter(quickFilter);
      setStartDate(start);
      setEndDate(end);
    }
  }, [quickFilter]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData: User[] = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          displayName: doc.data().displayName || 'Sin nombre',
          email: doc.data().email || ''
        }));
        setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleLoadRoute = async () => {
    if (selectedUserIds.length === 0) {
      setError('Por favor selecciona al menos un promotor');
      return;
    }

    setLoading(true);
    setError(null);
    setLocationPoints([]);
    setLongStops([]);
    setSelectedPoint(null);
    setSelectedLongStop(null);

    try {
      const startDateObj = new Date(startDate + 'T00:00:00');
      const endDateObj = new Date(endDate + 'T23:59:59');
      const startTimestamp = Timestamp.fromDate(startDateObj);
      const endTimestamp = Timestamp.fromDate(endDateObj);

      const allPoints: LocationPoint[] = [];

      for (const userId of selectedUserIds) {
        // Cargar ubicaciones SOLO de 'locations' que YA EXISTE
        const locQuery = query(
          collection(db, 'locations'),
          where('userId', '==', userId),
          where('timestamp', '>=', startTimestamp),
          where('timestamp', '<=', endTimestamp),
          orderBy('timestamp', 'asc')
        );

        const locSnapshot = await getDocs(locQuery);
        const userPoints: LocationPoint[] = locSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            timestamp: data.timestamp,
            location: data.location,
            accuracy: data.accuracy,
            userId: userId
          };
        });
        allPoints.push(...userPoints);
      }

      allPoints.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

      // Detectar paradas largas (misma lógica que la app Android)
      const detectedLongStops = detectLongStops(allPoints);

      setLocationPoints(allPoints);
      setLongStops(detectedLongStops);

      // Ajustar vista del mapa a las rutas cargadas
      if (mapRef && (allPoints.length > 0 || allVisits.length > 0 || detectedLongStops.length > 0)) {
      // Ajustar mapa
      if (mapRef && (allPoints.length > 0 || detectedLongStops.length > 0)) {
        const bounds = new google.maps.LatLngBounds();
        allPoints.forEach(p => bounds.extend({ lat: p.location.latitude, lng: p.location.longitude }));
        detectedLongStops.forEach(s => bounds.extend({ lat: s.location.latitude, lng: s.location.longitude }));

        // Ajustar el mapa con padding para mejor visualización
        mapRef.fitBounds(bounds, {
          top: 120,
          right: 50,
          bottom: 50,
          left: sidebarOpen ? 410 : 50
        });
      }

      if (allPoints.length === 0 && allVisits.length === 0) {
        setError(`No se encontraron datos de ubicación para ${selectedUserIds.length > 1 ? 'los promotores seleccionados' : 'el promotor seleccionado'} en el periodo del ${startDate} al ${endDate}.`);
      } else {
        console.log(`✅ Rutas cargadas: ${allPoints.length} puntos, ${allVisits.length} visitas, ${detectedLongStops.length} paradas largas`);
      if (allPoints.length === 0) {
        setError('No se encontraron datos para los promotores en este periodo');
      }
    } catch (err: any) {
      console.error('Error loading route:', err);
      setError(err.message || 'Error al cargar las rutas');
      setLocationPoints([]);
      setLongStops([]);
    } finally {
      setLoading(false);
    }
  };

  // Detectar paradas largas (misma lógica que la app Android)
  const detectLongStops = (points: LocationPoint[]): LongStop[] => {
    const stops: LongStop[] = [];

    // Agrupar por usuario
    const pointsByUser = points.reduce((acc, point) => {
      if (!acc[point.userId]) acc[point.userId] = [];
      acc[point.userId].push(point);
      return acc;
    }, {} as Record<string, LocationPoint[]>);

    // Para cada usuario, detectar paradas largas
    Object.entries(pointsByUser).forEach(([userId, userPoints]) => {
      for (let i = 0; i < userPoints.length - 1; i++) {
        const current = userPoints[i];
        const next = userPoints[i + 1];

        // Calcular distancia entre puntos (Haversine)
        const distance = calculateDistance(
          current.location.latitude,
          current.location.longitude,
          next.location.latitude,
          next.location.longitude
        );

        // Calcular diferencia de tiempo en minutos
        const timeDiff = (next.timestamp.toMillis() - current.timestamp.toMillis()) / 1000 / 60;

        // Si estuvo más de 15 minutos en un radio de 100 metros
        if (distance < 100 && timeDiff > 15) {
          stops.push({
            id: `${userId}_${current.timestamp.toMillis()}`,
            userId: userId,
            location: current.location,
            startTime: current.timestamp,
            durationMinutes: Math.round(timeDiff)
          });
        }
      }
    });

    return stops;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getUserColor = (userId: string): string => {
    const index = selectedUserIds.indexOf(userId);
    return COLORS.routes[index % COLORS.routes.length];
  };

  const getUserName = (userId: string): string => {
    return users.find(u => u.id === userId)?.displayName || 'Desconocido';
  };

  const formatTime = (timestamp: Timestamp): string => {
    return timestamp.toDate().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const centerMap = () => {
    if (!mapRef || (locationPoints.length === 0 && kioskVisits.length === 0 && longStops.length === 0)) return;
    const bounds = new google.maps.LatLngBounds();
    locationPoints.forEach(p => bounds.extend({ lat: p.location.latitude, lng: p.location.longitude }));
    kioskVisits.forEach(v => bounds.extend({ lat: v.checkInLocation.latitude, lng: v.checkInLocation.longitude }));
    longStops.forEach(s => bounds.extend({ lat: s.location.latitude, lng: s.location.longitude }));
    mapRef.fitBounds(bounds, {
      top: 120,
      right: 50,
      bottom: 50,
      left: sidebarOpen ? 410 : 50
    });
  };

  const stats = useMemo(() => {
    return {
      promoters: selectedUserIds.length,
      points: locationPoints.length,
      visits: kioskVisits.length,
      stops: longStops.length
    };
  }, [selectedUserIds, locationPoints, kioskVisits, longStops]);

  if (loadError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Error al cargar Google Maps: {loadError.message}</Alert>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} />
          <Typography>Cargando Google Maps...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">⚠️ API Key de Google Maps no configurada</Alert>
      </Box>
    );
  }

  const pointsByUser = selectedUserIds.reduce((acc, userId) => {
    acc[userId] = locationPoints.filter(p => p.userId === userId);
    return acc;
  }, {} as Record<string, LocationPoint[]>);

  const hasData = locationPoints.length > 0 || longStops.length > 0;

  return (
    <Box sx={{
      position: 'fixed',
      top: 64,
      left: 270,
      right: 0,
      bottom: 0,
      display: 'flex',
      bgcolor: 'background.default',
      zIndex: 1
    }}>
      {/* Barra superior de estadísticas */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          left: sidebarOpen ? 376 : 16,
          right: 16,
          zIndex: 1000,
          px: 3,
          py: 2,
          transition: 'left 0.3s'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">Promotores</Typography>
              <Typography variant="h5" fontWeight={700}>{stats.promoters}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <PlaceIcon sx={{ color: COLORS.point, fontSize: 20 }} />
                <Box>
                  <Typography variant="caption">Puntos</Typography>
                  <Typography variant="h6" fontWeight={600} color={COLORS.point}>{stats.points}</Typography>
                </Box>
              </Stack>
            </Box>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <StorefrontIcon sx={{ color: COLORS.kiosk, fontSize: 20 }} />
                <Box>
                  <Typography variant="caption">Kioscos</Typography>
                  <Typography variant="h6" fontWeight={600} color={COLORS.kiosk}>{stats.visits}</Typography>
                </Box>
              </Stack>
            </Box>
            {stats.stops > 0 && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Warning sx={{ color: COLORS.longStop, fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption">Paradas</Typography>
                    <Typography variant="h6" fontWeight={600} color={COLORS.longStop}>{stats.stops}</Typography>
                  </Box>
                </Stack>
              </Box>
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={handleLoadRoute} size="small" disabled={selectedUserIds.length === 0 || loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Centrar mapa">
              <IconButton onClick={centerMap} size="small" disabled={!hasData}>
                <MyLocationIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}>
              <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} size="small">
                {sidebarOpen ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Panel lateral */}
      <Collapse orientation="horizontal" in={sidebarOpen}>
        <Paper
          elevation={2}
          sx={{
            width: 360,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'hidden'
          }}
        >
          {/* Header sticky del panel */}
          <Box sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            flexShrink: 0
          }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <RouteIcon color="primary" fontSize="large" />
                <Typography variant="h6" fontWeight={700}>
                  Rutas de Promotores
                </Typography>
              </Stack>

              {/* Filtros rápidos */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Periodo
              </Typography>
              <ToggleButtonGroup
                value={quickFilter}
                exclusive
                onChange={(_, newFilter) => newFilter && setQuickFilter(newFilter)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton value="today">Hoy</ToggleButton>
                <ToggleButton value="yesterday">Ayer</ToggleButton>
                <ToggleButton value="thisWeek">Semana</ToggleButton>
              </ToggleButtonGroup>

              <Stack spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Fecha Inicio"
                  type="date"
                  size="small"
                  fullWidth
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setQuickFilter('custom');
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={quickFilter !== 'custom'}
                />

                <TextField
                  label="Fecha Fin"
                  type="date"
                  size="small"
                  fullWidth
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setQuickFilter('custom');
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={quickFilter !== 'custom'}
                />

                <Autocomplete
                  multiple
                  fullWidth
                  options={users}
                  value={users.filter(u => selectedUserIds.includes(u.id))}
                  onChange={(_, newValue) => setSelectedUserIds(newValue.map(u => u.id))}
                  getOptionLabel={(option) => option.displayName}
                  renderInput={(params) => <TextField {...params} label="Promotores" size="small" />}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option.displayName}
                        {...getTagProps({ index })}
                        size="small"
                        sx={{ bgcolor: getUserColor(option.id), color: 'white' }}
                      />
                    ))
                  }
                />

                <Button
                  variant="contained"
                  onClick={handleLoadRoute}
                  disabled={loading || selectedUserIds.length === 0}
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} /> : <RouteIcon />}
                >
                  {loading ? 'Cargando...' : 'Cargar Rutas'}
                </Button>
              </Stack>

              {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>

            <Divider />
          </Box>

          {/* Lista scrollable de detalles */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {hasData && (
              <>
                {kioskVisits.length > 0 && (
                  <>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                        🏪 Visitas a Kioscos ({kioskVisits.length})
                      </Typography>
                    </Box>
                    <List dense>
                      {kioskVisits.map((visit) => (
                        <ListItem key={visit.id} disablePadding>
                          <ListItemButton
                            onClick={() => {
                              setSelectedVisit(visit);
                              setSelectedPoint(null);
                              setSelectedLongStop(null);
                              if (mapRef) {
                                mapRef.panTo({ lat: visit.checkInLocation.latitude, lng: visit.checkInLocation.longitude });
                                mapRef.setZoom(16);
                              }
                            }}
                          >
                            <ListItemIcon>
                              <StorefrontIcon sx={{ color: COLORS.kiosk }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={visit.kioskName}
                              secondary={
                                <>
                                  <Typography variant="caption" display="block">
                                    {getUserName(visit.userId)}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    {formatTime(visit.checkInTime)} {visit.durationMinutes && `• ${formatDuration(visit.durationMinutes)}`}
                                  </Typography>
                                </>
                              }
                              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                              secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                    <Divider />
                  </>
                )}

                {longStops.length > 0 && (
                  <>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                        🛑 Paradas Largas ({longStops.length})
                      </Typography>
                    </Box>
                    <List dense>
                      {longStops.map((stop) => (
                        <ListItem key={stop.id} disablePadding>
                          <ListItemButton
                            onClick={() => {
                              setSelectedLongStop(stop);
                              setSelectedPoint(null);
                              setSelectedVisit(null);
                              if (mapRef) {
                                mapRef.panTo({ lat: stop.location.latitude, lng: stop.location.longitude });
                                mapRef.setZoom(16);
                              }
                            }}
                          >
                            <ListItemIcon>
                              <Warning sx={{ color: COLORS.longStop }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={getUserName(stop.userId)}
                              secondary={
                                <>
                                  <Typography variant="caption" display="block">
                                    {formatTime(stop.startTime)}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    ~{stop.durationMinutes} minutos
                                  </Typography>
                                </>
                              }
                              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                              secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </>
            )}

            {!hasData && !loading && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <RouteIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Selecciona promotores y periodo, luego haz clic en "Cargar Rutas"
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Collapse>

      {/* Contenedor del Mapa */}
      <Box sx={{
        flex: 1,
        minWidth: 0,
        position: 'relative',
        height: '100%'
      }}>
        {loading && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1100,
            bgcolor: 'rgba(255,255,255,0.95)',
            p: 3,
            borderRadius: 2,
            boxShadow: 3
          }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={60} />
              <Typography variant="h6" fontWeight={600}>Cargando rutas...</Typography>
              <Typography variant="body2" color="text.secondary">
                Obteniendo datos de ubicación
              </Typography>
            </Stack>
          </Box>
        {/* Stats */}
        {hasData && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip icon={<PersonIcon />} label={`${selectedUserIds.length} promotores`} size="small" color="primary" variant="outlined" />
            <Chip icon={<PlaceIcon />} label={`${locationPoints.length} puntos`} size="small" color="primary" variant="outlined" />
            <Chip label={`${longStops.length} paradas largas`} size="small" color="warning" variant="outlined" />
          </Stack>
        )}

        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={MAP_CENTER}
          zoom={12}
          options={{
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true
          }}
          onLoad={setMapRef}
        >
          {/* Rutas por usuario - Líneas de trayectoria */}
          {Object.entries(pointsByUser).map(([userId, points]) => {
            if (points.length < 2) return null;
            const userColor = getUserColor(userId);
            return (
              <Polyline
                key={userId}
                path={points.map(p => ({ lat: p.location.latitude, lng: p.location.longitude }))}
                options={{
                  strokeColor: userColor,
                  strokeOpacity: 0.8,
                  strokeWeight: 5,
                  geodesic: true,
                  icons: [{
                    icon: {
                      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 2.5,
                      fillColor: userColor,
                      fillOpacity: 1,
                      strokeColor: 'white',
                      strokeWeight: 1
                    },
                    offset: '100%',
                    repeat: '80px'
                  }]
                }}
              />
            );
          })}

          {/* Puntos de ruta - Marcadores pequeños en la trayectoria */}
          {locationPoints.map((point) => (
            <Marker
              key={point.id}
              position={{ lat: point.location.latitude, lng: point.location.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: getUserColor(point.userId),
                fillOpacity: 0.6,
                strokeColor: 'white',
                strokeWeight: 2
              }}
              onClick={() => {
                setSelectedPoint(point);
                setSelectedVisit(null);
                setSelectedLongStop(null);
              }}
            />
          ))}

          {/* Visitas a kioscos (verde) */}
          {kioskVisits.map((visit) => (
            <Marker
              key={visit.id}
              position={{ lat: visit.checkInLocation.latitude, lng: visit.checkInLocation.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 15,
                fillColor: COLORS.kiosk,
                fillOpacity: 0.9,
                strokeColor: 'white',
                strokeWeight: 3
              }}
              label={{
                text: '🏪',
                fontSize: '20px'
              }}
              onClick={() => {
                setSelectedVisit(visit);
                setSelectedPoint(null);
                setSelectedLongStop(null);
              }}
            />
          ))}

          {/* Paradas largas (naranja) - detectadas automáticamente */}
          {longStops.map((stop) => (
            <Marker
              key={stop.id}
              position={{ lat: stop.location.latitude, lng: stop.location.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: COLORS.longStop,
                fillOpacity: 0.9,
                strokeColor: 'white',
                strokeWeight: 3
              }}
              label={{
                text: '🛑',
                fontSize: '18px'
              }}
              onClick={() => {
                setSelectedLongStop(stop);
                setSelectedPoint(null);
              }}
            />
          ))}

          {/* Info puntos */}
          {selectedPoint && (
            <InfoWindow
              position={{ lat: selectedPoint.location.latitude, lng: selectedPoint.location.longitude }}
              onCloseClick={() => setSelectedPoint(null)}
            >
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Punto de Ruta</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2"><strong>Promotor:</strong> {getUserName(selectedPoint.userId)}</Typography>
                <Typography variant="body2"><strong>Hora:</strong> {formatTime(selectedPoint.timestamp)}</Typography>
                {selectedPoint.accuracy && (
                  <Typography variant="body2"><strong>Precisión:</strong> ±{selectedPoint.accuracy.toFixed(0)}m</Typography>
                )}
              </Box>
            </InfoWindow>
          )}

          {/* Info paradas largas */}
          {selectedLongStop && (
            <InfoWindow
              position={{ lat: selectedLongStop.location.latitude, lng: selectedLongStop.location.longitude }}
              onCloseClick={() => setSelectedLongStop(null)}
            >
              <Box sx={{ p: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>🛑 Parada Larga</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2"><strong>Promotor:</strong> {getUserName(selectedLongStop.userId)}</Typography>
                <Typography variant="body2"><strong>Hora:</strong> {formatTime(selectedLongStop.startTime)}</Typography>
                <Typography variant="body2"><strong>Duración:</strong> ~{selectedLongStop.durationMinutes} min</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Estuvo más de 15 minutos en un radio de 100 metros
                </Typography>
                <Chip
                  label="Detectada automáticamente"
                  size="small"
                  color="warning"
                  sx={{ mt: 1 }}
                />
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>
      </Box>

      {/* Drawer lateral */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 350, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Detalles</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {longStops.length > 0 && (
            <>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                🛑 Paradas Largas ({longStops.length})
              </Typography>
              <List dense>
                {longStops.map((stop) => (
                  <ListItem
                    key={stop.id}
                    button
                    onClick={() => {
                      setSelectedLongStop(stop);
                      setDrawerOpen(false);
                      if (mapRef) {
                        mapRef.panTo({ lat: stop.location.latitude, lng: stop.location.longitude });
                        mapRef.setZoom(16);
                      }
                    }}
                  >
                    <ListItemIcon>
                      <PlaceIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={getUserName(stop.userId)}
                      secondary={
                        <>
                          <Typography variant="caption" display="block">
                            {formatTime(stop.startTime)}
                          </Typography>
                          <Typography variant="caption" display="block">
                            ~{stop.durationMinutes} minutos
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default RutasPromotores;
