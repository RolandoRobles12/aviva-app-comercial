import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  PlayArrow as PlayIcon,
  Assessment as ReportIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpIcon,
  DirectionsWalk as WalkIcon,
  Timer as TimerIcon,
  PauseCircle as PauseIcon,
  LocationOff as ZoneIcon,
  Hub as HubSpotIcon,
  GpsFixed as GpsIcon,
} from '@mui/icons-material';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { dbRegistro } from '../config/firebaseRegistro';
import { type WorkSchedule, DAY_KEYS, DEFAULT_SCHEDULE } from '../components/JornadaModal';

// ── Local constants ──────────────────────────────────────────────────────────

const DAY_LABELS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  productLine?: string;
  hubspotOwnerId?: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  workSchedule?: WorkSchedule;
}

interface CheckInRecord {
  type: 'entrada' | 'comida' | 'regreso_comida' | 'salida';
  timestamp: Timestamp;
  status: string;
  userId: string;
  validationResults?: {
    isOnTime: boolean;
    locationValid: boolean;
    minutesLate: number;
    minutesEarly: number;
  };
}

interface HubspotDeal {
  id: string;
  createdDate: string; // 'YYYY-MM-DD'
}

interface DayReport {
  date: string;      // 'YYYY-MM-DD'
  dayLabel: string;  // 'Lun 3 Mar'
  checkInTime: string | null;
  checkInOnTime: boolean | null;
  checkOutTime: string | null;
  checkOutOnTime: boolean | null;
  km: number;
  longStops: number;
  stopMinutes: number;
  hasGps: boolean;
  outOfZoneMinutes: number;
  deals: number;
}

interface SellerReport {
  userId: string;
  displayName: string;
  email: string;
  productLine?: string;
  hubspotOwnerId?: string;
  color: string;
  workDaysCount: number;
  checkInDays: number;
  checkOutDays: number;
  avgKmPerDay: number;
  avgStopHoursPerDay: number;
  totalLongStops: number;
  totalOutOfZoneMinutes: number;
  totalDeals: number;
  gpsDays: number;
  days: DayReport[];
  checkInsError: boolean;
  hubspotError: boolean;
}

type QuickFilter = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

const SELLER_COLORS = [
  '#16b877', '#2196F3', '#F44336', '#FF9800', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63',
];

