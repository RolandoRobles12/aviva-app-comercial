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
  ListItemButton,
  Tabs,
  Tab
} from '@mui/material';
import ReportesRutas from './ReportesRutas';
import ReporteProductividad from './ReporteProductividad';
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
import { GoogleMap, useLoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  GeoPoint
} from 'firebase/firestore';
import { db } from '../config/firebase';

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ['places', 'geometry'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 };

const COLORS = {
  routes: ['#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'],
  kiosk: '#4CAF50',
  longStop: '#FF9800',
  point: '#2196F3',
  home: '#F59E0B',
};

const createHomeIconRutas = (): string =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#F59E0B" opacity="0.25"/>
      <circle cx="18" cy="18" r="12" fill="#F59E0B" opacity="0.7"/>
      <path d="M18 9 L27 17 L25 17 L25 27 L21 27 L21 22 L15 22 L15 27 L11 27 L11 17 L9 17 Z" fill="white"/>
    </svg>
  `)}`;

interface User {
  id: string;
  uid: string; // Firebase Auth UID — used for location queries. May differ from id for admin-created users.
  displayName: string;
  email: string;
  homeLat?: number;
  homeLng?: number;
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
  const [mainTab, setMainTab] = useState(0);

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
        const usersData: User[] = usersSnapshot.docs
          .map(doc => {
            const data = doc.data();
            // uid field stores Firebase Auth UID (set by Android app on first login).
            // For admin-created users that haven't linked yet, uid may be empty → fall back to doc.id.
            // After the AuthService migration fix, uid == doc.id for all properly-linked users.
            return {
              id: doc.id,
              uid: data.uid || doc.id,
              displayName: data.displayName || 'Sin nombre',
              email: data.email || '',
              homeLat: data.homeLat,
              homeLng: data.homeLng,
            };
          })
          // Exclude documents that have been superseded (migrated to another uid)
          .filter(u => !usersSnapshot.docs.find(d => d.id === u.id)?.data().migratedToUid);
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
        // Resolve Firebase Auth UID for this user.
        // For admin-created users, their Firestore doc ID differs from their Firebase Auth UID
        // (stored in the 'uid' field). Location documents always use the Firebase Auth UID.
        const user = users.find(u => u.id === userId);
        const locationUserId = user?.uid || userId;

        // Cargar ubicaciones de la colección 'locations' que YA EXISTE
        // Query simple sin rangos para evitar requerir índice compuesto
        // El filtrado de fechas se hace en memoria
        const locQuery = query(
          collection(db, 'locations'),
          where('userId', '==', locationUserId)
        );

        const locSnapshot = await getDocs(locQuery);
        const userPoints: LocationPoint[] = locSnapshot.docs
          .map(doc => {
            const data = doc.data();
            // Support both GeoPoint 'location' field and flat 'latitude'/'longitude' fields
            const lat = data.location?.latitude ?? data.latitude;
            const lng = data.location?.longitude ?? data.longitude;
            if (!data.timestamp || lat == null || lng == null) return null;
            return {
              id: doc.id,
              timestamp: data.timestamp,
              location: data.location ?? new GeoPoint(lat, lng),
              accuracy: data.accuracy,
              userId: userId
            } as LocationPoint;
          })
          .filter((point): point is LocationPoint => point !== null)
          // Filtrar por fecha en memoria (sin índice de Firebase)
          .filter(point => {
            const pointTime = point.timestamp.toMillis();
            return pointTime >= startTimestamp.toMillis() && pointTime <= endTimestamp.toMillis();
          });

        allPoints.push(...userPoints);

        // Cargar visitas a kioscos de la colección 'kioskVisits' que YA EXISTE
        // Query simple sin rangos
        const visitsQuery = query(
          collection(db, 'kioskVisits'),
          where('userId', '==', locationUserId)
        );

