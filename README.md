# BDNS Web - Sistema de Búsqueda de Subvenciones

[![Next.js](https://img.shields.io/badge/Next.js-14.2.29-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://typescriptlang.org/)

## 🎯 Descripción

**BDNS Web** es un sistema avanzado de búsqueda de subvenciones que crea un espejo local de la Base de Datos Nacional de Subvenciones (BDNS) de España para proporcionar búsquedas ultra-rápidas y funcionalidades avanzadas.

### ✨ Características Principales

- 🔍 **Búsqueda ultra-rápida** con PostgreSQL y full-text search en español
- 🔄 **Sincronización automática** con la API oficial del BDNS
- 👤 **Sistema de usuarios completo** con autenticación y perfiles
- ⭐ **Favoritos y seguimiento** de convocatorias
- 📧 **Notificaciones por email** y sistema 2FA
- 📊 **Base de datos optimizada** con +500k registros
- 🐳 **Dockerizado** para fácil despliegue

### 📊 Estado Actual

- ✅ **Base de datos**: 13,000+ convocatorias sincronizadas
- ✅ **API Real**: Conectado a la API oficial del BDNS
- ✅ **Autenticación**: NextAuth con Google OAuth y credenciales
- ✅ **Email**: Sistema completo con verificación y 2FA
- ✅ **UI/UX**: Interfaz moderna con Tailwind CSS

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Node.js 18+ (para desarrollo)
- Git

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd bdns-web

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus configuraciones

# Iniciar con Docker
npm run docker:dev

# O desarrollo local
npm install
npm run dev
```

### Comandos Principales

```bash
# Desarrollo
npm run dev                 # Servidor de desarrollo
npm run build              # Build de producción
npm run docker:dev          # Docker en modo desarrollo

# Base de datos
npm run db:sync             # Sincronización incremental
npm run db:sync:full        # Sincronización completa (2023+)
npm run db:sync:complete    # Migración histórica completa

# Docker
docker-compose up -d        # Servicios base (PostgreSQL)
docker-compose --profile dev up -d  # Con servidor de desarrollo
```

## 📁 Estructura del Proyecto

```
bdns-web/
├── src/
│   ├── app/                # App Router (Next.js 14)
│   │   ├── api/           # Endpoints de la API
│   │   ├── auth/          # Páginas de autenticación
│   │   └── ...            # Páginas principales
│   ├── components/        # Componentes React reutilizables
│   ├── lib/               # Librerías y utilidades
│   ├── types/             # Definiciones de TypeScript
│   └── hooks/             # Custom React hooks
├── docs/                  # 📚 Documentación completa
├── scripts/               # Scripts de sincronización
├── migrations/            # Migraciones de base de datos
└── docker-compose.yml     # Configuración Docker
```

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [📖 DOCUMENTATION-INDEX](docs/DOCUMENTATION-INDEX.md) | **Índice completo de toda la documentación** |
| [🚀 DEVELOPMENT-GUIDE](docs/DEVELOPMENT-GUIDE.md) | Guía completa de desarrollo |
| [🐳 DOCKER-SETUP](docs/DOCKER-SETUP.md) | Configuración Docker detallada |
| [🗄️ DATABASE-STRUCTURE](docs/DATABASE-STRUCTURE.md) | Estructura de la base de datos |
| [🔧 CONFIGURATION-GUIDE](docs/CONFIGURATION-GUIDE.md) | Configuración del sistema |
| [📡 API-DOCUMENTATION](docs/API-DOCUMENTATION.md) | Documentación de la API |
| [🔄 AUTOMATIC-SYNC](docs/AUTOMATIC-SYNC.md) | Sistema de sincronización |
| [🚢 DEPLOYMENT](docs/DEPLOYMENT.md) | Guía de despliegue |

### Documentación Técnica Específica

| Área | Documentos |
|------|------------|
| **Componentes** | [COMPONENTS-GUIDE](docs/COMPONENTS-GUIDE.md) |
| **Features** | [FEATURES-GUIDE](docs/FEATURES-GUIDE.md) |
| **Conexión API** | [API-CONNECTION](docs/API-CONNECTION.md) |
| **Migración** | [MIGRATION-GUIDE](docs/MIGRATION-GUIDE.md) |
| **GitHub Setup** | [GITHUB-SETUP](docs/GITHUB-SETUP.md) |
| **Estado URL** | [URL-STATE-MANAGEMENT](docs/URL-STATE-MANAGEMENT.md) |

### Roadmap y Mejoras

| Fase | Documentos |
|------|------------|
| **Fase 1** | [PHASE1-IMPLEMENTATION](docs/PHASE1-IMPLEMENTATION.md) |
| **Mejoras** | [IMPROVEMENT-PLAN](docs/IMPROVEMENT-PLAN.md) |
| **Resumen** | [BDNS-IMPROVEMENT-SUMMARY](docs/BDNS-IMPROVEMENT-SUMMARY.md) |

## 🔧 Configuración

### Variables de Entorno Principales

```env
# Base de datos
DATABASE_URL=postgresql://bdns_user:bdns_password@localhost:5432/bdns_db

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-aqui

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL 15
- **Autenticación**: NextAuth.js con Google OAuth
- **Email**: Nodemailer con templates HTML
- **Base de datos**: PostgreSQL con full-text search español
- **Containerización**: Docker Compose
- **API Externa**: BDNS (Base de Datos Nacional de Subvenciones)

### Flujo de Datos

```
API BDNS → Scripts Sync → PostgreSQL → API Routes → Frontend → Usuario
                ↓
         Notificaciones Email ← Sistema 2FA ← Autenticación
```

## 🚀 Implementaciones Pendientes

### 📋 Fase 1 - Funcionalidades Core
- [ ] **Centro de Documentación Web**: Implementar sección `/docs` en la aplicación
  - [ ] Documentación de API interactiva (Swagger/OpenAPI)
  - [ ] Guías de usuario paso a paso
  - [ ] Ejemplos de código y casos de uso
  - [ ] FAQ y troubleshooting
- [ ] **Dashboard de administración** para gestión de usuarios
- [ ] **Exportación avanzada** (Excel, PDF con filtros)
- [ ] **Notificaciones push** en tiempo real

### 📋 Fase 2 - Funcionalidades Avanzadas
- [ ] **Centro de Documentación Completo**:
  - [ ] API Explorer interactivo
  - [ ] Documentación técnica integrada
  - [ ] Tutoriales en video embebidos
  - [ ] Sistema de comentarios en docs
- [ ] **Analytics y estadísticas** de uso
- [ ] **API pública** para terceros
- [ ] **Mobile app** (React Native)
- [ ] **Integraciones** con sistemas externos

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🔗 Enlaces Útiles

- [🌐 Demo en vivo](http://100.29.164.84:3001/)
- [📊 Estado del sistema](http://100.29.164.84:3001/api/sync)
- [📧 Configuración de email](docs/CONFIGURATION-GUIDE.md#email-configuration)
- [🐳 Guía Docker](docs/DOCKER-SETUP.md)

---

⭐ **¿Te gusta el proyecto?** ¡Dale una estrella en GitHub!

📞 **¿Necesitas ayuda?** Consulta la [documentación completa](docs/DOCUMENTATION-INDEX.md) o abre un issue.