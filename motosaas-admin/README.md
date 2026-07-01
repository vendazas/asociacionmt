# motosaas-admin

Panel administrativo web independiente para MotoSaaS.

## Stack

- React
- JavaScript
- Tailwind CSS
- React Router DOM
- React Query
- Axios
- React Hook Form
- Zod
- SweetAlert2

No usa Docker, Socket.IO, Firebase ni TypeScript.

## Instalacion

```bash
npm install
cp .env.example .env
npm run dev
```

Por defecto corre en:

```text
http://localhost:5173
```

## Variables

```text
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## Principios

- Consume unicamente la API REST del backend.
- No contiene logica de negocio.
- Maneja autenticacion, sesion y ruteo protegido.
- Usa Zod y React Hook Form para validar formularios.
- Usa SweetAlert2 para mensajes de error de UI.

## Funciones MVP implementadas

- Login contra `POST /auth/login`.
- Sidebar colapsable y header.
- Dashboard por rol.
- SUPER_ADMIN: asociaciones, creacion, activacion/suspension y metricas globales.
- ASSOCIATION_ADMIN: motociclistas, vehiculos, tarifas, zonas, viajes y reportes.
- Loaders de consulta.
- Tablas con busqueda y paginacion local.
- Formularios con React Hook Form + Zod.
- Confirmaciones y errores con SweetAlert2.

Toda operacion consume exclusivamente la API REST de `motosaas-backend`.
