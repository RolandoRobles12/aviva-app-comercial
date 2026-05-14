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
  Dialog,
  DialogTitle,
  DialogContent,
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
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
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
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

// ── Local constants ──────────────────────────────────────────────────────────

const DAY_LABELS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  status?: string;
  productLine?: string;
  hubspotOwnerId?: string;
  homeLat?: number;
  homeLng?: number;
  assignedKioskId?: string;
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
  photoUrl?: string;
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
  checkInPhotoUrl?: string;
  checkOutTime: string | null;
  checkOutOnTime: boolean | null;
  checkOutPhotoUrl?: string;
  km: number;
  longStops: number;
  stopMinutes: number;
  hasGps: boolean;
  outOfZoneCount: number;    // veces que se detectó fuera de zona
  outOfZoneMinutes: number;
  deals: number;
  homeVisits: number;    // veces que estuvo en casa durante horario laboral
  homeMinutes: number;   // minutos totales en casa durante horario laboral
}

interface SellerReport {
  userId: string;
  displayName: string;
  email: string;
  productLine?: string;
  hubspotOwnerId?: string;
  color: string;
  workDaysCount: number;
  elapsedWorkDaysCount: number;
  checkInDays: number;
  checkOutDays: number;
  avgKmPerDay: number;
  avgStopHoursPerDay: number;
  totalLongStops: number;
  totalOutOfZoneCount: number;
  totalOutOfZoneMinutes: number;
  totalDeals: number;
  gpsDays: number;
  days: DayReport[];
  checkInsError: boolean;
  hubspotError: boolean;
  totalHomeVisits: number;
  totalHomeMinutes: number;
}

type QuickFilter = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

const SELLER_COLORS = [
  '#16b877', '#2196F3', '#F44336', '#FF9800', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63',
];

// ── Helpers ────────────────────────────────────────────────────────────────

// Retorna la fecha local (YYYY-MM-DD) usando getFullYear/Month/Date para evitar
// el problema de UTC: registros después de las 18h en UTC-6 aparecen en el día siguiente en UTC.
const toLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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

const FUNCTIONS_BASE = 'https://us-central1-promotores-aviva-tu-negocio.cloudfunctions.net';