// ── Helpers ────────────────────────────────────────────────────────────────

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDuration = (minutes: number): string => {
  if (minutes === 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatTime = (ts: Timestamp | null): string | null => {
  if (!ts) return null;
  const d = ts.toDate();
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getWorkDaysInRange = (start: string, end: string, schedule: WorkSchedule): string[] => {
  const days: string[] = [];
  const cur = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  while (cur <= endDate) {
    const key = DAY_KEYS[cur.getDay()];
    if (schedule[key]?.active) {
      days.push(cur.toISOString().split('T')[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const getDateRange = (filter: QuickFilter, customStart: string, customEnd: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (filter) {
    case 'today': return { start: fmt(today), end: fmt(today) };
    case 'thisWeek': {
      const mon = new Date(today);
      mon.setDate(today.getDate() - today.getDay() + 1);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun) };
    }
    case 'thisMonth':
      return {
        start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
    case 'lastMonth':
      return {
        start: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        end: fmt(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    default:
      return { start: customStart, end: customEnd };
  }
};

// ── Fetch HubSpot deals ───────────────────────────────────────────────────

const fetchHubspotDeals = async (
  ownerId: string,
  startMs: number,
  endMs: number,
): Promise<HubspotDeal[]> => {
  const apiKey = import.meta.env.VITE_HUBSPOT_API_KEY;
  if (!apiKey) return [];

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filterGroups: [{
        filters: [
          { propertyName: 'hubspot_owner_id', operator: 'EQ', value: ownerId },
          { propertyName: 'createdate', operator: 'GTE', value: startMs.toString() },
          { propertyName: 'createdate', operator: 'LTE', value: endMs.toString() },
        ],
      }],
      properties: ['dealname', 'createdate'],
      limit: 200,
    }),
  });

  if (!res.ok) throw new Error(`HubSpot ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((d: any) => ({
    id: d.id,
    createdDate: (d.properties.createdate || '').split('T')[0],
  }));
};

// ── Build per-day reports ─────────────────────────────────────────────────

const buildDayReports = (
  workDays: string[],
  locationDocs: any[],
  alertDocs: any[],
  checkIns: CheckInRecord[],
  hubspotDeals: HubspotDeal[],
): DayReport[] => {
  const locByDate: Record<string, { ts: Timestamp; lat: number; lng: number }[]> = {};
  locationDocs.forEach((d) => {
    const data = d.data();
    const ts: Timestamp | undefined = data.timestamp;
    if (!ts) return;
    const date = ts.toDate().toISOString().split('T')[0];
    const lat = data.location?.latitude ?? data.latitude ?? 0;
    const lng = data.location?.longitude ?? data.longitude ?? 0;
    if (!locByDate[date]) locByDate[date] = [];
    locByDate[date].push({ ts, lat, lng });
  });

  const alertMinByDate: Record<string, number> = {};
  alertDocs.forEach((d) => {
    const data = d.data();
    const detectedAt: Timestamp | undefined = data.detectedAt;
    const resolvedAt: Timestamp | null = data.resolvedAt ?? null;
    if (!detectedAt) return;
    const date = detectedAt.toDate().toISOString().split('T')[0];
    const durationMs = resolvedAt
      ? resolvedAt.toDate().getTime() - detectedAt.toDate().getTime()
      : 0;
    alertMinByDate[date] = (alertMinByDate[date] || 0) + durationMs / 60000;
  });

  const ciByDate: Record<string, CheckInRecord[]> = {};
  checkIns.forEach((ci) => {
    const d = ci.timestamp?.toDate?.();
    if (!d) return;
    const date = d.toISOString().split('T')[0];
    if (!ciByDate[date]) ciByDate[date] = [];
    ciByDate[date].push(ci);
  });

  const dealsByDate: Record<string, number> = {};
  hubspotDeals.forEach((deal) => {
    if (!deal.createdDate) return;
    dealsByDate[deal.createdDate] = (dealsByDate[deal.createdDate] || 0) + 1;
  });

  return workDays.map((date) => {
    const locs = (locByDate[date] || []).sort(
      (a, b) => a.ts.toDate().getTime() - b.ts.toDate().getTime()
    );

    let km = 0;
    let longStops = 0;
    let stopMinutes = 0;
    for (let i = 1; i < locs.length; i++) {
      km += calculateDistance(locs[i - 1].lat, locs[i - 1].lng, locs[i].lat, locs[i].lng);
      const gapMin = (locs[i].ts.toDate().getTime() - locs[i - 1].ts.toDate().getTime()) / 60000;
      if (gapMin > 30) {
        longStops++;
        stopMinutes += gapMin;
      }
    }

    const dayCIs = ciByDate[date] || [];
    const entrada = dayCIs.find((c) => c.type === 'entrada') || null;
    const salida  = dayCIs.find((c) => c.type === 'salida')  || null;

    const d = new Date(date + 'T12:00:00');
    return {
      date,
      dayLabel: `${DAY_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`,
      checkInTime:    formatTime(entrada?.timestamp ?? null),
      checkInOnTime:  entrada ? (entrada.validationResults?.locationValid ?? null) : null,
      checkOutTime:   formatTime(salida?.timestamp ?? null),
      checkOutOnTime: salida  ? (salida.validationResults?.locationValid  ?? null) : null,
      km: Math.round(km * 10) / 10,
      longStops,
      stopMinutes: Math.round(stopMinutes),
      hasGps: locs.length > 0,
      outOfZoneMinutes: Math.round(alertMinByDate[date] || 0),
      deals: dealsByDate[date] || 0,
    };
  });
};

// ── Sub-components ─────────────────────────────────────────────────────────

const CheckInChip: React.FC<{ time: string | null; onTime: boolean | null }> = ({ time, onTime }) => {
  if (!time) return <Typography variant="caption" color="text.disabled">—</Typography>;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {onTime === true  && <CheckIcon  sx={{ fontSize: 14, color: 'success.main' }} />}
      {onTime === false && <CancelIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
      {onTime === null  && <HelpIcon   sx={{ fontSize: 14, color: 'text.disabled' }} />}
      <Typography variant="body2" fontWeight={600}>{time}</Typography>
    </Stack>
  );
};

const PctCell: React.FC<{ value: number; total: number; error?: boolean }> = ({ value, total, error }) => {
  if (error) return (
    <Tooltip title="Datos no disponibles. Ver instrucciones de configuración.">
      <Typography variant="caption" color="text.disabled">N/D</Typography>
    </Tooltip>
  );
  if (total === 0) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const pct = Math.round((value / total) * 100);
  const color = pct >= 80 ? 'success.main' : pct >= 50 ? 'warning.main' : 'error.main';
  return (
    <Box>
      <Typography variant="body2" fontWeight={700} color={color}>{pct}%</Typography>
      <Typography variant="caption" color="text.secondary">{value}/{total} días</Typography>
    </Box>
  );
};

const ExpandedDays: React.FC<{ days: DayReport[] }> = ({ days }) => (
  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem' } }}>
            <TableCell>Día</TableCell>
            <TableCell align="center">Entrada</TableCell>
            <TableCell align="center">Salida</TableCell>
            <TableCell align="right">Km</TableCell>
            <TableCell align="center">Paradas &gt;30m</TableCell>
            <TableCell align="center">T. parado</TableCell>
            <TableCell align="center">Fuera zona</TableCell>
            <TableCell align="center">Solicitudes</TableCell>
            <TableCell align="center">GPS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {days.map((day) => (
            <TableRow key={day.date} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell>
                <Typography variant="caption" fontWeight={600}>{day.dayLabel}</Typography>
              </TableCell>
              <TableCell align="center">
                <CheckInChip time={day.checkInTime} onTime={day.checkInOnTime} />
              </TableCell>
              <TableCell align="center">
                <CheckInChip time={day.checkOutTime} onTime={day.checkOutOnTime} />
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption">{day.km > 0 ? `${day.km} km` : '—'}</Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption">
                  {day.longStops > 0 ? day.longStops : '—'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption">{formatDuration(day.stopMinutes)}</Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption">
                  {day.outOfZoneMinutes > 0 ? `${day.outOfZoneMinutes}m` : '—'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {day.deals > 0
                  ? <Chip label={day.deals} size="small" color="primary" variant="outlined" />
                  : <Typography variant="caption" color="text.disabled">—</Typography>
                }
              </TableCell>
              <TableCell align="center">
                {day.hasGps
                  ? <GpsIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  : <Typography variant="caption" color="text.disabled">—</Typography>
                }
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

// ── Main Page ──────────────────────────────────────────────────────────────

const ReporteProductividad: React.FC = () => {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(DEFAULT_SCHEDULE);

  // Initial load state
  const [initialLoading, setInitialLoading] = useState(true);
  const [initError, setInitError]           = useState<string | null>(null);

  // Filters
  const [quickFilter, setQuickFilter]       = useState<QuickFilter>('thisWeek');
  const [customStart, setCustomStart]       = useState('');
  const [customEnd, setCustomEnd]           = useState('');
  const [productFilter, setProductFilter]   = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Report state
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [reportData, setReportData] = useState<SellerReport[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date();
    const mon = new Date(today);
    mon.setDate(today.getDate() - today.getDay() + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setCustomStart(fmt(mon));
    setCustomEnd(fmt(sun));

    const loadInitial = async () => {
      try {
        setInitialLoading(true);
        setInitError(null);

        const [usersSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'products'), orderBy('name', 'asc'))),
        ]);

        const usersData: AdminUser[] = usersSnap.docs.map((d) => ({
          id: d.id,
          displayName: d.data().displayName || 'Sin nombre',
          email: d.data().email || '',
          productLine: d.data().productLine,
          hubspotOwnerId: d.data().hubspotOwnerId,
        }));
        setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)));

        setProducts(productsSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          code: d.data().code,
          workSchedule: d.data().workSchedule as WorkSchedule | undefined,
        })));
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
        setInitError('Error al cargar datos. Verifica los permisos de Firestore y la conexión.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitial();
  }, []);

  // Update custom dates when quickFilter changes
  useEffect(() => {
    if (quickFilter !== 'custom') {
      const { start, end } = getDateRange(quickFilter, customStart, customEnd);
      setCustomStart(start);
      setCustomEnd(end);
    }
  }, [quickFilter]);

  // Derive workSchedule from the selected product
  useEffect(() => {
    if (productFilter === 'all') {
      setWorkSchedule(DEFAULT_SCHEDULE);
    } else {
      const product = products.find((p) => p.code === productFilter);
      setWorkSchedule(product?.workSchedule || DEFAULT_SCHEDULE);
    }
  }, [productFilter, products]);

  const filteredUsers = users.filter((u) => {
    if (productFilter === 'all') return true;
    return u.productLine === productFilter;
  });

  const toggleRow = (userId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  // ── Generate report ──────────────────────────────────────────────────────
  const handleGenerateReport = useCallback(async () => {
    if (selectedUserIds.length === 0) {
      setError('Selecciona al menos un vendedor');
      return;
    }
    setLoading(true);
    setError(null);
    setReportData([]);

    const { start, end } = getDateRange(quickFilter, customStart, customEnd);
    const startTs  = Timestamp.fromDate(new Date(start + 'T00:00:00'));
    const endTs    = Timestamp.fromDate(new Date(end + 'T23:59:59'));
    const workDays = getWorkDaysInRange(start, end, workSchedule);

    const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

    try {
      const results = await Promise.all(
        selectedUsers.map(async (user, idx): Promise<SellerReport> => {
          const color = SELLER_COLORS[idx % SELLER_COLORS.length];

          // 1. GPS Locations
          const locSnap = await getDocs(query(
            collection(db, 'locations'),
            where('userId', '==', user.id),
            where('timestamp', '>=', startTs),
            where('timestamp', '<=', endTs),
          ));

          // 2. Location alerts (requiere índice compuesto: locationAlerts userId + detectedAt)
          let alertDocs: any[] = [];
          try {
            const alertsSnap = await getDocs(query(
              collection(db, 'locationAlerts'),
              where('userId', '==', user.id),
              where('detectedAt', '>=', startTs),
              where('detectedAt', '<=', endTs),
            ));
            alertDocs = alertsSnap.docs;
          } catch {
            // Índice compuesto aún no creado — se ignora fuera de zona
          }

          // 3. Check-ins desde registro-aviva
          let checkIns: CheckInRecord[] = [];
          let checkInsError = false;
          try {
            const regUsersSnap = await getDocs(query(
              collection(dbRegistro, 'users'),
              where('email', '==', user.email),
            ));
            const registroUserId = regUsersSnap.docs[0]?.id ?? user.id;

            const ciSnap = await getDocs(query(
              collection(dbRegistro, 'checkins'),
              where('userId', '==', registroUserId),
              where('timestamp', '>=', startTs),
              where('timestamp', '<=', endTs),
            ));
            checkIns = ciSnap.docs.map((d) => ({ ...d.data() } as CheckInRecord));
          } catch {
            checkInsError = true;
          }

          // 4. HubSpot deals
          let hubspotDeals: HubspotDeal[] = [];
          let hubspotError = false;
          if (user.hubspotOwnerId) {
            try {
              hubspotDeals = await fetchHubspotDeals(
                user.hubspotOwnerId,
                new Date(start + 'T00:00:00').getTime(),
                new Date(end + 'T23:59:59').getTime(),
              );
            } catch {
              hubspotError = true;
            }
          }

          // 5. Build day reports
          const days = buildDayReports(
            workDays,
            locSnap.docs,
            alertDocs,
            checkIns,
            hubspotDeals,
          );

          // 6. Aggregate
          const gpsDays           = days.filter((d) => d.hasGps).length;
          const checkInDays       = days.filter((d) => d.checkInOnTime === true).length;
          const checkOutDays      = days.filter((d) => d.checkOutOnTime === true).length;
          const totalKm           = days.reduce((s, d) => s + d.km, 0);
          const totalLongStops    = days.reduce((s, d) => s + d.longStops, 0);
          const totalStopMinutes  = days.reduce((s, d) => s + d.stopMinutes, 0);
          const totalOutOfZoneMinutes = days.reduce((s, d) => s + d.outOfZoneMinutes, 0);
          const totalDeals        = days.reduce((s, d) => s + d.deals, 0);

          return {
            userId: user.id,
            displayName: user.displayName,
            email: user.email,
            productLine: user.productLine,
            hubspotOwnerId: user.hubspotOwnerId,
            color,
            workDaysCount: workDays.length,
            checkInDays,
            checkOutDays,
            avgKmPerDay: gpsDays > 0 ? Math.round((totalKm / gpsDays) * 10) / 10 : 0,
            avgStopHoursPerDay: gpsDays > 0 ? Math.round((totalStopMinutes / 60 / gpsDays) * 10) / 10 : 0,
            totalLongStops,
            totalOutOfZoneMinutes,
            totalDeals,
            gpsDays,
            days,
            checkInsError,
            hubspotError,
          };
        })
      );

      setReportData(results);
    } catch (e) {
      setError('Error al generar el reporte. Revisa la consola.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedUserIds, quickFilter, customStart, customEnd, workSchedule, users]);

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const teamAvgs = reportData.length > 0 ? {
    avgCheckIn:  reportData.reduce((s, r) => s + (r.workDaysCount > 0 ? r.checkInDays / r.workDaysCount : 0), 0) / reportData.length,
    avgKm:       reportData.reduce((s, r) => s + r.avgKmPerDay, 0) / reportData.length,
    avgDeals:    reportData.reduce((s, r) => s + r.totalDeals, 0) / reportData.length,
    avgTracking: reportData.reduce((s, r) => s + (r.workDaysCount > 0 ? r.gpsDays / r.workDaysCount : 0), 0) / reportData.length,
  } : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4">Reporte de Productividad</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Check-ins, rutas, solicitudes HubSpot y trackeo activo por vendedor
        </Typography>
      </Box>

      {/* Initial load states */}
      {initialLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {initError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setInitError(null)}>
          {initError}
        </Alert>
      )}

      {!initialLoading && (
        <>
          {/* Filters */}
          <Paper sx={{ p: 2.5, mb: 3 }}>
            <Stack spacing={2}>
              {/* Period */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ minWidth: 60 }}>
                  Periodo:
                </Typography>
                <ToggleButtonGroup
                  value={quickFilter}
                  exclusive
                  onChange={(_, v) => v && setQuickFilter(v)}
                  size="small"
                >
                  {([
                    ['today',     'Hoy'],
                    ['thisWeek',  'Esta semana'],
                    ['thisMonth', 'Este mes'],
                    ['lastMonth', 'Mes anterior'],
                    ['custom',    'Personalizado'],
                  ] as [QuickFilter, string][]).map(([k, label]) => (
                    <ToggleButton key={k} value={k}>{label}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {quickFilter === 'custom' && (
                  <>
                    <TextField
                      type="date"
                      size="small"
                      label="Desde"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      type="date"
                      size="small"
                      label="Hasta"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
                  </>
                )}
              </Stack>

              {/* Product + Sellers */}
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Producto</InputLabel>
                  <Select
                    value={productFilter}
                    label="Producto"
                    onChange={(e) => {
                      setProductFilter(e.target.value);
                      setSelectedUserIds([]);
                    }}
                  >
                    <MenuItem value="all">Todos los productos</MenuItem>
                    {products.map((p) => (
                      <MenuItem key={p.id} value={p.code}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Autocomplete
                  multiple
                  size="small"
                  options={filteredUsers}
                  getOptionLabel={(u) => u.displayName}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  value={filteredUsers.filter((u) => selectedUserIds.includes(u.id))}
                  onChange={(_, val) => setSelectedUserIds(val.map((u) => u.id))}
                  noOptionsText={users.length === 0 ? 'Sin vendedores cargados' : 'Sin coincidencias'}
                  renderInput={(params) => (
                    <TextField {...params} label="Vendedores" placeholder="Selecciona…" />
                  )}
                  renderTags={(val, getProps) =>
                    val.map((u, i) => (
                      <Chip label={u.displayName} size="small" {...getProps({ index: i })} />
                    ))
                  }
                  sx={{ flex: 1, minWidth: 300 }}
                />

                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={18} /> : <PlayIcon />}
                  onClick={handleGenerateReport}
                  disabled={loading || selectedUserIds.length === 0}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {loading ? 'Generando…' : 'Generar Reporte'}
                </Button>
              </Stack>

              {productFilter !== 'all' && (
                <Typography variant="caption" color="text.secondary">
                  La jornada laboral usada es la configurada para este producto en la sección de Productos.
                </Typography>
              )}
            </Stack>
          </Paper>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          {/* Team KPI Summary */}
          {teamAvgs && (
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Check-in promedio',   value: `${Math.round(teamAvgs.avgCheckIn * 100)}%`, icon: <CheckIcon />, color: '#16b877' },
                { label: 'Km/día promedio',      value: `${Math.round(teamAvgs.avgKm * 10) / 10} km`, icon: <WalkIcon />, color: '#2196F3' },
                { label: 'Solicitudes promedio', value: Math.round(teamAvgs.avgDeals).toString(), icon: <HubSpotIcon />, color: '#FF9800' },
                { label: 'Trackeo activo',       value: `${Math.round(teamAvgs.avgTracking * 100)}%`, icon: <GpsIcon />, color: '#9C27B0' },
              ].map((kpi) => (
                <Grid item xs={6} md={3} key={kpi.label}>
                  <Paper sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ bgcolor: `${kpi.color}18`, borderRadius: 2, p: 1, color: kpi.color, display: 'flex' }}>
                        {kpi.icon}
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}
                          sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {kpi.label}
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color={kpi.color}>{kpi.value}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Warnings */}
          {reportData.some((r) => r.checkInsError) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Check-ins no disponibles</strong> — El proyecto <em>registro-aviva</em> en Firestore debe
              permitir lecturas en las colecciones <code>users</code> y <code>checkins</code>.
            </Alert>
          )}
          {reportData.some((r) => r.hubspotError) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Solicitudes HubSpot no disponibles</strong> — Configura la variable{' '}
              <code>VITE_HUBSPOT_API_KEY</code> en tu archivo <code>.env.local</code>.
            </Alert>
          )}

          {/* Main Table */}
          {reportData.length > 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell><strong>Vendedor</strong></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Días con entrada registrada EN sucursal (locationValid = true) / días laborables">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <CheckIcon sx={{ fontSize: 14 }} /><span>Inicio sucursal</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Promedio de kilómetros recorridos por día con GPS activo">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                          <WalkIcon sx={{ fontSize: 14 }} /><span>Km/día</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Horas de paradas largas (>30 min) por día activo en campo">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                          <TimerIcon sx={{ fontSize: 14 }} /><span>Hrs parado/día</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Total de pausas de más de 30 minutos en el periodo">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <PauseIcon sx={{ fontSize: 14 }} /><span>Paradas &gt;30m</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Días con salida registrada EN sucursal (locationValid = true) / días laborables">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <CheckIcon sx={{ fontSize: 14 }} /><span>Fin sucursal</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Total de minutos fuera de zona asignada">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <ZoneIcon sx={{ fontSize: 14 }} /><span>Fuera de zona</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Deals creados en HubSpot durante el periodo">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <HubSpotIcon sx={{ fontSize: 14 }} /><span>Solicitudes</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Días con datos de GPS / días laborables en el periodo">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <GpsIcon sx={{ fontSize: 14 }} /><span>Trackeo activo</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((seller) => {
                    const isExpanded = expandedRows.has(seller.userId);
                    return (
                      <React.Fragment key={seller.userId}>
                        <TableRow
                          hover
                          onClick={() => toggleRow(seller.userId)}
                          sx={{ cursor: 'pointer', '& td': { borderBottom: isExpanded ? 0 : undefined } }}
                        >
                          <TableCell padding="checkbox">
                            <IconButton size="small">
                              {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                            </IconButton>
                          </TableCell>

                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ width: 32, height: 32, bgcolor: seller.color, fontSize: 13 }}>
                                {seller.displayName.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{seller.displayName}</Typography>
                                <Typography variant="caption" color="text.secondary">{seller.email}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell align="center">
                            <PctCell value={seller.checkInDays} total={seller.workDaysCount} error={seller.checkInsError} />
                          </TableCell>

                          <TableCell align="right">
                            {seller.avgKmPerDay > 0
                              ? <Typography variant="body2" fontWeight={600}>{seller.avgKmPerDay} km</Typography>
                              : <Typography variant="caption" color="text.disabled">—</Typography>
                            }
                          </TableCell>

                          <TableCell align="right">
                            {seller.avgStopHoursPerDay > 0
                              ? <Typography variant="body2">{seller.avgStopHoursPerDay}h</Typography>
                              : <Typography variant="caption" color="text.disabled">—</Typography>
                            }
                          </TableCell>

                          <TableCell align="center">
                            {seller.totalLongStops > 0
                              ? (
                                <Chip
                                  label={seller.totalLongStops}
                                  size="small"
                                  color={seller.totalLongStops > 10 ? 'error' : seller.totalLongStops > 5 ? 'warning' : 'default'}
                                  variant="outlined"
                                />
                              )
                              : <Typography variant="caption" color="text.disabled">—</Typography>
                            }
                          </TableCell>

                          <TableCell align="center">
                            <PctCell value={seller.checkOutDays} total={seller.workDaysCount} error={seller.checkInsError} />
                          </TableCell>

                          <TableCell align="center">
                            {seller.totalOutOfZoneMinutes > 0
                              ? (
                                <Typography
                                  variant="body2"
                                  color={seller.totalOutOfZoneMinutes > 120 ? 'error.main' : 'warning.main'}
                                  fontWeight={600}
                                >
                                  {formatDuration(seller.totalOutOfZoneMinutes)}
                                </Typography>
                              )
                              : <Typography variant="caption" color="text.disabled">—</Typography>
                            }
                          </TableCell>

                          <TableCell align="center">
                            {seller.hubspotError
                              ? <Tooltip title="Configura VITE_HUBSPOT_API_KEY">
                                  <Typography variant="caption" color="text.disabled">N/D</Typography>
                                </Tooltip>
                              : seller.totalDeals > 0
                                ? <Chip label={seller.totalDeals} size="small" color="primary" />
                                : <Typography variant="caption" color="text.disabled">0</Typography>
                            }
                          </TableCell>

                          <TableCell align="center">
                            <PctCell value={seller.gpsDays} total={seller.workDaysCount} />
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                            <Collapse in={isExpanded} unmountOnExit>
                              <ExpandedDays days={seller.days} />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Empty state */}
          {!loading && reportData.length === 0 && (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <ReportIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Selecciona vendedores y genera el reporte
              </Typography>
              <Typography variant="body2" color="text.disabled" mt={1}>
                El reporte incluye check-ins, km recorridos, paradas, alertas de zona y solicitudes HubSpot
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default ReporteProductividad;
