import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  CardContent
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimelineIcon from '@mui/icons-material/Timeline';
import PlaceIcon from '@mui/icons-material/Place';
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
}

const RutasPromotores: React.FC = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null);

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
    if (!selectedUserId) {
      setError('Por favor selecciona un promotor');
      return;
    }

    setLoading(true);
    setError(null);
    setLocationPoints([]);

    try {
      // Convertir fechas a Timestamps
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);

      const startTimestamp = Timestamp.fromDate(startDateObj);
      const endTimestamp = Timestamp.fromDate(endDateObj);

      // Buscar ubicaciones del usuario en el rango de fechas
      const q = query(
        collection(db, 'locations'),
        where('userId', '==', selectedUserId),
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);

      const points: LocationPoint[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp,
          location: data.location || data.geoPoint,
          accuracy: data.accuracy,
          activity: data.activity,
          kioskName: data.kioskName,
          kioskId: data.kioskId
        };
      });

      if (points.length === 0) {
        setError('No se encontraron ubicaciones para este promotor en el rango de fechas seleccionado');
      } else {
        setLocationPoints(points);

        // Centrar mapa en la ruta
        if (mapRef && points.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          points.forEach(point => {
            bounds.extend({ lat: point.location.latitude, lng: point.location.longitude });
          });
          mapRef.fitBounds(bounds);
        }
      }
    } catch (err: any) {
      console.error('Error loading route:', err);
      setError(err.message || 'Error al cargar la ruta');
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

  const selectedUser = users.find(u => u.id === selectedUserId);
  const pathCoordinates = locationPoints.map(point => ({
    lat: point.location.latitude,
    lng: point.location.longitude
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <RouteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Rutas de Promotores
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visualiza las rutas y ubicaciones de los promotores durante sus jornadas
        </Typography>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
          <FormControl sx={{ minWidth: 300, flex: 1 }}>
            <InputLabel>Promotor</InputLabel>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              label="Promotor"
            >
              <MenuItem value="">
                <em>Selecciona un promotor</em>
              </MenuItem>
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" />
                    <span>{user.displayName}</span>
                    <Typography variant="caption" color="text.secondary">
                      ({user.email})
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Fecha Inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="Fecha Fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />

          <Button
            variant="contained"
            onClick={handleLoadRoute}
            disabled={loading || !selectedUserId}
            sx={{ minHeight: 56 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Cargar Ruta'}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      {locationPoints.length > 0 && selectedUser && (
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PersonIcon color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Promotor
                    </Typography>
                    <Typography variant="h6">{selectedUser.displayName}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PlaceIcon color="primary" />
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
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TimelineIcon color="primary" />
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
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarTodayIcon color="primary" />
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
        </Box>
      )}

      {/* Contenedor del mapa y lista */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 500px)', minHeight: 500 }}>
        {/* Panel lateral con puntos */}
        {locationPoints.length > 0 && (
          <Paper sx={{ width: 350, overflow: 'auto' }}>
            <Box sx={{ p: 2, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Puntos de Ubicación ({locationPoints.length})
              </Typography>
              <Divider />
            </Box>
            <List dense>
              {locationPoints.map((point, index) => (
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
                    borderLeft: 3,
                    borderColor: index === 0 ? 'success.main' :
                                 index === locationPoints.length - 1 ? 'error.main' :
                                 'primary.main'
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color={index === 0 ? 'success' :
                                 index === locationPoints.length - 1 ? 'error' :
                                 'default'}
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {formatTime(point.timestamp)}
                        </Typography>
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
                          Lat: {point.location.latitude.toFixed(5)}, Lng: {point.location.longitude.toFixed(5)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* Mapa */}
        <Paper sx={{ flex: 1, position: 'relative' }}>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={MAP_CENTER}
            zoom={12}
            options={{
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true
            }}
            onLoad={setMapRef}
          >
            {/* Polyline conectando los puntos */}
            {pathCoordinates.length > 1 && (
              <Polyline
                path={pathCoordinates}
                options={{
                  strokeColor: '#2196F3',
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                  icons: [{
                    icon: {
                      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 2,
                      strokeColor: '#1976D2'
                    },
                    offset: '100%',
                    repeat: '50px'
                  }]
                }}
              />
            )}

            {/* Marcadores para cada punto */}
            {locationPoints.map((point, index) => (
              <Marker
                key={point.id}
                position={{ lat: point.location.latitude, lng: point.location.longitude }}
                label={{
                  text: `${index + 1}`,
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: index === 0 ? '#4CAF50' :
                             index === locationPoints.length - 1 ? '#F44336' :
                             '#2196F3',
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

          {locationPoints.length === 0 && !loading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}
            >
              <RouteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Selecciona un promotor y rango de fechas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Luego haz clic en "Cargar Ruta" para visualizar el recorrido
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default RutasPromotores;
