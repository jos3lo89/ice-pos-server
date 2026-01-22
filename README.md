# ice-pos-server

Backend del sistema de punto de venta (POS) ice, construido con NestJS y PostgreSQL.

## Descripción

**ice-pos-server** es el servidor backend para el sistema POS ice, diseñado para gestionar operaciones de punto de venta como:

- **Gestión de usuarios** - Administración de empleados y vendedores
- **Operaciones de venta** - Procesamiento de transacciones
- **Control de inventario** - Seguimiento de productos y stock
- **Reportes y estadísticas** - Datos para análisis de ventas

Este servidor proporciona una API RESTful segura y escalable, utilizando las mejores prácticas de desarrollo con TypeScript y una arquitectura modular.

## Características

- API RESTful con NestJS framework
- Base de datos PostgreSQL con Prisma ORM
- Contenedorización completa con Docker
- Validación de datos con class-validator
- Configuración mediante variables de entorno
- Soporte para cookies y CORS configurable
- Arquitectura modular y escalable
- Generación automática de cliente Prisma

## Requisitos Previos

| Software       | Versión Mínima  |
| -------------- | --------------- |
| Node.js        | 20.x o superior |
| npm            | 10.x o superior |
| PostgreSQL     | 14.x o superior |
| Docker         | 24.x (opcional) |
| Docker Compose | 2.x (opcional)  |

## Instalación Local

### 1. Clonar el repositorio

```bash
git clone <URL-DEL-REPOSITORIO>
cd ice-pos-server
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el archivo `.env` con tu configuración:

```env
# Conexión a PostgreSQL (requerido)
DATABASE_URL="postgresql://usuario:password@localhost:5432/ice_pos?schema=public"

# Puerto del servidor
PORT=5000

# Entorno de ejecución
NODE_ENV="development"

# Orígenes permitidos para CORS
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Prefijo para los endpoints de la API
API_PREFIX="api/v1"
```

### 4. Generar cliente de Prisma

```bash
npx prisma generate
```

### 5. Ejecutar migraciones de base de datos

```bash
npx prisma migrate dev
```

### 6. Poblar datos iniciales (opcional)

```bash
npx prisma db seed
```

### 7. Iniciar el servidor

```bash
# Modo desarrollo con hot-reload
npm run start:dev

# O modo producción
npm run build
npm run start:prod
```

El servidor estará disponible en `http://localhost:5000`

---

## Instalación con Docker

### Requisitos

- Docker instalado
- Docker Compose instalado
- Una instancia de PostgreSQL (puede ser local o en Docker)

### Pasos

#### Opción 1: Con PostgreSQL en Docker

```bash
# 1. Clonar repositorio
git clone <URL-DEL-REPOSITORIO>
cd ice-pos-server

# 2. Crear red para comunicación
docker network create ice-network

# 3. Levantar PostgreSQL
docker run -d \
  --name ice-postgres \
  --network ice-network \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ice_pos \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL de PostgreSQL en Docker

# 5. Construir y ejecutar la aplicación
docker compose up -d --build
```

#### Opción 2: Con PostgreSQL local

```bash
# 1. Clonar repositorio
git clone <URL-DEL-REPOSITORIO>
cd ice-pos-server

# 2. Configurar variables de entorno
cp .env.example .env
# Asegúrate de que DATABASE_URL apunte a tu PostgreSQL local

# 3. Construir y ejecutar
docker compose up -d --build
```

### Verificar que está funcionando

```bash
# Ver logs del contenedor
docker compose logs -f app-server

# Ver estado de contenedores
docker compose ps
```

### Comandos Docker útiles

```bash
# Detener servicios
docker compose down

# Detener y eliminar volúmenes
docker compose down -v

# Reconstruir imágenes
docker compose up -d --build --no-cache

# Reiniciar servicio
docker compose restart app-server
```

---

## Variables de Entorno

