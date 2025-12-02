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
  Tooltip,
  IconButton
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';
import TodayIcon from '@mui/icons-material/Today';
import PlaceIcon from '@mui/icons-material/Place';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  kioskId: string;
  kioskName: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  durationMinutes?: number;
  checkInLocation: GeoPoint;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<KioskVisit | null>(null);

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

    // LIMPIAR COMPLETAMENTE el estado anterior
    setLocationPoints([]);
    setKioskVisits([]);
    setSelectedPoint(null);
    setSelectedVisit(null);

    try {
      const startDateObj = new Date(startDate + 'T00:00:00');
      const endDateObj = new Date(endDate + 'T23:59:59');
      const startTimestamp = Timestamp.fromDate(startDateObj);
      const endTimestamp = Timestamp.fromDate(endDateObj);

      const allPoints: LocationPoint[] = [];
      const allVisits: KioskVisit[] = [];

      for (const userId of selectedUserIds) {
        // Cargar ubicaciones
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
            location: data.location || data.geoPoint,
            accuracy: data.accuracy,
            userId: userId
          };
        });
        allPoints.push(...userPoints);

        // Cargar visitas a kioscos
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
            kioskId: data.kioskId,
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

      if (allPoints.length === 0 && allVisits.length === 0) {
        setError('No se encontraron datos para los promotores seleccionados en este periodo');
      } else {
        setLocationPoints(allPoints);
        setKioskVisits(allVisits);

        // Ajustar mapa
        if (mapRef && (allPoints.length > 0 || allVisits.length > 0)) {
          const bounds = new google.maps.LatLngBounds();
          allPoints.forEach(p => bounds.extend({ lat: p.location.latitude, lng: p.location.longitude }));
          allVisits.forEach(v => bounds.extend({ lat: v.checkInLocation.latitude, lng: v.checkInLocation.longitude }));
          mapRef.fitBounds(bounds);
        }
      }
    } catch (err: any) {
      console.error('Error loading route:', err);
      setError(err.message || 'Error al cargar la ruta');
      setLocationPoints([]);
      setKioskVisits([]);
    } finally {
      setLoading(false);
    }
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

  const hasData = locationPoints.length > 0 || kioskVisits.length > 0;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header compacto fijo */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <RouteIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Rutas de Promotores
            </Typography>
          </Stack>
          {hasData && (
            <Tooltip title="Recargar">
              <IconButton onClick={handleLoadRoute} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
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

        {/* Filtros principales */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Autocomplete
            multiple
            sx={{ flex: 1, minWidth: 300 }}
            options={users}
            value={users.filter(u => selectedUserIds.includes(u.id))}
            onChange={(_, newValue) => setSelectedUserIds(newValue.map(u => u.id))}
            getOptionLabel={(option) => option.displayName}
            renderOption={(props, option) => (
              <li {...props}>
                <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                {option.displayName}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({option.email})
                </Typography>
              </li>
            )}
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

        {/* Estadísticas compactas */}
        {hasData && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip
              icon={<PersonIcon />}
              label={`${selectedUserIds.length} promotor${selectedUserIds.length !== 1 ? 'es' : ''}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<PlaceIcon />}
              label={`${locationPoints.length} puntos`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<StorefrontIcon />}
              label={`${kioskVisits.length} visita${kioskVisits.length !== 1 ? 's' : ''} a kioscos`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Stack>
        )}
      </Paper>

      {/* Mapa pantalla completa */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
          {/* Polylines por usuario */}
          {Object.entries(pointsByUser).map(([userId, points]) => {
            if (points.length < 2) return null;
            return (
              <Polyline
                key={userId}
                path={points.map(p => ({ lat: p.location.latitude, lng: p.location.longitude }))}
                options={{
                  strokeColor: getUserColor(userId),
                  strokeOpacity: 0.7,
                  strokeWeight: 3,
                  icons: [{
                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2 },
                    offset: '100%',
                    repeat: '100px'
                  }]
                }}
              />
            );
          })}

          {/* Marcadores de ubicación */}
          {locationPoints.map((point) => (
            <Marker
              key={point.id}
              position={{ lat: point.location.latitude, lng: point.location.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: getUserColor(point.userId),
                fillOpacity: 0.8,
                strokeColor: 'white',
                strokeWeight: 1.5
              }}
              onClick={() => {
                setSelectedPoint(point);
                setSelectedVisit(null);
              }}
            />
          ))}

          {/* Marcadores de visitas a kioscos */}
          {kioskVisits.map((visit) => (
            <Marker
              key={visit.id}
              position={{ lat: visit.checkInLocation.latitude, lng: visit.checkInLocation.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: visit.status === 'COMPLETED' ? '#4CAF50' : visit.status === 'ACTIVE' ? '#2196F3' : '#FF9800',
                fillOpacity: 0.9,
                strokeColor: 'white',
                strokeWeight: 2
              }}
              label={{
                text: '🏪',
                fontSize: '16px'
              }}
              onClick={() => {
                setSelectedVisit(visit);
                setSelectedPoint(null);
              }}
            />
          ))}

          {/* InfoWindow para puntos */}
          {selectedPoint && (
            <InfoWindow
              position={{ lat: selectedPoint.location.latitude, lng: selectedPoint.location.longitude }}
              onCloseClick={() => setSelectedPoint(null)}
            >
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Punto de Ubicación
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">
                  <strong>Promotor:</strong> {getUserName(selectedPoint.userId)}
                </Typography>
                <Typography variant="body2">
                  <strong>Hora:</strong> {formatTime(selectedPoint.timestamp)}
                </Typography>
                {selectedPoint.accuracy && (
                  <Typography variant="body2">
                    <strong>Precisión:</strong> ±{selectedPoint.accuracy.toFixed(0)}m
                  </Typography>
                )}
              </Box>
            </InfoWindow>
          )}

          {/* InfoWindow para visitas */}
          {selectedVisit && (
            <InfoWindow
              position={{ lat: selectedVisit.checkInLocation.latitude, lng: selectedVisit.checkInLocation.longitude }}
              onCloseClick={() => setSelectedVisit(null)}
            >
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  🏪 Visita a Kiosco
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">
                  <strong>Kiosco:</strong> {selectedVisit.kioskName}
                </Typography>
                <Typography variant="body2">
                  <strong>Promotor:</strong> {selectedVisit.userName}
                </Typography>
                <Typography variant="body2">
                  <strong>Entrada:</strong> {formatTime(selectedVisit.checkInTime)}
                </Typography>
                {selectedVisit.checkOutTime && (
                  <Typography variant="body2">
                    <strong>Salida:</strong> {formatTime(selectedVisit.checkOutTime)}
                  </Typography>
                )}
                {selectedVisit.durationMinutes && (
                  <Typography variant="body2">
                    <strong>Duración:</strong> {formatDuration(selectedVisit.durationMinutes)}
                  </Typography>
                )}
                <Chip
                  label={selectedVisit.status === 'COMPLETED' ? 'Completada' : selectedVisit.status === 'ACTIVE' ? 'En curso' : 'Abandonada'}
                  size="small"
                  color={selectedVisit.status === 'COMPLETED' ? 'success' : selectedVisit.status === 'ACTIVE' ? 'primary' : 'warning'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Mensaje cuando no hay datos */}
        {!hasData && !loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <RouteIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Selecciona promotores y periodo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Haz clic en "Cargar Rutas" para visualizar
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RutasPromotores;
