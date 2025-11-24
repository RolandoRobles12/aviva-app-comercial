import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress
} from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../config/firebase';

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactElement;
  color: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const kioscosSnap = await getDocs(collection(db, 'kiosks'));
        const usersSnap = await getDocs(query(collection(db, 'users')));
        const metricsSnap = await getDocs(collection(db, 'userMetrics'));

        setStats([
          {
            title: 'Kioscos',
            value: kioscosSnap.size,
            icon: <StoreIcon sx={{ fontSize: 40 }} />,
            color: '#1976d2'
          },
          {
            title: 'Usuarios',
            value: usersSnap.size,
            icon: <PeopleIcon sx={{ fontSize: 40 }} />,
            color: '#2e7d32'
          },
          {
            title: 'Métricas',
            value: metricsSnap.size,
            icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
            color: '#ed6c02'
          },
          {
            title: 'Textos Dinámicos',
            value: 0, // Placeholder
            icon: <TextFieldsIcon sx={{ fontSize: 40 }} />,
            color: '#9c27b0'
          }
        ]);
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
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4">
                      {stat.value}
                    </Typography>
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
    </Box>
  );
};

export default Dashboard;
