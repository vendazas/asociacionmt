# motosaas-backend

Backend MVP REST para MotoSaaS, un SaaS multi asociacion para asociaciones de motociclistas.

## Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Swagger
- Winston Logger
- Google OAuth

No usa Socket.IO, Firebase, colas, microservicios, Docker ni TypeScript.

## Modulos MVP

- Asociaciones
- Usuarios
- Motociclistas
- Vehiculos
- Tarifas
- Zonas de cobertura
- Viajes
- Historial
- Calificaciones
- Reportes

## Roles

- `SUPER_ADMIN`
- `ASSOCIATION_ADMIN`
- `DRIVER`
- `CUSTOMER`

## Instalacion

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Al iniciar, el servicio revisa la base de datos. Si la base ya tiene tablas, ejecuta `prisma migrate deploy` para aplicar migraciones pendientes sin usar `db push`. Si la base esta vacia, crea el esquema inicial y marca las migraciones locales como aplicadas.

Si estas conectando una base existente que ya tenia tablas pero no tenia historial de Prisma, ejecuta una sola vez:

```bash
npm run prisma:baseline-existing
```

Para poblar usuarios y datos base:

```bash
npm run seed
```

Servicios:

- API: `http://localhost:4007`
- Swagger: `http://localhost:4007/api/docs`
- Health: `http://localhost:4007/health`

## Multi asociacion

El aislamiento del SaaS se realiza por `association_id`.

- El login y registro reciben `associationSlug`.
- El JWT incluye el `associationId` del usuario.
- Todos los modelos de dominio incluyen `association_id`.
- Las consultas de dominio filtran por `association_id`.
- Cada asociacion tiene ciudad, zonas, tarifas, motociclistas, usuarios y reportes propios.

## Endpoints principales

Autenticacion:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `GET /api/v1/auth/me`

Perfil y usuarios:

- `GET /api/v1/users/me`
- `GET /api/v1/users`
- `POST /api/v1/users`

Motociclistas:

- `PATCH /api/v1/drivers/me/location`
- `GET /api/v1/drivers/available`

Tarifas:

- `GET /api/v1/fares/current`
- `PUT /api/v1/fares/current`
- `POST /api/v1/fares/estimate`

Viajes:

- `POST /api/v1/trips/request`
- `GET /api/v1/trips/open`
- `POST /api/v1/trips/:tripId/accept`
- `POST /api/v1/trips/:tripId/reject`
- `POST /api/v1/trips/:tripId/start`
- `POST /api/v1/trips/:tripId/finish`
- `POST /api/v1/trips/:tripId/cancel`
- `GET /api/v1/trips/:tripId/status`
- `GET /api/v1/trips/history`

Otros modulos:

- `GET /api/v1/associations/current`
- `POST /api/v1/associations`
- `GET /api/v1/vehicles/me`
- `PUT /api/v1/vehicles/me`
- `GET /api/v1/zones`
- `POST /api/v1/zones`
- `POST /api/v1/ratings`
- `GET /api/v1/reports/summary`

## Tarifas por asociacion

Cada asociacion puede configurar:

- Tarifa base
- Tarifa minima
- Tarifa por kilometro
- Tarifa nocturna
- Tarifa por espera
- Comision de asociacion
- Comision de plataforma

El calculo MVP usa distancia Haversine entre coordenadas. Para produccion se recomienda integrar calculo vial real con proveedor de mapas.

## Polling movil

La app movil debe consultar:

```http
GET /api/v1/trips/:tripId/status
```

Frecuencia sugerida MVP: 3 a 5 segundos.

## PostGIS

El MVP queda preparado a nivel de modelo para zonas con `center_latitude`, `center_longitude`, `radius_km` y `polygon Json`.

PostGIS se deja para una fase posterior para evitar complejidad operacional inicial. La migracion recomendada es:

- Habilitar extension `postgis`.
- Agregar columnas `geometry(Point, 4326)` para ubicaciones.
- Agregar columnas `geometry(Polygon, 4326)` para zonas.
- Crear indices `GIST`.
- Mover filtros de cercania desde Haversine en Node.js hacia consultas `ST_DWithin`.

## Deploy

Incluye preparacion para:

- Railway: `railway.json`
- Render: `render.yaml`
- VPS con PM2: `ecosystem.config.js`

Comandos VPS:

```bash
npm install
npm run build
npm run pm2:start
```
