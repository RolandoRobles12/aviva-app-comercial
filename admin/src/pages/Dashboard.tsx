import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  LinearProgress
} from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../config/firebase';

interface StatCard {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactElement;
  color: string;
  trend?: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Obtener datos de todas las colecciones
        const [
          kioscosSnap,
          usersSnap,
          metasSnap,
          ligasSnap,
          girosSnap,
          bonosSnap,
          visitasSnap
        ] = await Promise.all([
          getDocs(collection(db, 'kiosks')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'metas')),
          getDocs(collection(db, 'leagues')),
          getDocs(collection(db, 'giros_relevantes')),
          getDocs(collection(db, 'configuracion_bonos')),
          getDocs(query(collection(db, 'visits')))
        ]);

        // Calcular estadísticas de usuarios
        const activeUsers = usersSnap.docs.filter(doc => {
          const data = doc.data();
          return data.status === 'ACTIVE';
        }).length;

        const usersWithHubSpot = usersSnap.docs.filter(doc => {
          const data = doc.data();
          return data.hubspotOwnerId;
        }).length;

        // Calcular estadísticas de metas
        const activeMetas = metasSnap.docs.filter(doc => doc.data().activo).length;

        // Calcular estadísticas de ligas
        const activeLigas = ligasSnap.docs.filter(doc => doc.data().status === 'ACTIVE').length;

        setStats([
          {
            title: 'Usuarios Activos',
            value: activeUsers,
            subtitle: `${usersSnap.size} total`,
            icon: <PeopleIcon sx={{ fontSize: 40 }} />,
            color: '#2e7d32',
            trend: `${Math.round((activeUsers / usersSnap.size) * 100)}%`
          },
          {
            title: 'Kioscos Registrados',
            value: kioscosSnap.size,
            icon: <StoreIcon sx={{ fontSize: 40 }} />,
            color: '#1976d2'
          },
          {
            title: 'Metas Activas',
            value: activeMetas,
            subtitle: `${metasSnap.size} total`,
            icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
            color: '#ed6c02'
          },
          {
            title: 'Ligas en Curso',
            value: activeLigas,
            subtitle: `${ligasSnap.size} total`,
            icon: <EmojiEventsIcon sx={{ fontSize: 40 }} />,
            color: '#9c27b0'
          },
          {
            title: 'Giros Relevantes',
            value: girosSnap.docs.filter(doc => doc.data().activo).length,
            subtitle: `${girosSnap.size} total`,
            icon: <CategoryIcon sx={{ fontSize: 40 }} />,
            color: '#0288d1'
          },
          {
            title: 'Configuraciones de Bonos',
            value: bonosSnap.docs.filter(doc => doc.data().activo).length,
            subtitle: `${bonosSnap.size} total`,
            icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
            color: '#f57c00'
          },
          {
            title: 'HubSpot Integrado',
            value: usersWithHubSpot,
            subtitle: `${Math.round((usersWithHubSpot / usersSnap.size) * 100)}% cobertura`,
            icon: usersWithHubSpot > 0 ? <CheckCircleIcon sx={{ fontSize: 40 }} /> : <ErrorIcon sx={{ fontSize: 40 }} />,
            color: usersWithHubSpot > 0 ? '#388e3c' : '#d32f2f'
          },
          {
            title: 'Visitas Registradas',
            value: visitasSnap.size,
            icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
            color: '#5e35b1'
          }
        ]);

        // Actividad reciente (placeholder - en producción vendría de una query ordenada)
        const activities = [
          { type: 'Usuario', action: 'Nuevo usuario registrado', timestamp: 'Hace 2 horas' },
          { type: 'Meta', action: 'Meta actualizada', timestamp: 'Hace 4 horas' },
          { type: 'Liga', action: 'Nueva liga creada', timestamp: 'Hace 1 día' }
        ];
        setRecentActivity(activities);

      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Dashboard Ejecutivo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visión general del sistema Aviva Tu Negocio
        </Typography>
      </Box>

      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box flex={1}>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stat.value}
                    </Typography>
                    {stat.subtitle && (
                      <Typography variant="caption" color="text.secondary">
                        {stat.subtitle}
                      </Typography>
                    )}
                    {stat.trend && (
                      <Box mt={1}>
                        <Chip
                          label={stat.trend}
                          size="small"
                          color="success"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ color: stat.color }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sección de progreso */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Estado del Sistema
            </Typography>
            <Box mt={2}>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Usuarios Activos</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats[0]?.trend}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseInt(stats[0]?.trend || '0')}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Cobertura HubSpot</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats[6]?.subtitle}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseInt(stats[6]?.subtitle || '0')}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Metas Activas</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats[2]?.value} / {stats[2]?.subtitle?.split(' ')[0]}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats[2]?.value && stats[2]?.subtitle ?
                    (stats[2].value / parseInt(stats[2].subtitle.split(' ')[0])) * 100 : 0}
                  color="warning"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actividad Reciente
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {recentActivity.map((activity, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Chip label={activity.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{activity.action}</TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {activity.timestamp}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Información del sistema */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Módulos Disponibles
        </Typography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold">
                  Gestión de Usuarios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CRUD de usuarios, roles, y HubSpot Owner IDs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold">
                  Metas Comerciales
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configuración de metas y bonos (CAC A, B, C)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold">
                  Administración de Ligas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestión de ligas, temporadas y competencias
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold">
                  Configuración HubSpot
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Integración y sincronización con CRM
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Dashboard;
