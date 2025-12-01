import React from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
import { useApp } from '../contexts/AppContext';

const LoadingOverlay: React.FC = () => {
  const { isLoading } = useApp();

  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1000 }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
};

export default LoadingOverlay;
