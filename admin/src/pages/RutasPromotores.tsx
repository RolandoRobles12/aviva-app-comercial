import React, { useState, useEffect } from 'react';
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
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';
import TodayIcon from '@mui/icons-material/Today';
import PlaceIcon from '@mui/icons-material/Place';
import StorefrontIcon from '@mui/icons-material/Storefront';
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

interface KioskVisit {
  id: string;
  userId: string;
  userName: string;
  kioskName: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  durationMinutes?: number;
  checkInLocation: GeoPoint;
  status: string;
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
  const [kioskVisits, setKioskVisits] = useState<KioskVisit[]>([]);
  const [longStops, setLongStops] = useState<LongStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<KioskVisit | null>(null);
  const [selectedLongStop, setSelectedLongStop] = useState<LongStop | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setKioskVisits([]);
    setLongStops([]);
    setSelectedPoint(null);
    setSelectedVisit(null);
    setSelectedLongStop(null);

    try {
      const startDateObj = new Date(startDate + 'T00:00:00');
      const endDateObj = new Date(endDate + 'T23:59:59');
      const startTimestamp = Timestamp.fromDate(startDateObj);
      const endTimestamp = Timestamp.fromDate(endDateObj);

      const allPoints: LocationPoint[] = [];
      const allVisits: KioskVisit[] = [];

      for (const userId of selectedUserIds) {
        // Cargar ubicaciones de la colección 'locations' que YA EXISTE
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

        // Cargar visitas a kioscos de la colección 'kioskVisits' que YA EXISTE
        const visitsQuery = query(
          collection(db, 'kioskVisits'),
          where('userId', '==', userId),
          where('checkInTime', '>=', startTimestamp),
          where('checkInTime', '<=', endTimestamp)
        );

        const visitsSnapshot = await getDocs(visitsQuery);
        const userVisits: KioskVisit[] = visitsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            kioskName: data.kioskName,
            checkInTime: data.checkInTime,
            checkOutTime: data.checkOutTime,
            durationMinutes: data.durationMinutes,
            checkInLocation: data.checkInLocation,
            status: data.status
          };
        });
        allVisits.push(...userVisits);
      }

      allPoints.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

      // Detectar paradas largas (misma lógica que la app Android)
      const detectedLongStops = detectLongStops(allPoints);

      setLocationPoints(allPoints);
      setKioskVisits(allVisits);
      setLongStops(detectedLongStops);

      // Ajustar vista del mapa a las rutas cargadas
      if (mapRef && (allPoints.length > 0 || allVisits.length > 0 || detectedLongStops.length > 0)) {
        const bounds = new google.maps.LatLngBounds();
        allPoints.forEach(p => bounds.extend({ lat: p.location.latitude, lng: p.location.longitude }));
        allVisits.forEach(v => bounds.extend({ lat: v.checkInLocation.latitude, lng: v.checkInLocation.longitude }));
        detectedLongStops.forEach(s => bounds.extend({ lat: s.location.latitude, lng: s.location.longitude }));

        // Ajustar el mapa con padding para mejor visualización
        mapRef.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50
        });
      }

      if (allPoints.length === 0 && allVisits.length === 0) {
        setError(`No se encontraron datos de ubicación para ${selectedUserIds.length > 1 ? 'los promotores seleccionados' : 'el promotor seleccionado'} en el periodo del ${startDate} al ${endDate}. Verifica que el promotor haya registrado ubicaciones en este periodo.`);
      } else {
        // Mensaje de éxito
        const pointsMsg = allPoints.length > 0 ? `${allPoints.length} puntos de ubicación` : '';
        const visitsMsg = allVisits.length > 0 ? `${allVisits.length} visitas a kioscos` : '';
        const separator = pointsMsg && visitsMsg ? ' y ' : '';
        console.log(`✅ Rutas cargadas: ${pointsMsg}${separator}${visitsMsg}`);
      }
    } catch (err: any) {
      console.error('Error loading route:', err);
      setError(err.message || 'Error al cargar las rutas');
      setLocationPoints([]);
      setKioskVisits([]);
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
    const colors = ['#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'];
    const index = selectedUserIds.indexOf(userId);
    return colors[index % colors.length];
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
        <CircularProgress />
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

  const hasData = locationPoints.length > 0 || kioskVisits.length > 0 || longStops.length > 0;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header compacto */}
      <Paper elevation={2} sx={{ p: 2, borderRadius: 0, zIndex: 1200 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <RouteIcon color="primary" fontSize="large" />
          <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
            Rutas de Promotores
          </Typography>
          {hasData && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MenuIcon />}
              onClick={() => setDrawerOpen(true)}
            >
              Ver Detalles
            </Button>
          )}
        </Stack>

        {/* Filtros rápidos */}
        <ToggleButtonGroup
          value={quickFilter}
          exclusive
          onChange={(_, newFilter) => newFilter && setQuickFilter(newFilter)}
          size="small"
          sx={{ mb: 2, flexWrap: 'wrap' }}
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

        {/* Controles */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Autocomplete
            multiple
            sx={{ flex: 1, minWidth: 300 }}
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

          <TextField
            label="Fecha Inicio"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setQuickFilter('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
            disabled={quickFilter !== 'custom'}
          />

          <TextField
            label="Fecha Fin"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setQuickFilter('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
            disabled={quickFilter !== 'custom'}
          />

          <Button
            variant="contained"
            onClick={handleLoadRoute}
            disabled={loading || selectedUserIds.length === 0}
            sx={{ minWidth: 140 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Cargar Rutas'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Stats */}
        {hasData && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Chip icon={<PersonIcon />} label={`${selectedUserIds.length} promotor${selectedUserIds.length !== 1 ? 'es' : ''}`} size="small" color="primary" variant="outlined" />
            <Chip icon={<PlaceIcon />} label={`${locationPoints.length} punto${locationPoints.length !== 1 ? 's' : ''} de ruta`} size="small" color="primary" variant="outlined" />
            <Chip icon={<StorefrontIcon />} label={`${kioskVisits.length} visita${kioskVisits.length !== 1 ? 's' : ''} a kioscos`} size="small" color="success" variant="outlined" />
            {longStops.length > 0 && (
              <Chip label={`${longStops.length} parada${longStops.length !== 1 ? 's' : ''} larga${longStops.length !== 1 ? 's' : ''}`} size="small" color="warning" variant="outlined" />
            )}
          </Stack>
        )}
      </Paper>

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
                fillColor: '#4CAF50',
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
                fillColor: '#FF9800',
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
                setSelectedVisit(null);
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

          {/* Info visitas kiosco */}
          {selectedVisit && (
            <InfoWindow
              position={{ lat: selectedVisit.checkInLocation.latitude, lng: selectedVisit.checkInLocation.longitude }}
              onCloseClick={() => setSelectedVisit(null)}
            >
              <Box sx={{ p: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>🏪 Visita a Kiosco</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2"><strong>Kiosco:</strong> {selectedVisit.kioskName}</Typography>
                <Typography variant="body2"><strong>Promotor:</strong> {selectedVisit.userName}</Typography>
                <Typography variant="body2"><strong>Entrada:</strong> {formatTime(selectedVisit.checkInTime)}</Typography>
                {selectedVisit.checkOutTime && (
                  <Typography variant="body2"><strong>Salida:</strong> {formatTime(selectedVisit.checkOutTime)}</Typography>
                )}
                {selectedVisit.durationMinutes && (
                  <Typography variant="body2"><strong>Duración:</strong> {formatDuration(selectedVisit.durationMinutes)}</Typography>
                )}
                <Chip
                  label={selectedVisit.status === 'COMPLETED' ? 'Completada' : 'Activa'}
                  size="small"
                  color="success"
                  sx={{ mt: 1 }}
                />
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

        {/* Indicador de carga */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              p: 4,
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1100
            }}
          >
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.primary" fontWeight={600}>
              Cargando rutas...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Obteniendo datos de ubicación
            </Typography>
          </Box>
        )}

        {/* Mensaje inicial */}
        {!hasData && !loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              p: 4,
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1
            }}
          >
            <RouteIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" color="text.primary" gutterBottom fontWeight={600}>
              Visualización de Rutas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              1. Selecciona uno o más promotores
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              2. Elige el periodo de tiempo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              3. Haz clic en "Cargar Rutas"
            </Typography>
          </Box>
        )}
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

          {kioskVisits.length > 0 && (
            <>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                🏪 Kioscos ({kioskVisits.length})
              </Typography>
              <List dense>
                {kioskVisits.map((visit) => (
                  <ListItem
                    key={visit.id}
                    button
                    onClick={() => {
                      setSelectedVisit(visit);
                      setDrawerOpen(false);
                      if (mapRef) {
                        mapRef.panTo({ lat: visit.checkInLocation.latitude, lng: visit.checkInLocation.longitude });
                        mapRef.setZoom(16);
                      }
                    }}
                  >
                    <ListItemIcon>
                      <StorefrontIcon color="success" />
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
                    />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 2 }} />
            </>
          )}

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