        const visitsSnapshot = await getDocs(visitsQuery);
        const userVisits: KioskVisit[] = visitsSnapshot.docs
          .map(doc => {
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
          })
          // Filtrar por fecha en memoria
          .filter(visit => {
            const visitTime = visit.checkInTime.toMillis();
            return visitTime >= startTimestamp.toMillis() && visitTime <= endTimestamp.toMillis();
          });

        allVisits.push(...userVisits);
      }

      allPoints.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

      // Detectar paradas largas (misma lógica que la app Android) y agrupar las cercanas
      const detectedLongStops = detectLongStops(allPoints);
      const clusteredStops = clusterLongStops(detectedLongStops);

      setLocationPoints(allPoints);
      setKioskVisits(allVisits);
      setLongStops(clusteredStops);

      // Ajustar vista del mapa a las rutas cargadas
      if (mapRef && (allPoints.length > 0 || allVisits.length > 0 || clusteredStops.length > 0)) {
        const bounds = new google.maps.LatLngBounds();
        allPoints.forEach(p => bounds.extend({ lat: p.location.latitude, lng: p.location.longitude }));
        allVisits.forEach(v => bounds.extend({ lat: v.checkInLocation.latitude, lng: v.checkInLocation.longitude }));
        clusteredStops.forEach(s => bounds.extend({ lat: s.location.latitude, lng: s.location.longitude }));

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

  /**
   * Detecta paradas largas (>15 min dentro de radio de 100m) usando ventana deslizante.
   * Agrupa puntos consecutivos cercanos y mide el tiempo total del grupo,
   * detectando correctamente paradas largas con múltiples puntos GPS intermedios.
   */
  const detectLongStops = (points: LocationPoint[]): LongStop[] => {
    const stops: LongStop[] = [];

    // Agrupar por usuario
    const pointsByUser = points.reduce((acc, point) => {
      if (!acc[point.userId]) acc[point.userId] = [];
      acc[point.userId].push(point);
      return acc;
    }, {} as Record<string, LocationPoint[]>);

    // Para cada usuario, detectar paradas largas con ventana deslizante
    Object.entries(pointsByUser).forEach(([userId, userPoints]) => {
      // Asegurar orden cronológico
      userPoints.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

      let windowStart = 0;

      while (windowStart < userPoints.length) {
        const anchor = userPoints[windowStart];
        let windowEnd = windowStart;

        // Expandir ventana mientras los puntos estén dentro del radio de 200m del anchor.
        // Sin break: permite GPS drift (un punto fuera del radio no rompe el grupo).
        for (let j = windowStart + 1; j < userPoints.length; j++) {
          const dist = calculateDistance(
            anchor.location.latitude,
            anchor.location.longitude,
            userPoints[j].location.latitude,
            userPoints[j].location.longitude
          );
          if (dist < 200) {
            windowEnd = j;
          }
        }

        // Calcular duración total del grupo
        if (windowEnd > windowStart) {
          const durationMin = (userPoints[windowEnd].timestamp.toMillis() - anchor.timestamp.toMillis()) / 1000 / 60;
          if (durationMin > 15) {
            stops.push({
              id: `${userId}_${anchor.timestamp.toMillis()}`,
              userId: userId,
              location: anchor.location,
              startTime: anchor.timestamp,
              durationMinutes: Math.round(durationMin)
            });
          }
        }

        // Avanzar al siguiente grupo
        windowStart = windowEnd + 1;
      }
    });

    return stops;
  };

  // Merge consecutive stops at the same location into a single aggregated stop
  const clusterLongStops = (stops: LongStop[]): LongStop[] => {
    if (stops.length === 0) return [];

    // Sort by userId then by startTime so consecutive stops at same location are adjacent
    const sorted = [...stops].sort((a, b) => {
      if (a.userId !== b.userId) return a.userId.localeCompare(b.userId);
      return a.startTime.toMillis() - b.startTime.toMillis();
    });

    const clustered: LongStop[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const stop = sorted[i];
      const dist = calculateDistance(
        current.location.latitude, current.location.longitude,
        stop.location.latitude, stop.location.longitude
      );
      const currentEndTime = current.startTime.toMillis() + current.durationMinutes * 60 * 1000;
      const gapMs = stop.startTime.toMillis() - currentEndTime;

      // Merge if same user, within 400 m, and the gap between end and next start is ≤ 60 min
      if (stop.userId === current.userId && dist < 400 && gapMs <= 60 * 60 * 1000) {
        const newEnd = Math.max(
          currentEndTime,
          stop.startTime.toMillis() + stop.durationMinutes * 60 * 1000
        );
        current = {
          ...current,
          durationMinutes: Math.round((newEnd - current.startTime.toMillis()) / 1000 / 60)
        };
      } else {
        clustered.push(current);
        current = { ...stop };
      }
    }
    clustered.push(current);
    return clustered;
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
    <Box sx={{
      position: 'fixed',
      top: 64,
      left: 270,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      zIndex: 1
    }}>
      {/* Tabs principales: Mapa de Rutas | Reportes */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 2, flexShrink: 0 }}>
        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}>
          <Tab label="Mapa de Rutas" />
          <Tab label="Reportes" />
          <Tab label="Productividad" />
        </Tabs>
      </Box>

      {/* Tab Reportes — siempre montado para conservar estado */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: mainTab === 1 ? 'block' : 'none' }}>
        <ReportesRutas />
      </Box>

      {/* Tab Productividad — siempre montado para conservar estado */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: mainTab === 2 ? 'block' : 'none' }}>
        <ReporteProductividad />
      </Box>

      {/* Tab Mapa de Rutas */}
      {mainTab === 0 && (
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {loadError && (
        <Box sx={{ p: 4 }}>
          <Alert severity="error">Error al cargar Google Maps: {loadError.message}</Alert>
        </Box>
      )}
      {!isLoaded && !loadError && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ flex: 1 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={60} />
            <Typography>Cargando Google Maps...</Typography>
          </Stack>
        </Box>
      )}
      {isLoaded && !loadError && (
      <Box sx={{ display: 'flex', flex: 1 }}>
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
              <span>
                <IconButton onClick={handleLoadRoute} size="small" disabled={selectedUserIds.length === 0 || loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Centrar mapa">
              <span>
                <IconButton onClick={centerMap} size="small" disabled={!hasData}>
                  <MyLocationIcon />
                </IconButton>
              </span>
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
                sx={{ mb: 1 }}
              >
                <ToggleButton value="today">Hoy</ToggleButton>
                <ToggleButton value="yesterday">Ayer</ToggleButton>
                <ToggleButton value="thisWeek">Semana</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                value={quickFilter}
                exclusive
                onChange={(_, newFilter) => newFilter && setQuickFilter(newFilter)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton value="lastWeek">Sem. pasada</ToggleButton>
                <ToggleButton value="thisMonth">Este mes</ToggleButton>
                <ToggleButton value="custom">Personalizado</ToggleButton>
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
                  sx={{ bgcolor: quickFilter === 'custom' ? 'action.hover' : undefined, borderRadius: 1 }}
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
                  sx={{ bgcolor: quickFilter === 'custom' ? 'action.hover' : undefined, borderRadius: 1 }}
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
          {/* Domicilios de los promotores seleccionados */}
          {users
            .filter(u => selectedUserIds.includes(u.id) && u.homeLat && u.homeLng)
            .map(u => (
              <Marker
                key={`home-${u.id}`}
                position={{ lat: u.homeLat!, lng: u.homeLng! }}
                icon={{
                  url: createHomeIconRutas(),
                  scaledSize: new google.maps.Size(36, 36),
                  anchor: new google.maps.Point(18, 18),
                }}
                title={`🏠 Domicilio: ${u.displayName}`}
              />
            ))
          }

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
      </Box>
    </Box>
      )}
      {/* End isLoaded check */}
      </Box>
      )}
      {/* End mainTab === 0 */}
    </Box>
  );
};

export default RutasPromotores;
