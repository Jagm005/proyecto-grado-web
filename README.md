# Inventario Institucional — Universidad Cooperativa de Colombia (UCP)

Sistema web para la gestión integral de activos fijos institucionales. Permite registrar, monitorear, auditar y reportar el inventario físico de la universidad con control de acceso basado en roles.

---

## Tabla de Contenidos

1. [¿Qué hace este proyecto?](#1-qué-hace-este-proyecto)
2. [Arquitectura general](#2-arquitectura-general)
3. [Tecnologías utilizadas](#3-tecnologías-utilizadas)
4. [Roles de usuario](#4-roles-de-usuario)
5. [Módulos y páginas](#5-módulos-y-páginas)
6. [Componentes reutilizables](#6-componentes-reutilizables)
7. [Gestión de estado (Contextos)](#7-gestión-de-estado-contextos)
8. [API y comunicación con el backend](#8-api-y-comunicación-con-el-backend)
9. [Autenticación y seguridad](#9-autenticación-y-seguridad)
10. [Configuración de entorno](#10-configuración-de-entorno)
11. [Cómo correr el proyecto en desarrollo](#11-cómo-correr-el-proyecto-en-desarrollo)
12. [Cómo construir para producción](#12-cómo-construir-para-producción)
13. [Despliegue en EC2 con Nginx](#13-despliegue-en-ec2-con-nginx)
14. [Configuración de Nginx](#14-configuración-de-nginx)
15. [SSL con Let's Encrypt](#15-ssl-con-lets-encrypt)
16. [Variables de entorno de referencia](#16-variables-de-entorno-de-referencia)
17. [Estructura de carpetas](#17-estructura-de-carpetas)

---

## 1. ¿Qué hace este proyecto?

Es una **aplicación web SPA (Single Page Application)** diseñada para gestionar el inventario de activos físicos de la Universidad Cooperativa de Colombia. Sus funciones principales son:

- **Registrar activos** (computadores, mobiliario, equipos de laboratorio, vehículos, etc.) con todos sus metadatos: código, categoría, ubicación, responsable, valor de adquisición, vida útil, estado, fotos, etc.
- **Calcular depreciación** en tiempo real de cada activo según su valor de adquisición y vida útil.
- **Controlar quién puede hacer qué**, con seis roles diferenciados.
- **Auditar cambios**: cada modificación a un activo queda registrada en su historial.
- **Reportar datos** exportando a PDF, Excel o CSV con filtros avanzados por período, estado, dependencia, categoría, programa y responsable.
- **Gestionar usuarios** del sistema: crear, editar, asignar roles, resetear contraseñas.
- **Notificar eventos importantes**: activos no encontrados, solicitudes de cambio de contraseña, avisos generales.
- **Detectar hallazgos de auditoría**: activos duplicados, sin responsable, o marcados como no encontrados.

---

## 2. Arquitectura general

```
┌────────────────────────────────────────────────────────┐
│                   NAVEGADOR (SPA)                      │
│                                                        │
│   React 18 + React Router v6 + Vite 6                 │
│   ┌──────────┐  ┌──────────┐  ┌─────────────────────┐ │
│   │AuthContext│  │AppContext │  │ ToastContext         │ │
│   └──────────┘  └──────────┘  └─────────────────────┘ │
│         │              │                               │
│   ┌─────▼──────────────▼──────────────────────────┐   │
│   │               api.js (Axios)                  │   │
│   │  JWT interceptor + camelCase↔snake_case        │   │
│   └────────────────────┬──────────────────────────┘   │
└────────────────────────┼───────────────────────────────┘
                         │ HTTPS /api/*
┌────────────────────────▼───────────────────────────────┐
│                    NGINX (EC2)                         │
│  Puerto 80 → 443 redirect                             │
│  /          → /var/www/inventario (dist React)         │
│  /api/*     → localhost:3000 (Node.js backend)         │
└────────────────────────┬───────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────┐
│           Backend Node.js/Express (puerto 3000)        │
│           Base de datos relacional                     │
└────────────────────────────────────────────────────────┘
```

El frontend nunca habla directamente al backend en producción: todo pasa por Nginx, que actúa como proxy inverso y servidor de archivos estáticos.

---

## 3. Tecnologías utilizadas

| Categoría | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 18.3.1 |
| Build tool | Vite | 6.4.2 |
| Enrutamiento | React Router DOM | 6.26.1 |
| HTTP client | Axios | 1.7.7 |
| Autenticación OAuth | @react-oauth/google | 0.12.1 |
| Exportar PDF | jsPDF + jspdf-autotable | 2.5.1 / 3.8.4 |
| Exportar Excel/CSV | xlsx | 0.18.5 |
| Servidor web | Nginx | — |
| SSL | Let's Encrypt (Certbot) | — |
| Hosting | AWS EC2 | — |
| Fuente tipográfica | Libre Franklin (Google Fonts) | — |

---

## 4. Roles de usuario

El sistema maneja seis roles. Un usuario puede tener más de uno asignado.

| Rol | Clave interna | Permisos principales |
|---|---|---|
| Administrador | `administrador` | Acceso total: usuarios, activos, reportes, notificaciones |
| Auxiliar de Inventario | `auxiliarInventario` | Crear/editar activos |
| Responsable de Área | `responsableArea` | Ver reportes de su área, reportar activos no encontrados |
| Dirección Admin. Financiera | `direccionAdminFin` | Ver reportes financieros y de depreciación |
| Auditor | `auditor` | Acceso de solo lectura a reportes y hallazgos |
| Soporte TI | `soporteTI` | Acceso básico al sistema |

---

## 5. Módulos y páginas

### Login (`/login`)
- Autenticación por usuario/contraseña o **Google OAuth 2.0**.
- Sistema de bloqueo de cuenta: después de N intentos fallidos (configurable) la cuenta se bloquea temporalmente.
- Avisos progresivos: el usuario ve cuántos intentos le quedan antes del bloqueo.
- Recuperación de contraseña: el usuario escribe su nombre de usuario y se genera una notificación para que el administrador la gestione.
- Botones de acceso rápido para pruebas (demo users).

### Dashboard (`/`)
- Bienvenida personalizada con la fecha actual.
- **Tarjetas métricas:** total de activos, usuarios registrados (solo admin), valor depreciado total, activos no encontrados.
- **Gráfico de distribución** de activos por estado.
- **Información de sesión:** datos del usuario actual, roles y área.
- **Alertas de auditoría:** activos sin responsable, códigos duplicados, activos no encontrados.
- Botón de recarga manual de datos.

### Activos (`/assets`)
- Tabla completa con todos los activos del inventario.
- **Filtros:** búsqueda por código/nombre/responsable, filtro por estado, categoría y dependencia.
- **Crear activo** (modal): campos completos — código, nombre, categoría, subcategoría, ubicación, responsable, dependencia, centro de costos, valor de adquisición, fecha de adquisición, vida útil en años, estado, observaciones, programa, foto en base64.
- **Editar activo** (modal): mismos campos, solo para administrador y auxiliar.
- **Ver historial** de cambios del activo.
- **Eliminar activo** con confirmación.
- **Reportar activo no encontrado**: crea una notificación para el administrador.
- Cálculo de **valor depreciado** en tiempo real visible en la tabla.

### Usuarios (`/users`)
- Solo accesible para `administrador`.
- Tabla con ID, usuario, nombre, email, roles (badges), área, estado activo, última sesión.
- **Crear usuario** (modal): ID, usuario, nombre completo, email, contraseña, área, roles múltiples.
- **Editar usuario**: mismos campos (contraseña es opcional en edición).
- **Resetear contraseña**: genera contraseña aleatoria segura y la actualiza en el backend.
- **Eliminar usuario**: no se puede eliminar el usuario actualmente en sesión.
- Búsqueda por usuario, nombre completo o email.
- Configuración de umbral de intentos de login fallidos.

### Reportes (`/reports`)
- Accesible para: administrador, auditor, direccionAdminFin, responsableArea.
- **Períodos:** Mensual, Semestral, Anual.
- **Filtros avanzados:** estado, dependencia, categoría, programa, responsable.
- **Métricas del reporte:** total activos, valor de adquisición total, valor depreciado total.
- **Exportación:**
  - PDF en formato apaisado con tabla (jsPDF + autotable).
  - Excel (.xlsx) con hoja de cálculo completa.
  - CSV con codificación BOM (compatible con Excel en español).
- Tabla de resultados: código, nombre, categoría, dependencia, estado, responsable, valor adquisición, valor depreciado, fecha adquisición.

### Notificaciones (`/notifications`)
- **Tipos de notificación:**
  - `missing_asset`: activo reportado como no encontrado.
  - `password_reset_request`: solicitud de reseteo de contraseña.
  - `info`: aviso general.
- **Estados:** Pendiente, Aprobada, Denegada.
- **Acciones:** marcar leída/no leída, aprobar, denegar (solo admin), marcar todas como leídas.
- Filtrado por rol: cada usuario solo ve las notificaciones relevantes para su rol o las que él mismo creó.
- Contador de no leídas en el sidebar (tope de 99+).
- Persistencia en `localStorage`.

### Configuración de Cuenta (`/settings`)
- Información de perfil de solo lectura: ID, usuario, email, área, roles.
- **Editar nombre completo**.
- **Cambiar contraseña:**
  1. Verificar contraseña actual (llama al endpoint de login).
  2. Ingresar nueva contraseña (mínimo 6 caracteres).
  3. Confirmar nueva contraseña.
  4. Actualizar en el backend.

---

## 6. Componentes reutilizables

### `Layout.jsx`
Shell principal de la aplicación:
- Sidebar fijo (240px) con navegación, información del usuario y botón de logout.
- Visibilidad de ítems del sidebar según rol.
- Badge de notificaciones no leídas en el enlace "Avisos".
- Topbar con título de página y menú hamburguesa (responsive).
- Comportamiento mobile: sidebar deslizante desde la izquierda con overlay.
- Exporta ~20 componentes de iconos SVG usados en toda la app.

### `Modal.jsx`
Diálogo reutilizable:
- Overlay semi-transparente.
- Ancho máximo configurable (por defecto 560px).
- Header con título y botón de cierre.
- Body con scroll independiente.
- Footer opcional para botones de acción.
- Se cierra con `Escape` o clic fuera del contenido.
- Bloquea el scroll del body mientras está abierto.
- Animación de entrada suave.

### `Toast.jsx`
Sistema de notificaciones en pantalla:
- Manejado por contexto (`useToast()`).
- Tres tipos: `success` (verde), `error` (rojo), `info` (azul).
- Auto-dismiss: 3.5s para success, 5s para error.
- Apilados en la esquina inferior derecha.
- Botón de cierre manual.
- Animación de deslizamiento hacia arriba.

---

## 7. Gestión de estado (Contextos)

### `AuthContext`
- Almacena y expone el usuario actualmente autenticado (`currentUser`).
- Persiste usuario y token JWT en `localStorage` (`inventario_user`, `inventario_token`).
- Restaura la sesión automáticamente al recargar la página.
- Escucha el evento `auth:expired`: cuando el token expira, limpia la sesión y redirige al login.
- Expone funciones de utilidad: `hasRole(role)`, `canManageUsers()`, `canManageAssets()`.
- Métodos: `login(identifier, password)`, `loginWithGoogle()`, `logout()`.

### `AppContext`
- Almacena: lista de activos (`assets`), usuarios (`users`), notificaciones (`notifications`).
- Carga activos y usuarios en paralelo al montar la aplicación.
- **CRUD de activos:** `createAsset`, `updateAsset`, `deleteAsset`. Cada modificación registra entrada en el historial del activo.
- **CRUD de usuarios:** `createUser`, `updateUser`, `resetPassword`, `deleteUser`.
- **Gestión de notificaciones:** `addNotification`, `markRead`, `markAllRead`, `approveNotification`, `denyNotification`, `reportMissingAsset`, `requestCredentialReset`.
- **Auditoría:** función `auditFindings()` que devuelve activos no encontrados, códigos duplicados y activos sin responsable.
- Notificaciones persistidas en `localStorage` (`inventario_notifications`).

---

## 8. API y comunicación con el backend

Toda la comunicación pasa por `src/api.js`, que configura un cliente Axios con:

- **Base URL:** vacía en producción (Nginx hace proxy), o `VITE_BACKEND_URL` en desarrollo.
- **Timeout:** 12 segundos.
- **Interceptor de solicitudes:** agrega automáticamente el header `Authorization: Bearer <token>`.
- **Interceptor de respuestas:** convierte las respuestas de `snake_case` a `camelCase`. Ante un 401, limpia el token y emite `auth:expired`.
- **Envío de datos:** convierte automáticamente los objetos de `camelCase` a `snake_case` antes de enviar.

#### Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login con credenciales |
| POST | `/api/auth/google-login` | Login con Google OAuth |
| GET | `/api/users` | Listar usuarios |
| POST | `/api/users` | Crear usuario |
| PATCH | `/api/users/:id` | Actualizar usuario |
| PATCH | `/api/users/:id/password` | Cambiar contraseña |
| DELETE | `/api/users/:id` | Eliminar usuario |
| GET | `/api/assets` | Listar activos |
| GET | `/api/assets/:code` | Obtener activo con historial |
| POST | `/api/assets` | Crear activo |
| PATCH | `/api/assets/:code` | Actualizar activo |
| DELETE | `/api/assets/:code` | Eliminar activo |
| POST | `/api/assets/:code/history` | Agregar entrada al historial |
| GET | `/api/inventory/sessions` | Listar sesiones de inventario |
| POST | `/api/inventory/sessions` | Crear sesión de inventario |
| POST | `/api/inventory/sessions/:id/verifications` | Agregar verificación |

---

## 9. Autenticación y seguridad

- **JWT (JSON Web Token):** el backend emite un token al autenticar. El frontend lo guarda en `localStorage` y lo adjunta a cada petición.
- **Google OAuth 2.0:** mediante la librería `@react-oauth/google`. El token de Google se envía al backend, que lo valida y devuelve el JWT interno.
- **Bloqueo de cuenta:** el backend devuelve códigos `LOCK`, `WARN` e `INFO` para comunicar el estado del intento de login al frontend.
- **Rutas protegidas:** el componente `ProtectedRoute` en `App.jsx` verifica autenticación y permisos de rol antes de renderizar cualquier página.
- **Expiración automática:** si el backend responde con 401, la sesión se cierra y el usuario es redirigido al login.
- **Headers de seguridad (Nginx):** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`.

---

## 10. Configuración de entorno

Crea un archivo `.env` (o `.env.local`) en la raíz del proyecto:

```env
# URL base del backend. En producción dejar vacío para que Nginx haga proxy.
# En desarrollo, poner la URL completa del servidor.
VITE_BACKEND_URL=https://inventario-ucp.duckdns.org

# Client ID de Google OAuth 2.0 (obtenido en Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=XXXXXXXX.apps.googleusercontent.com
```

> En producción (EC2), `VITE_BACKEND_URL` debe estar vacío o no definido. Nginx se encarga de redirigir `/api/*` al backend local.

---

## 11. Cómo correr el proyecto en desarrollo

### Requisitos previos

- Node.js >= 18
- npm >= 9
- Acceso al backend (puede ser la instancia EC2 remota o uno local)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd proyecto-grado-web

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de variables de entorno
# (copiar el ejemplo y ajustar valores)
cp .env.example .env
# Editar .env con tu VITE_BACKEND_URL y VITE_GOOGLE_CLIENT_ID

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

El servidor de desarrollo de Vite está configurado para hacer proxy de las peticiones `/api/*` al backend definido en `VITE_BACKEND_URL`, por lo que no hay problemas de CORS en desarrollo.

---

## 12. Cómo construir para producción

```bash
# Generar el bundle optimizado en la carpeta dist/
npm run build

# Previsualizar el build localmente (opcional)
npm run preview
```

Los archivos estáticos quedan en `dist/`. Los assets (JS, CSS, fuentes, imágenes) se colocan en `dist/_static/` para no colisionar con la ruta `/assets` de la SPA.

---

## 13. Despliegue en EC2 con Nginx

El script `deploy-ec2.sh` automatiza todo el proceso:

```bash
# Uso:
bash deploy-ec2.sh <host> <usuario> <ruta-clave-pem>

# Ejemplo:
bash deploy-ec2.sh ec2-XX-XX-XX-XX.compute.amazonaws.com ec2-user ~/.ssh/mi-clave.pem
```

El script realiza los siguientes pasos:
1. Instala dependencias (`npm install`).
2. Construye la aplicación (`npm run build`) con `VITE_BACKEND_URL` vacío.
3. Transfiere el contenido de `dist/` al servidor remoto en `/var/www/inventario` usando `rsync` (o `scp` si rsync no está disponible).
4. Nginx sirve los archivos desde ahí.

### Requisitos en el servidor EC2

```bash
# Instalar Nginx
sudo apt update && sudo apt install nginx -y

# Crear directorio web
sudo mkdir -p /var/www/inventario
sudo chown -R $USER:$USER /var/www/inventario

# Copiar la configuración de Nginx
sudo cp nginx/inventario.conf /etc/nginx/sites-available/inventario
sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/inventario
sudo nginx -t
sudo systemctl reload nginx
```

---

## 14. Configuración de Nginx

El archivo `nginx/inventario.conf` define dos bloques:

**Puerto 80:** redirige todo el tráfico a HTTPS.

**Puerto 443 (HTTPS):**
- Sirve los archivos estáticos desde `/var/www/inventario`.
- `try_files $uri /index.html` para que el enrutamiento del lado del cliente funcione correctamente (React Router).
- Cache de 1 año con `immutable` para archivos estáticos (JS, CSS, fuentes, imágenes).
- Proxy inverso: `/api/*` → `http://localhost:3000` (backend Node.js).
  - Timeout de conexión: 10s.
  - Timeout de lectura: 30s.
  - Headers proxy: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- Headers de seguridad HTTP.
- Logs separados en `/var/log/nginx/inventario_access.log` y `inventario_error.log`.

---

## 15. SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener y configurar el certificado (solo una vez)
sudo certbot --nginx -d inventario-ucp.duckdns.org

# Renovación automática (Certbot la configura sola, pero puedes verificar)
sudo certbot renew --dry-run
```

Certbot modifica automáticamente el archivo de Nginx para agregar los paths del certificado SSL.

---

## 16. Variables de entorno de referencia

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_BACKEND_URL` | Sí (dev) / No (prod) | URL base del backend. Vacío en producción. |
| `VITE_GOOGLE_CLIENT_ID` | Sí | Client ID de Google Cloud Console para OAuth. |

**Claves de `localStorage` usadas en el navegador:**

| Clave | Contenido |
|---|---|
| `inventario_token` | JWT de autenticación |
| `inventario_user` | Objeto JSON con datos del usuario actual |
| `inventario_notifications` | Array JSON con todas las notificaciones |

---

## 17. Estructura de carpetas

```
proyecto-grado-web/
├── index.html                  # Punto de entrada HTML
├── package.json                # Dependencias y scripts
├── vite.config.js              # Configuración de Vite (proxy, alias, output dir)
├── vercel.json                 # Configuración Vercel (referencia, no activo)
├── deploy-ec2.sh               # Script de despliegue a EC2
├── deploy-s3.sh                # Script S3 (NO USAR, referencia histórica)
├── assets/                     # Archivos estáticos (imágenes, logos)
├── nginx/
│   └── inventario.conf         # Configuración de Nginx para producción
└── src/
    ├── main.jsx                # Bootstrap: proveedores de contexto + router
    ├── App.jsx                 # Definición de rutas y ProtectedRoute
    ├── api.js                  # Cliente Axios configurado + todos los endpoints
    ├── theme.js                # Constantes del dominio, utilidades y formateo
    ├── index.css               # Sistema de diseño completo (variables, componentes CSS)
    ├── components/
    │   ├── Layout.jsx          # Shell: sidebar, topbar, navegación, iconos SVG
    │   ├── Modal.jsx           # Componente de diálogo reutilizable
    │   └── Toast.jsx           # Sistema de notificaciones en pantalla
    ├── context/
    │   ├── AuthContext.jsx     # Estado de autenticación y sesión
    │   └── AppContext.jsx      # Estado global: activos, usuarios, notificaciones
    └── pages/
        ├── LoginPage.jsx           # Autenticación (credenciales + Google OAuth)
        ├── DashboardPage.jsx       # Panel principal con métricas y auditoría
        ├── AssetsPage.jsx          # CRUD completo de activos / inventario
        ├── UsersPage.jsx           # Gestión de usuarios y roles
        ├── ReportsPage.jsx         # Reportes con exportación PDF / Excel / CSV
        ├── NotificationsPage.jsx   # Centro de notificaciones y aprobaciones
        └── AccountSettingsPage.jsx # Perfil y cambio de contraseña
```

---

## Flujo rápido de primer uso

1. El administrador del sistema crea los usuarios iniciales desde `UsersPage`.
2. Cada usuario recibe sus credenciales (o se resetean desde el panel).
3. Los auxiliares de inventario registran los activos desde `AssetsPage`.
4. Los responsables de área pueden consultar y reportar activos no encontrados.
5. Los auditores y la DAF acceden a `ReportsPage` para generar informes.
6. El administrador revisa notificaciones pendientes en `NotificationsPage`.

---

> Proyecto de grado — Universidad Cooperativa de Colombia  
> Desarrollado con React 18 + Vite + Axios + jsPDF + xlsx  
> Infraestructura: AWS EC2 + Nginx + Let's Encrypt
