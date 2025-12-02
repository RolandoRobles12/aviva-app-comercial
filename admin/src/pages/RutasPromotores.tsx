import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimelineIcon from '@mui/icons-material/Timeline';
import PlaceIcon from '@mui/icons-material/Place';
import TodayIcon from '@mui/icons-material/Today';
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

// IMPORTANTE: libraries debe ser constante fuera del componente
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ['places', 'geometry'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 }; // Ciudad de México

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
  activity?: string;
  kioskName?: string;
  kioskId?: string;
  userId: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null);

  // Función para obtener fechas según el filtro rápido
  const getDateRangeForFilter = (filter: QuickFilter): { start: string; end: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today': {
        const dateStr = today.toISOString().split('T')[0];
        return { start: dateStr, end: dateStr };
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        return { start: dateStr, end: dateStr };
      }
      case 'thisWeek': {
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay()); // Domingo
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6); // Sábado
        return {
          start: firstDay.toISOString().split('T')[0],
          end: lastDay.toISOString().split('T')[0]
        };
      }
      case 'lastWeek': {
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay() - 7);
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        return {
          start: firstDay.toISOString().split('T')[0],
          end: lastDay.toISOString().split('T')[0]
        };
      }
      case 'thisMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: firstDay.toISOString().split('T')[0],
          end: lastDay.toISOString().split('T')[0]
        };
      }
      case 'lastMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: firstDay.toISOString().split('T')[0],
          end: lastDay.toISOString().split('T')[0]
        };
      }
      case 'custom':
      default:
        return { start: startDate, end: endDate };
    }
  };

  // Inicializar fechas con el filtro de hoy
  useEffect(() => {
    const { start, end } = getDateRangeForFilter('today');
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Actualizar fechas cuando cambia el filtro rápido
  useEffect(() => {
    if (quickFilter !== 'custom') {
      const { start, end } = getDateRangeForFilter(quickFilter);
      setStartDate(start);
      setEndDate(end);
    }
  }, [quickFilter]);

  // Cargar usuarios
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
    setLocationPoints([]); // Limpiar rutas anteriores
    setSelectedPoint(null); // Limpiar punto seleccionado

    try {
      // Convertir fechas a Timestamps (usando hora local, no UTC)
      const startDateObj = new Date(startDate + 'T00:00:00');
      const endDateObj = new Date(endDate + 'T23:59:59');

      const startTimestamp = Timestamp.fromDate(startDateObj);
      const endTimestamp = Timestamp.fromDate(endDateObj);

      // Buscar ubicaciones para todos los usuarios seleccionados
      const allPoints: LocationPoint[] = [];

      for (const userId of selectedUserIds) {
        const q = query(
          collection(db, 'locations'),
          where('userId', '==', userId),
          where('timestamp', '>=', startTimestamp),
          where('timestamp', '<=', endTimestamp),
          orderBy('timestamp', 'asc')
        );

        const snapshot = await getDocs(q);

        const userPoints: LocationPoint[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            timestamp: data.timestamp,
            location: data.location || data.geoPoint,
            accuracy: data.accuracy,
            activity: data.activity,
            kioskName: data.kioskName,
            kioskId: data.kioskId,
            userId: userId
          };
        });

        allPoints.push(...userPoints);
      }

      // Ordenar todos los puntos por timestamp
      allPoints.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

      if (allPoints.length === 0) {
        setError('No se encontraron ubicaciones para los promotores seleccionados en el rango de fechas');
        setLocationPoints([]); // Asegurar que se limpien las rutas viejas
      } else {
        setLocationPoints(allPoints);

        // Centrar mapa en la ruta
        if (mapRef && allPoints.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          allPoints.forEach(point => {
            bounds.extend({ lat: point.location.latitude, lng: point.location.longitude });
          });
          mapRef.fitBounds(bounds);
        }
      }
    } catch (err: any) {
      console.error('Error loading route:', err);
      setError(err.message || 'Error al cargar la ruta');
      setLocationPoints([]); // Limpiar rutas en caso de error
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: Timestamp): string => {
    return timestamp.toDate().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: Timestamp): string => {
    return timestamp.toDate().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
    const R = 6371000; // Earth radius in meters
    const lat1 = (point1.latitude * Math.PI) / 180;
    const lat2 = (point2.latitude * Math.PI) / 180;
    const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getTotalDistance = (): number => {
    let total = 0;
    for (let i = 1; i < locationPoints.length; i++) {
      total += calculateDistance(locationPoints[i - 1].location, locationPoints[i].location);
    }
    return total;
  };

  const getUserColor = (userId: string): string => {
    const colors = ['#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'];
    const index = selectedUserIds.indexOf(userId);
    return colors[index % colors.length];
  };

  const getUserName = (userId: string): string => {
    return users.find(u => u.id === userId)?.displayName || 'Desconocido';
  };

  if (loadError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Error al cargar Google Maps: {loadError.message}
        </Alert>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          ⚠️ API Key de Google Maps no configurada
        </Alert>
      </Box>
    );
  }

  // Agrupar puntos por usuario para diferentes polylines
  const pointsByUser = selectedUserIds.reduce((acc, userId) => {
    acc[userId] = locationPoints.filter(p => p.userId === userId);
    return acc;
  }, {} as Record<string, LocationPoint[]>);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header y filtros - posición fija */}
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          top: 64,
          left: 270,
          right: 0,
          zIndex: 1100,
          p: 2,
          borderRadius: 0
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RouteIcon />
          Rutas de Promotores
        </Typography>

        {/* Filtros rápidos */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Periodo:
          </Typography>
          <ToggleButtonGroup
            value={quickFilter}
            exclusive
            onChange={(_, newFilter) => {
              if (newFilter !== null) {
                setQuickFilter(newFilter);
              }
            }}
            size="small"
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value="today">
              <TodayIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Hoy
            </ToggleButton>
            <ToggleButton value="yesterday">Ayer</ToggleButton>
            <ToggleButton value="thisWeek">Esta Semana</ToggleButton>
            <ToggleButton value="lastWeek">Semana Pasada</ToggleButton>
            <ToggleButton value="thisMonth">Este Mes</ToggleButton>
            <ToggleButton value="lastMonth">Mes Pasado</ToggleButton>
            <ToggleButton value="custom">Personalizado</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
          <FormControl sx={{ minWidth: 300, flex: 1 }}>
            <Autocomplete
              multiple
              options={users}
              value={users.filter(u => selectedUserIds.includes(u.id))}
              onChange={(_, newValue) => setSelectedUserIds(newValue.map(u => u.id))}
              getOptionLabel={(option) => option.displayName}
              renderOption={(props, option) => (
                <li {...props}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" />
                    <span>{option.displayName}</span>
                    <Typography variant="caption" color="text.secondary">
                      ({option.email})
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Promotores"
                  placeholder="Selecciona uno o más promotores"
                />
              )}
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
          </FormControl>

          <TextField
            label="Fecha Inicio"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setQuickFilter('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
            disabled={quickFilter !== 'custom'}
          />

          <TextField
            label="Fecha Fin"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setQuickFilter('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
            disabled={quickFilter !== 'custom'}
          />

          <Button
            variant="contained"
            onClick={handleLoadRoute}
            disabled={loading || selectedUserIds.length === 0}
            sx={{ minHeight: 56, minWidth: 150 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Cargar Rutas'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Estadísticas */}
        {locationPoints.length > 0 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PersonIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Promotores
                    </Typography>
                    <Typography variant="h6">{selectedUserIds.length}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PlaceIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Puntos Registrados
                    </Typography>
                    <Typography variant="h6">{locationPoints.length}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TimelineIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Distancia Total
                    </Typography>
                    <Typography variant="h6">
                      {(getTotalDistance() / 1000).toFixed(2)} km
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarTodayIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Periodo
                    </Typography>
                    <Typography variant="body2">
                      {startDate === endDate ? startDate : `${startDate} - ${endDate}`}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}
      </Paper>

      {/* Contenedor del mapa - pantalla completa */}
      <Box
        sx={{
          position: 'fixed',
          top: locationPoints.length > 0 ? 310 : 240,
          left: 270,
          right: 0,
          bottom: 0,
          display: 'flex',
          gap: 0
        }}
      >
        {/* Panel lateral con puntos */}
        {locationPoints.length > 0 && (
          <Paper
            sx={{
              width: 350,
              overflow: 'auto',
              borderRadius: 0,
              borderRight: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ p: 2, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Puntos de Ubicación ({locationPoints.length})
              </Typography>
            </Box>
            <List dense>
              {locationPoints.map((point, index) => {
                const userName = getUserName(point.userId);
                const userColor = getUserColor(point.userId);

                return (
                  <ListItem
                    key={point.id}
                    button
                    selected={selectedPoint?.id === point.id}
                    onClick={() => {
                      setSelectedPoint(point);
                      if (mapRef) {
                        mapRef.panTo({
                          lat: point.location.latitude,
                          lng: point.location.longitude
                        });
                        mapRef.setZoom(16);
                      }
                    }}
                    sx={{
                      borderLeft: 4,
                      borderColor: userColor
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            sx={{ bgcolor: userColor, color: 'white' }}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            {formatTime(point.timestamp)}
                          </Typography>
                          <Chip label={userName} size="small" variant="outlined" />
                        </Stack>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {formatDate(point.timestamp)}
                          </Typography>
                          {point.kioskName && (
                            <Chip
                              label={point.kioskName}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary" display="block">
                            {point.location.latitude.toFixed(5)}, {point.location.longitude.toFixed(5)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        )}

        {/* Mapa */}
        <Box sx={{ flex: 1, position: 'relative' }}>
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
            {/* Polylines para cada usuario */}
            {Object.entries(pointsByUser).map(([userId, points]) => {
              if (points.length < 2) return null;

              const pathCoordinates = points.map(p => ({
                lat: p.location.latitude,
                lng: p.location.longitude
              }));

              return (
                <Polyline
                  key={userId}
                  path={pathCoordinates}
                  options={{
                    strokeColor: getUserColor(userId),
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    icons: [{
                      icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 2,
                        strokeColor: getUserColor(userId)
                      },
                      offset: '100%',
                      repeat: '80px'
                    }]
                  }}
                />
              );
            })}

            {/* Marcadores para cada punto */}
            {locationPoints.map((point, index) => (
              <Marker
                key={point.id}
                position={{ lat: point.location.latitude, lng: point.location.longitude }}
                label={{
                  text: `${index + 1}`,
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: getUserColor(point.userId),
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 2
                }}
                onClick={() => setSelectedPoint(point)}
              />
            ))}

            {/* Info Window */}
            {selectedPoint && (
              <InfoWindow
                position={{
                  lat: selectedPoint.location.latitude,
                  lng: selectedPoint.location.longitude
                }}
                onCloseClick={() => setSelectedPoint(null)}
              >
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Punto #{locationPoints.findIndex(p => p.id === selectedPoint.id) + 1}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Promotor:</strong> {getUserName(selectedPoint.userId)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha:</strong> {formatDate(selectedPoint.timestamp)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Hora:</strong> {formatTime(selectedPoint.timestamp)}
                  </Typography>
                  {selectedPoint.kioskName && (
                    <Typography variant="body2">
                      <strong>Kiosco:</strong> {selectedPoint.kioskName}
                    </Typography>
                  )}
                  {selectedPoint.accuracy && (
                    <Typography variant="body2">
                      <strong>Precisión:</strong> ±{selectedPoint.accuracy.toFixed(0)}m
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {selectedPoint.location.latitude.toFixed(6)}, {selectedPoint.location.longitude.toFixed(6)}
                  </Typography>
                </Box>
              </InfoWindow>
            )}
          </GoogleMap>

          {/* Overlay solo cuando NO hay datos y NO está cargando */}
          {locationPoints.length === 0 && !loading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}
            >
              <RouteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                Selecciona promotores y un periodo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Luego haz clic en "Cargar Rutas"
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default RutasPromotores;