| Variable       | Descripción                                             | Valor por Defecto                           | Requerido |
| -------------- | ------------------------------------------------------- | ------------------------------------------- | --------- |
| `DATABASE_URL` | URL completa de conexión a PostgreSQL                   | -                                           | Sí        |
| `PORT`         | Puerto donde corre el servidor                          | 5000                                        | No        |
| `NODE_ENV`     | Entorno de ejecución (development/production)           | development                                 | No        |
| `CORS_ORIGINS` | Lista de orígenes separados por coma permitidos en CORS | http://localhost:5173,http://localhost:3000 | No        |
| `API_PREFIX`   | Prefijo para todas las rutas de la API                  | api/v1                                      | No        |

### Formato de DATABASE_URL

```
postgresql://[usuario]:[password]@[host]:[puerto]/[nombre_base_datos]?schema=public
```

Ejemplo:

```
DATABASE_URL="postgresql://postgres:secret@localhost:5432/ice_pos?schema=public"
```

---

## Comandos Disponibles

### Desarrollo

```bash
npm run start           # Iniciar servidor
npm run start:dev       # Iniciar con hot-reload (recomendado)
npm run start:debug     # Iniciar con modo debug
```

### Producción

```bash
npm run build           # Compilar TypeScript a JavaScript
npm run start:prod      # Iniciar versión compilada
```

### Linting y Formato

```bash
npm run lint            # Verificar y auto-corrección de errores
npm run format          # Formatear código con Prettier
```

### Prisma CLI

```bash
npx prisma studio       # Abrir GUI de la base de datos
npx prisma migrate dev  # Crear y aplicar migraciones (desarrollo)
npx prisma migrate deploy  # Aplicar migraciones (producción)
npx prisma db seed      # Ejecutar seed
```

---

## Estructura del Proyecto

```
ice-pos-server/
├── src/
│   ├── main.ts                      # Punto de entrada de la aplicación
│   ├── app.module.ts                # Módulo principal
│   ├── app.controller.ts            # Controlador principal
│   ├── app.service.ts               # Servicio principal
│   └── core/
│       ├── config/
│       │   └── vars.config.ts       # Configuración de variables de entorno
│       └── prisma/
│           ├── prisma.module.ts     # Módulo de Prisma
│           ├── prisma.service.ts    # Servicio de Prisma
│           └── prisma.service.spec.ts
├── prisma/
│   ├── schema.prisma                # Schema de la base de datos
│   ├── migrations/                  # Migraciones de la base de datos
│   └── seed.ts                      # Script de datos iniciales
├── test/
│   └── app.e2e-spec.ts              # Tests end-to-end
├── compose.yml                      # Configuración de Docker Compose
├── Dockerfile                       # Dockerfile de la aplicación
├── docker-entrypoint.sh             # Script de entrada para Docker
├── prisma.config.ts                 # Configuración de Prisma
├── .env.example                     # Ejemplo de variables de entorno
├── package.json
├── tsconfig.json
└── README.md
```

---

## API Reference

- **URL Base:** `http://localhost:5000`
- **Prefijo de API:** `api/v1` (configurable mediante `API_PREFIX`)
- **Health Check:** `GET /health`

### Ejemplo de respuesta health check

```json
{
  "status": "ok",
  "timestamp": "2026-01-22T00:00:00.000Z"
}
```

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Cliente (Frontend)                   │
│              ( ice-pos-web / app móvil )                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ice-pos-server                           │
│                    ( NestJS + Node.js )                     │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Controllers │  │  Services   │  │  Prisma ORM         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ PostgreSQL Protocol
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                               │
│                  ( Base de Datos )                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Contribución

1. Haz fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## Soporte

Si tienes dudas o necesitas ayuda, puedes:

- Revisar la documentación de [NestJS](https://docs.nestjs.com)
- Revisar la documentación de [Prisma](https://www.prisma.io/docs)
- Abrir un issue en el repositorio