const fetchHubspotDeals = async (
  ownerId: string,
  startMs: number,
  endMs: number,
  idToken: string,
): Promise<HubspotDeal[]> => {
  const res = await fetch(`${FUNCTIONS_BASE}/getOwnerDeals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ownerId, startMs, endMs }),
  });

  if (!res.ok) throw new Error(`HubSpot function ${res.status}`);
  const data = await res.json();
  return (data.results || []) as HubspotDeal[];
};

// ── Build per-day reports ─────────────────────────────────────────────────

// Convierte 'HH:mm' a minutos desde medianoche
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const HOME_RADIUS_KM = 0.03; // 30 m

const buildDayReports = (
  workDays: string[],
  locationDocs: any[],
  alertDocs: any[],
  checkIns: CheckInRecord[],
  hubspotDeals: HubspotDeal[],
  workSchedule: WorkSchedule,
  homeLat?: number,
  homeLng?: number,
  kioskLat?: number,
  kioskLng?: number,
  kioskRadiusKm?: number,
): DayReport[] => {
  const locByDate: Record<string, { ts: Timestamp; lat: number; lng: number }[]> = {};
  locationDocs.forEach((d) => {
    const data = d.data();
    const ts: Timestamp | undefined = data.timestamp;
    if (!ts) return;
    const date = toLocalDate(ts.toDate());
    const lat = data.location?.latitude ?? data.latitude ?? 0;
    const lng = data.location?.longitude ?? data.longitude ?? 0;
    if (!locByDate[date]) locByDate[date] = [];
    locByDate[date].push({ ts, lat, lng });
  });

  const alertMinByDate: Record<string, number> = {};
  const alertCountByDate: Record<string, number> = {};
  alertDocs.forEach((d) => {
    const data = d.data();
    const detectedAt: Timestamp | undefined = data.detectedAt;
    const resolvedAt: Timestamp | null = data.resolvedAt ?? null;
    if (!detectedAt) return;
    const date = toLocalDate(detectedAt.toDate());
    const durationMs = resolvedAt
      ? resolvedAt.toDate().getTime() - detectedAt.toDate().getTime()
      : 0;
    alertMinByDate[date] = (alertMinByDate[date] || 0) + durationMs / 60000;
    alertCountByDate[date] = (alertCountByDate[date] || 0) + 1;
  });

  const ciByDate: Record<string, CheckInRecord[]> = {};
  checkIns.forEach((ci) => {
    const d = ci.timestamp?.toDate?.();
    if (!d) return;
    const date = toLocalDate(d);
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

    // Horario laboral del día según la jornada configurada
    const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()];
    const dayConfig = workSchedule[dayKey];
    const workStartMin = timeToMinutes(dayConfig?.start || '09:00');
    const workEndMin   = timeToMinutes(dayConfig?.end   || '18:00');

    // Calcular km recorridos
    let km = 0;
    for (let i = 1; i < locs.length; i++) {
      km += calculateDistance(locs[i - 1].lat, locs[i - 1].lng, locs[i].lat, locs[i].lng);
    }

    // Detectar paradas largas (>30 min) con ventana deslizante de 100m.
    // NO se basa en gaps entre lecturas (el GPS puede grabar cada pocos minutos aunque
    // el vendedor esté parado), sino en clusters de puntos cerca del mismo lugar.
    let longStops = 0;
    let stopMinutes = 0;
    {
      let wi = 0;
      while (wi < locs.length) {
        const anchor = locs[wi];
        let we = wi;
        // Expandir ventana mientras los puntos estén dentro de 100m del anchor
        for (let j = wi + 1; j < locs.length; j++) {
          const distM = calculateDistance(anchor.lat, anchor.lng, locs[j].lat, locs[j].lng) * 1000;
          if (distM < 100) { we = j; } else { break; }
        }
        if (we > wi) {
          const durationMin =
            (locs[we].ts.toDate().getTime() - anchor.ts.toDate().getTime()) / 60000;
          if (durationMin > 30) {
            // Solo contar si la parada ocurre dentro del horario laboral
            const m1 = anchor.ts.toDate().getHours() * 60 + anchor.ts.toDate().getMinutes();
            const m2 = locs[we].ts.toDate().getHours() * 60 + locs[we].ts.toDate().getMinutes();
            if (m1 >= workStartMin && m1 <= workEndMin && m2 >= workStartMin && m2 <= workEndMin) {
              longStops++;
              stopMinutes += durationMin;
            }
          }
        }
        wi = we + 1;
      }
    }

    // Tiempo en casa: contar puntos GPS dentro del radio del domicilio durante horario laboral
    let homeVisits = 0;
    let homeMinutes = 0;
    if (homeLat !== undefined && homeLng !== undefined) {
      let inHome = false;
      let homeEntryTs: number | null = null;
      for (const loc of locs) {
        const t = loc.ts.toDate();
        const min = t.getHours() * 60 + t.getMinutes();
        const duringWork = min >= workStartMin && min <= workEndMin;
        const atHome = duringWork && calculateDistance(loc.lat, loc.lng, homeLat, homeLng) <= HOME_RADIUS_KM;
        if (atHome && !inHome) {
          inHome = true;
          homeEntryTs = t.getTime();
          homeVisits++;
        } else if (!atHome && inHome) {
          inHome = false;
          if (homeEntryTs !== null) {
            homeMinutes += (t.getTime() - homeEntryTs) / 60000;
            homeEntryTs = null;
          }
        }
      }
      // Si terminó el día todavía en casa, cerrar la visita con el último punto
      if (inHome && homeEntryTs !== null && locs.length > 0) {
        homeMinutes += (locs[locs.length - 1].ts.toDate().getTime() - homeEntryTs) / 60000;
      }
    }

    // GPS-based out-of-kiosk minutes during work hours.
    // Además se cuenta una "entrada" fuera de zona cada vez que el vendedor
    // transiciona de dentro del radio del kiosco hacia afuera.
    let gpsOutOfKioskMinutes = 0;
    let gpsOutOfKioskEntries = 0;
    if (kioskLat !== undefined && kioskLng !== undefined && kioskRadiusKm !== undefined) {
      let wasOutside = false;
      for (let i = 0; i < locs.length - 1; i++) {
        const loc = locs[i];
        const t = loc.ts.toDate();
        const min = t.getHours() * 60 + t.getMinutes();
        if (min >= workStartMin && min <= workEndMin) {
          const distKm = calculateDistance(loc.lat, loc.lng, kioskLat, kioskLng);
          const isOutside = distKm > kioskRadiusKm;
          if (isOutside) {
            const gapMin = (locs[i + 1].ts.toDate().getTime() - t.getTime()) / 60000;
            if (gapMin <= 60) gpsOutOfKioskMinutes += gapMin; // ignorar brechas > 1h (GPS apagado)
            if (!wasOutside) gpsOutOfKioskEntries++;
          }
          wasOutside = isOutside;
        } else {
          wasOutside = false;
        }
      }
    }

    const dayCIs = ciByDate[date] || [];
    const entrada = dayCIs.find((c) => c.type === 'entrada') || null;
    const salida  = dayCIs.find((c) => c.type === 'salida')  || null;

    const d = new Date(date + 'T12:00:00');
    return {
      date,
      dayLabel: `${DAY_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`,
      checkInTime:      formatTime(entrada?.timestamp ?? null),
      checkInOnTime:    entrada ? (entrada.validationResults?.locationValid ?? null) : null,
      checkInPhotoUrl:  entrada?.photoUrl,
      checkOutTime:     formatTime(salida?.timestamp ?? null),
      checkOutOnTime:   salida  ? (salida.validationResults?.locationValid  ?? null) : null,
      checkOutPhotoUrl: salida?.photoUrl,
      km: Math.round(km * 10) / 10,
      longStops,
      stopMinutes: Math.round(stopMinutes),
      hasGps: locs.length > 0,
      outOfZoneCount: (alertCountByDate[date] || 0) + gpsOutOfKioskEntries,
      outOfZoneMinutes: Math.round((alertMinByDate[date] || 0) + gpsOutOfKioskMinutes),
      deals: dealsByDate[date] || 0,
      homeVisits,
      homeMinutes: Math.round(homeMinutes),
    };
  });
};

// ── Sub-components ─────────────────────────────────────────────────────────

const CheckInChip: React.FC<{ time: string | null; onTime: boolean | null; hasPhoto?: boolean }> = ({ time, onTime, hasPhoto }) => {
  if (!time) return <Typography variant="caption" color="text.disabled">—</Typography>;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {onTime === true  && <CheckIcon  sx={{ fontSize: 14, color: 'success.main' }} />}
      {onTime === false && <CancelIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
      {onTime === null  && <HelpIcon   sx={{ fontSize: 14, color: 'text.disabled' }} />}
      <Typography variant="body2" fontWeight={600}>{time}</Typography>
      {hasPhoto && <PhotoCameraIcon sx={{ fontSize: 12, color: 'primary.main' }} />}
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

const ExpandedDays: React.FC<{ days: DayReport[] }> = ({ days }) => {
  const [photoDialog, setPhotoDialog] = React.useState<{ url: string; label: string } | null>(null);

  return (
    <>
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
            <TableCell align="center">En casa</TableCell>
            <TableCell align="center">T. en casa</TableCell>
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
                <Box
                  onClick={day.checkInPhotoUrl ? () => setPhotoDialog({ url: day.checkInPhotoUrl!, label: `Entrada — ${day.dayLabel}` }) : undefined}
                  sx={{ cursor: day.checkInPhotoUrl ? 'pointer' : 'default', display: 'inline-flex' }}
                >
                  <CheckInChip time={day.checkInTime} onTime={day.checkInOnTime} hasPhoto={!!day.checkInPhotoUrl} />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box
                  onClick={day.checkOutPhotoUrl ? () => setPhotoDialog({ url: day.checkOutPhotoUrl!, label: `Salida — ${day.dayLabel}` }) : undefined}
                  sx={{ cursor: day.checkOutPhotoUrl ? 'pointer' : 'default', display: 'inline-flex' }}
                >
                  <CheckInChip time={day.checkOutTime} onTime={day.checkOutOnTime} hasPhoto={!!day.checkOutPhotoUrl} />
                </Box>
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
                {day.outOfZoneCount > 0
                  ? (
                    <Tooltip title={day.outOfZoneMinutes > 0 ? `Tiempo estimado fuera de zona: ${day.outOfZoneMinutes}m` : 'Veces detectado fuera de zona'}>
                      <Chip
                        label={day.outOfZoneMinutes > 0 ? `${day.outOfZoneCount}× (${day.outOfZoneMinutes}m)` : `${day.outOfZoneCount}×`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </Tooltip>
                  )
                  : <Typography variant="caption" color="text.disabled">0</Typography>
                }
              </TableCell>
              <TableCell align="center">
                {day.deals > 0
                  ? <Chip label={day.deals} size="small" color="primary" variant="outlined" />
                  : <Typography variant="caption" color="text.disabled">0</Typography>
                }
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption" color={day.homeVisits > 0 ? 'warning.main' : 'text.disabled'}>
                  {day.homeVisits > 0 ? day.homeVisits : '0'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption" color={day.homeMinutes > 0 ? 'warning.main' : 'text.disabled'}>
                  {day.homeMinutes > 0 ? formatDuration(day.homeMinutes) : '—'}
                </Typography>
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

    {/* Dialog de foto de entrada/salida */}
    <Dialog open={!!photoDialog} onClose={() => setPhotoDialog(null)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {photoDialog?.label}
        <IconButton
          onClick={() => setPhotoDialog(null)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.900' }}>
        {photoDialog && (
          <Box
            component="img"
            src={photoDialog.url}
            alt="Foto de registro"
            sx={{ maxWidth: '100%', maxHeight: 520, borderRadius: 1, objectFit: 'contain' }}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────

const CACHE_KEY = 'reporte-productividad';
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 horas (toda una jornada laboral)

const ReporteProductividad: React.FC = () => {
  const { user } = useAuth();
  const { getCachedData, setCachedData } = useApp();

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

  // Se pone en true tras restaurar el caché; evita que el efecto de guardado
  // sobreescriba el caché con valores iniciales vacíos antes del primer render.
  const [cacheRestored, setCacheRestored] = useState(false);

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date();
    const mon = new Date(today);
    mon.setDate(today.getDate() - today.getDay() + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    // Restaurar estado previo desde caché (filtros + reporte generado)
    const cached = getCachedData(CACHE_KEY, CACHE_TTL);
    if (cached) {
      if (cached.quickFilter)     setQuickFilter(cached.quickFilter);
      if (cached.customStart)     setCustomStart(cached.customStart);
      if (cached.customEnd)       setCustomEnd(cached.customEnd);
      if (cached.productFilter)   setProductFilter(cached.productFilter);
      if (cached.selectedUserIds) setSelectedUserIds(cached.selectedUserIds);
      if (cached.reportData)      setReportData(cached.reportData);
      if (cached.expandedRows)    setExpandedRows(new Set(cached.expandedRows));
    } else {
      setCustomStart(fmt(mon));
      setCustomEnd(fmt(sun));
    }
    // Marca que el caché ya fue restaurado; a partir de aquí el efecto de
    // guardado puede escribir sin riesgo de sobrescribir datos válidos.
    setCacheRestored(true);

    const loadInitial = async () => {
      try {
        setInitialLoading(true);
        setInitError(null);

        const [usersSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'products'), orderBy('name', 'asc'))),
        ]);

        // Deduplicate by email: prefer the canonical doc (doc.id === data.uid),
        // which is the Firebase Auth UID document created/migrated by the Android app.
        // This handles users who have both an admin-created doc (random ID) and an
        // app-created doc (firebase_uid) when migration hasn't run yet.
        const byEmail = new Map<string, AdminUser>();
        usersSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.migratedToUid) return; // skip superseded admin-created docs

          const email = data.email || '';
          const uid = data.uid || '';
          const isCanonical = uid && d.id === uid; // doc ID matches Firebase Auth UID

          const u: AdminUser = {
            id: d.id,
            uid: uid || d.id,
            displayName: data.displayName || 'Sin nombre',
            email,
            status: data.status,
            productLine: data.productLine,
            hubspotOwnerId: data.hubspotOwnerId,
            homeLat: data.homeLat,
            homeLng: data.homeLng,
            assignedKioskId: data.assignedKioskId,
          };

          if (!email) { byEmail.set(d.id, u); return; } // no email → keep as-is
          const existing = byEmail.get(email);
          if (!existing || isCanonical) byEmail.set(email, u);
        });

        // Excluir usuarios inactivos/suspendidos del reporte de productividad
        const usersData = Array.from(byEmail.values()).filter(
          (u) => !u.status || u.status === 'ACTIVE'
        );
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

  // Guardar estado en caché para persistirlo entre navegaciones.
  // Solo se activa después de que el caché inicial fue restaurado para evitar
  // sobrescribir datos válidos con los valores vacíos del primer render.
  useEffect(() => {
    if (!cacheRestored) return;
    setCachedData(CACHE_KEY, {
      quickFilter,
      customStart,
      customEnd,
      productFilter,
      selectedUserIds,
      reportData,
      expandedRows: Array.from(expandedRows),
    });
  }, [cacheRestored, quickFilter, customStart, customEnd, productFilter, selectedUserIds, reportData, expandedRows]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Comparar case-insensitive: products.code es snake_case minúsculas,
    // users.productLine es SNAKE_CASE mayúsculas (Android)
    return u.productLine?.toLowerCase() === productFilter.toLowerCase();
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

    // Días laborables transcurridos hasta hoy (denominador "so far")
    const todayStr = toLocalDate(new Date());
    const effectiveEnd = end <= todayStr ? end : todayStr;
    const elapsedWorkDays = getWorkDaysInRange(start, effectiveEnd, workSchedule);

    const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));
    const idToken = user ? await user.getIdToken() : null;

    try {
      // Cargar kioscos para el cálculo de fuera-de-zona por GPS
      const kiosksSnap = await getDocs(collection(db, 'kiosks'));
      const kiosksMap: Record<string, { lat: number; lng: number; radiusKm: number }> = {};
      kiosksSnap.docs.forEach((doc) => {
        const data = doc.data();
        const loc = data.location;
        if (loc) {
          kiosksMap[doc.id] = {
            lat: loc.latitude,
            lng: loc.longitude,
            radiusKm: (data.radiusMeters || data.radiusOverride || 100) / 1000,
          };
        }
      });

      const results = await Promise.all(
        selectedUsers.map(async (user, idx): Promise<SellerReport> => {
          const color = SELLER_COLORS[idx % SELLER_COLORS.length];

          // 1. GPS Locations — query by userEmail (always present, avoids UID mismatch)
          const locSnap = await getDocs(query(
            collection(db, 'locations'),
            where('userEmail', '==', user.email),
          ));
          const filteredLocDocs = locSnap.docs.filter((d) => {
            const ts: Timestamp | undefined = d.data().timestamp;
            if (!ts) return false;
            const ms = ts.toMillis();
            return ms >= startTs.toMillis() && ms <= endTs.toMillis();
          });

          // 2. Location alerts (filter in memory to avoid requiring composite index)
          let alertDocs: any[] = [];
          try {
            const alertsSnap = await getDocs(query(
              collection(db, 'locationAlerts'),
              where('userEmail', '==', user.email),
            ));
            alertDocs = alertsSnap.docs.filter((d) => {
              const ts: Timestamp | undefined = d.data().detectedAt;
              if (!ts) return false;
              const ms = ts.toMillis();
              return ms >= startTs.toMillis() && ms <= endTs.toMillis();
            });
          } catch {
            // Se ignora fuera de zona si no hay datos
          }

          // 3. Check-ins desde registro-aviva.
          // El usuario está autenticado en ese proyecto gracias a signInWithCredential
          // en AuthContext. Las reglas de registro-aviva deben permitir:
          //   match /checkins/{id} { allow read: if request.auth != null; }
          let checkIns: CheckInRecord[] = [];
          let checkInsError = false;
          try {
            const ciSnap = await getDocs(query(
              collection(dbRegistro, 'checkins'),
              where('email', '==', user.email),
            ));
            checkIns = ciSnap.docs
              .filter((d) => {
                const ts: Timestamp | undefined = d.data().timestamp;
                if (!ts) return false;
                const ms = ts.toMillis();
                return ms >= startTs.toMillis() && ms <= endTs.toMillis();
              })
              .map((d) => d.data() as CheckInRecord);
            console.log(`[ReporteProductividad] checkins en rango para ${user.email}: ${checkIns.length}`);
          } catch (e) {
            console.error('[ReporteProductividad] Error al obtener checkins:', e);
            checkInsError = true;
          }

          // 4. HubSpot deals (via Firebase Function para evitar CORS)
          let hubspotDeals: HubspotDeal[] = [];
          let hubspotError = false;
          if (user.hubspotOwnerId && idToken) {
            try {
              const startMs = new Date(start + 'T00:00:00').getTime();
              const endMs = new Date(end + 'T23:59:59').getTime();
              console.log(`[HubSpot] ${user.displayName} (ownerId: ${user.hubspotOwnerId})`);
              console.log(`[HubSpot] Rango: ${start} → ${end}`);
              console.log(`[HubSpot] startMs: ${startMs} (${new Date(startMs).toISOString()})`);
              console.log(`[HubSpot] endMs:   ${endMs} (${new Date(endMs).toISOString()})`);
              hubspotDeals = await fetchHubspotDeals(
                user.hubspotOwnerId,
                startMs,
                endMs,
                idToken,
              );
              console.log(`[HubSpot] Deals encontrados: ${hubspotDeals.length}`, hubspotDeals);
            } catch {
              hubspotError = true;
            }
          }

          // 5. Build day reports
          const kiosk = user.assignedKioskId ? kiosksMap[user.assignedKioskId] : undefined;
          const days = buildDayReports(
            workDays,
            filteredLocDocs,
            alertDocs,
            checkIns,
            hubspotDeals,
            workSchedule,
            user.homeLat,
            user.homeLng,
            kiosk?.lat,
            kiosk?.lng,
            kiosk?.radiusKm,
          );

          // 6. Aggregate
          const gpsDays           = days.filter((d) => d.hasGps).length;
          const checkInDays       = days.filter((d) => d.checkInOnTime === true).length;
          const checkOutDays      = days.filter((d) => d.checkOutOnTime === true).length;
          const totalKm           = days.reduce((s, d) => s + d.km, 0);
          const totalLongStops    = days.reduce((s, d) => s + d.longStops, 0);
          const totalStopMinutes  = days.reduce((s, d) => s + d.stopMinutes, 0);
          const totalOutOfZoneCount   = days.reduce((s, d) => s + d.outOfZoneCount, 0);
          const totalOutOfZoneMinutes = days.reduce((s, d) => s + d.outOfZoneMinutes, 0);
          const totalDeals        = days.reduce((s, d) => s + d.deals, 0);
          const totalHomeVisits   = days.reduce((s, d) => s + d.homeVisits, 0);
          const totalHomeMinutes  = days.reduce((s, d) => s + d.homeMinutes, 0);

          return {
            userId: user.id,
            displayName: user.displayName,
            email: user.email,
            productLine: user.productLine,
            hubspotOwnerId: user.hubspotOwnerId,
            color,
            workDaysCount: workDays.length,
            elapsedWorkDaysCount: elapsedWorkDays.length,
            checkInDays,
            checkOutDays,
            avgKmPerDay: gpsDays > 0 ? Math.round((totalKm / gpsDays) * 10) / 10 : 0,
            avgStopHoursPerDay: gpsDays > 0 ? Math.round((totalStopMinutes / 60 / gpsDays) * 10) / 10 : 0,
            totalLongStops,
            totalOutOfZoneCount,
            totalOutOfZoneMinutes,
            totalDeals,
            gpsDays,
            days,
            checkInsError,
            hubspotError,
            totalHomeVisits,
            totalHomeMinutes,
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
  }, [selectedUserIds, quickFilter, customStart, customEnd, workSchedule, users, user]);

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
                      const newProduct = e.target.value;
                      setProductFilter(newProduct);
                      if (newProduct === 'all') {
                        setSelectedUserIds([]);
                      } else {
                        const matchingUsers = users.filter(
                          (u) => u.productLine?.toLowerCase() === newProduct.toLowerCase()
                        );
                        setSelectedUserIds(matchingUsers.map((u) => u.id));
                      }
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
                    val.map((u, i) => {
                      const { key, ...chipProps } = getProps({ index: i });
                      return <Chip key={key} label={u.displayName} size="small" {...chipProps} />;
                    })
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
              permitir lecturas en la colección <code>checkins</code>.
            </Alert>
          )}
          {reportData.some((r) => r.hubspotError) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Solicitudes HubSpot no disponibles para algunos vendedores</strong> — La Cloud
              Function <code>getOwnerDeals</code> devolvió un error. Verifica que la clave de HubSpot
              esté configurada en Firebase Functions (<code>functions.config().hubspot.apikey</code>)
              y que la función esté desplegada correctamente.
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
                      <Tooltip title="Días con entrada registrada EN sucursal (locationValid = true) / días laborables transcurridos">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <CheckIcon sx={{ fontSize: 14 }} /><span>Inicio sucursal</span>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Días con salida registrada EN sucursal (locationValid = true) / días laborables transcurridos">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <CheckIcon sx={{ fontSize: 14 }} /><span>Fin sucursal</span>
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
                      <Tooltip title="Total de minutos fuera de zona asignada (radio del kiosco) y zonas prohibidas">
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
                      <Tooltip title="Visitas al domicilio registrado durante horario laboral (solo visible para administradores)">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <ZoneIcon sx={{ fontSize: 14 }} /><span>En casa</span>
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
                            <PctCell value={seller.checkInDays} total={seller.elapsedWorkDaysCount} error={seller.checkInsError} />
                          </TableCell>

                          <TableCell align="center">
                            <PctCell value={seller.checkOutDays} total={seller.elapsedWorkDaysCount} error={seller.checkInsError} />
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
                            {seller.totalOutOfZoneCount > 0
                              ? (
                                <Tooltip
                                  title={
                                    seller.totalOutOfZoneMinutes > 0
                                      ? `${seller.totalOutOfZoneCount} vez(ces) fuera de zona — tiempo estimado ${formatDuration(seller.totalOutOfZoneMinutes)}`
                                      : `${seller.totalOutOfZoneCount} vez(ces) detectado fuera de zona`
                                  }
                                >
                                  <Chip
                                    label={
                                      seller.totalOutOfZoneMinutes > 0
                                        ? `${seller.totalOutOfZoneCount}× ${formatDuration(seller.totalOutOfZoneMinutes)}`
                                        : `${seller.totalOutOfZoneCount}×`
                                    }
                                    size="small"
                                    color={seller.totalOutOfZoneMinutes > 120 || seller.totalOutOfZoneCount > 10 ? 'error' : 'warning'}
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )
                              : <Typography variant="caption" color="text.disabled">0</Typography>
                            }
                          </TableCell>

                          <TableCell align="center">
                            {seller.hubspotError
                              ? <Tooltip title="Error al consultar la Cloud Function de HubSpot">
                                  <Typography variant="caption" color="text.disabled">N/D</Typography>
                                </Tooltip>
                              : !seller.hubspotOwnerId
                                ? <Tooltip title="Configura hubspotOwnerId en el perfil del vendedor">
                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                  </Tooltip>
                                : seller.totalDeals > 0
                                  ? <Chip label={seller.totalDeals} size="small" color="primary" />
                                  : <Typography variant="caption" color="text.disabled">0</Typography>
                            }
                          </TableCell>

                          <TableCell align="center">
                            {seller.totalHomeVisits > 0
                              ? (
                                <Tooltip title={`${seller.totalHomeVisits} visita(s) al domicilio durante horario laboral`}>
                                  <Chip
                                    label={`${seller.totalHomeVisits}× ${formatDuration(seller.totalHomeMinutes)}`}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )
                              : <Typography variant="caption" color="text.disabled">0</Typography>
                            }
                          </TableCell>

                          <TableCell align="center">
                            <PctCell value={seller.gpsDays} total={seller.elapsedWorkDaysCount} />
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={11} sx={{ p: 0, border: 0 }}>
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
