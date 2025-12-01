import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/usuarios': 'Usuarios',
  '/metas': 'Metas Comerciales',
  '/ligas': 'Ligas',
  '/giros': 'Catálogo de Giros',
  '/hubspot': 'HubSpot',
  '/kioscos': 'Kioscos',
  '/ubicaciones': 'Ubicaciones',
  '/alertas-ubicacion': 'Alertas de Ubicación',
  '/administradores': 'Administradores',
  '/auditoria': 'Auditoría',
  '/config': 'Configuración'
};

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (location.pathname === '/') {
    return null;
  }

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ mb: 2 }}
    >
      <Link
        component={RouterLink}
        to="/"
        color="inherit"
        underline="hover"
      >
        Inicio
      </Link>
      {pathnames.map((_, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = routeNames[to] || to;

        return isLast ? (
          <Typography key={to} color="text.primary">
            {name}
          </Typography>
        ) : (
          <Link
            key={to}
            component={RouterLink}
            to={to}
            color="inherit"
            underline="hover"
          >
            {name}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
};

export default Breadcrumbs;
