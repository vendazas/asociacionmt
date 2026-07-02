# motosaas-mobile

Aplicacion movil independiente para MotoSaaS construida con React Native CLI.

## Stack

- React Native CLI
- JavaScript
- React Native Maps
- Axios
- React Query

No usa Socket.IO, Firebase, Expo, TypeScript ni Docker.

## Roles de app implementados

- `CUSTOMER`: login, ubicacion/destino, tarifa estimada, solicitud de viaje, polling de estado, conductor asignado e historial.
- `DRIVER`: disponibilidad, ubicacion manual/automatica por intervalo, solicitudes por polling, aceptar/rechazar, iniciar/finalizar, ganancias e historial.
- `ASSOCIATION_ADMIN`: conductores activos, viajes del dia e ingresos del dia.

## Instalacion

```bash
nvm use 20
npm install
cp .env.example .env
npm run start
npm run android
```

Para iOS:

```bash
nvm use 20
BUNDLE_PATH=vendor/bundle bundle install
npm run pods
npm run ios
```

El proyecto iOS debe abrirse desde `ios/MotoSaaSMobile.xcworkspace` si se usa Xcode directamente. No ejecutes `pod install` desde una carpeta sin `Podfile`; desde la raiz usa `npm run pods`.

## API REST

La app consume solo la API REST del backend con Axios.

URLs locales usadas en desarrollo:

```text
iOS Simulator: http://127.0.0.1:4007/api/v1
Android Emulator: http://10.0.2.2:4007/api/v1
```

Cuando cambie configuracion nativa como `Info.plist`, recompila la app iOS con `npm run ios`.

En desarrollo, la app intenta iniciar automaticamente con el usuario seed de prueba:

```text
platform / mobile@motosaas.local / ChangeMe123!
```

Si el backend no esta levantado o falta correr `npm run seed` en `motosaas-backend`, se muestra el login normal con esas credenciales precargadas.

Archivo principal:

```text
src/api/client.js
```

Endpoints iniciales:

```text
POST /auth/login
GET /auth/me
PATCH /drivers/me/location
GET /drivers/available
POST /fares/estimate
POST /trips/request
GET /trips/:tripId/status
GET /trips/history
```

## Polling temporal

La actualizacion de ubicacion y estado de viajes se hara por polling contra el backend mientras no exista infraestructura realtime.

Base incluida:

```text
src/services/polling.service.js
```

Frecuencia inicial sugerida:

```text
5000 ms
```

Endpoints REST usados:

```text
GET /trips/open
POST /trips/:tripId/accept
POST /trips/:tripId/reject
POST /trips/:tripId/start
POST /trips/:tripId/finish
GET /reports/driver-earnings
GET /reports/today
```
