# 🖥️ Panel Administrativo Aviva - Web

Panel web de administración para gestionar la aplicación Android de Aviva Tu Negocio.

## 📋 Descripción

Interfaz web administrativa construida con React + TypeScript + Vite que permite gestionar:

- 👥 **Usuarios** y roles
- 🏪 **Kioscos** y ubicaciones
- 🏆 **Ligas** y competencias
- 🎯 **Metas Comerciales**
- 📊 **HubSpot** - Métricas y sincronización
- 🗺️ **Mapa de Vendedores** en tiempo real
- 🎫 **Badges** y logros
- 📈 **Reportería** y análisis

## 🚀 Inicio Rápido

### Requisitos

- Node.js 18+
- npm o yarn
- Firebase CLI configurado

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build
```

## 🏗️ Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Material-UI v5** - Componentes UI
- **React Router v6** - Navegación
- **Firebase SDK** - Backend (Auth, Firestore, Functions)
- **Google Maps API** - Mapas en tiempo real

## 📁 Estructura del Proyecto

```
admin/
├── src/
│   ├── components/          # Componentes reutilizables
│   ├── contexts/            # React Contexts (Auth, etc)
│   ├── pages/               # Páginas principales
│   │   ├── Dashboard.tsx
│   │   ├── Usuarios.tsx
│   │   ├── Kioscos.tsx
│   │   ├── Ligas.tsx
│   │   ├── MetasComerciales.tsx
│   │   ├── HubSpot.tsx
│   │   └── MapaVendedores.tsx
│   ├── types/               # Definiciones TypeScript
│   ├── utils/               # Utilidades
│   ├── App.tsx              # Componente principal
│   └── main.tsx             # Entry point
├── public/                  # Assets estáticos
└── dist/                    # Build de producción
```

## 🔑 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz de `admin/`:

```env
# Firebase
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Google Maps (para el mapa de vendedores)
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
```

### Firebase Config

El archivo `src/firebase.ts` contiene la configuración de Firebase. Asegúrate de que las variables de entorno estén correctamente configuradas.

## 🔐 Autenticación

El panel requiere autenticación con:

- ✅ Google OAuth
- ✅ Email con dominio `@avivacredito.com`
- ✅ Rol de admin en Firestore (`role: "admin"` o `role: "SUPER_ADMIN"`)

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo (puerto 5173)

# Producción
npm run build           # Compilar para producción
npm run preview         # Vista previa del build

# Código
npm run lint            # Linter ESLint
npm run type-check      # Verificar tipos TypeScript
```

## 🚀 Deployment

### Desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

### Producción

```bash
# Compilar
npm run build

# Desplegar a Firebase Hosting
cd ..
firebase deploy --only hosting
```

El admin estará disponible en: `https://TU_PROJECT_ID.web.app`

## 📚 Módulos Principales

### 👥 Gestión de Usuarios

- CRUD completo de usuarios
- Asignación de roles y permisos
- Configuración de HubSpot Owner IDs
- Asignación de kioscos

### 🏪 Gestión de Kioscos

- CRUD de ubicaciones
- Configuración de radios permitidos
- Asignación de vendedores
- Filtros por producto y región

### 🏆 Ligas de Ventas

- Sistema de ligas personalizable
- Criterios de puntuación configurables
- Rankings automáticos en tiempo real
- Premios y recompensas

### 🎯 Metas Comerciales

- Creación de metas por:
  - Todos los promotores
  - Por liga
  - Por promotor específico
  - Por kiosko
- Métricas de llamadas y colocación
- Progreso en tiempo real

### 📊 HubSpot

- Dashboard de métricas CRM
- Sincronización de visitas
- Filtros avanzados
- Reportes personalizados

### 🗺️ Mapa de Vendedores

- Visualización en tiempo real
- Marcadores codificados por color
- Rutas del día
- Filtros por producto y estado
- Estadísticas en vivo

## 🛠️ Troubleshooting

### El admin no compila

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error de autenticación

Verifica:
1. Email tiene dominio `@avivacredito.com`
2. Usuario existe en Firestore colección `users`
3. Usuario tiene `role: "admin"` o `role: "SUPER_ADMIN"`

### Mapa no carga

Verifica:
1. `VITE_GOOGLE_MAPS_API_KEY` está configurada en `.env`
2. Maps JavaScript API está habilitada en Google Cloud
3. Billing está configurado en Google Cloud

### No conecta con Firebase

Verifica:
1. Todas las variables `VITE_FIREBASE_*` están en `.env`
2. Firebase Rules permiten lectura/escritura para admins
3. Internet está funcionando

## 📖 Documentación Adicional

Ver documentación en la raíz del proyecto:

- `ADMIN_PANEL_README.md` - Arquitectura detallada del panel
- `DEPLOYMENT_WINDOWS.md` - Guía de deployment
- `FIREBASE_SETUP_DETALLADO.md` - Configuración Firebase
- `HUBSPOT_INTEGRATION_SETUP.md` - Integración HubSpot
- `MAPA_VENDEDORES.md` - Mapa en tiempo real

## 🤝 Contribuir

Para contribuir al proyecto:

1. Crea una branch: `git checkout -b feature/nueva-funcionalidad`
2. Haz cambios y commits: `git commit -m "feat: agregar X"`
3. Push a la branch: `git push origin feature/nueva-funcionalidad`
4. Crea un Pull Request

## 📝 Notas

- El proyecto usa TypeScript estricto
- Todos los componentes deben tener tipos definidos
- Usa ESLint y Prettier para consistencia
- Material-UI v5 para todos los componentes UI
- React Router v6 para navegación
- Firebase v10 para backend

---

**Desarrollado para Aviva Crédito** 🚀
