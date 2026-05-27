# My Travel Assistance (MTA)

PWA de asistencia de viajes construida con React, Vite y Supabase. La app combina autenticacion, planificacion de itinerarios, calendario, favoritos y una comunidad social para viajeros.

## Modulos principales

- Asistente de viajes con propuestas de destinos, vuelos y hoteles.
- Gestion de itinerarios guardados y vista de calendario.
- Favoritos de hoteles, restaurantes y publicaciones.
- Comunidad con posts, comentarios, likes, guardados y notificaciones.
- Perfil, ajustes e inicio de sesion con email/password y Google OAuth.

## Stack principal

- Frontend: Vite 6, React 18, React Router 7 y TypeScript.
- UI: Tailwind CSS 4, Motion, Radix UI, Lucide React y componentes reutilizables.
- Backend BaaS: Supabase Auth, Database y Storage.
- PWA: `manifest.webmanifest`, iconos y modo `standalone`.
- Despliegue: Vercel con headers de seguridad en `vercel.json`.

## Dominio oficial

- Produccion: `https://appmta.vercel.app`
- Proyecto Vercel: `appmta`
- Supabase Auth debe tener como `Site URL` `https://appmta.vercel.app`.
- Redirect URLs permitidas: `https://appmta.vercel.app`, `https://appmta.vercel.app/` y `http://localhost:5173` solo para desarrollo local.

No uses dominios anteriores para nuevos cambios o pruebas de produccion.

## Documentacion

- [docs/README.md](docs/README.md)
- [docs/base-datos/README.md](docs/base-datos/README.md)
- [docs/base-datos/esquema-bd.md](docs/base-datos/esquema-bd.md)
- [docs/base-datos/migraciones.md](docs/base-datos/migraciones.md)
- [docs/negocio/modelo-de-negocio.md](docs/negocio/modelo-de-negocio.md)
- [docs/negocio/flujos-de-usuario.md](docs/negocio/flujos-de-usuario.md)
- [docs/branding/moodboard.md](docs/branding/moodboard.md)
- [docs/arquitectura/stack.md](docs/arquitectura/stack.md)
- [SETUP_GOOGLE_AUTH.md](SETUP_GOOGLE_AUTH.md)
- [SECURITY.md](SECURITY.md)

## Estructura del proyecto

```text
.
|-- docs/
|-- public/
|   `-- icons/
|-- src/
|   |-- app/
|   |   |-- components/
|   |   `-- pages/
|   |-- contexts/
|   |-- lib/
|   `-- styles/
|-- supabase/
|-- index.html
|-- package.json
|-- SETUP_GOOGLE_AUTH.md
`-- vercel.json
```

## Configuracion local

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

3. Inicia el servidor de desarrollo:

```bash
npm run dev
```

## Variables de entorno

La app puede leer estas variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`

Si no estan definidas, el cliente conserva el proyecto de Supabase actualmente configurado en el codigo para no romper el entorno existente del equipo.

## Base de datos y backend

El repositorio incluye scripts SQL para:

- comunidad base
- respuestas, guardados, likes de comentarios y notificaciones
- endurecimiento de seguridad y RLS
- favoritos de lugares
- bucket de avatares

Nota: la tabla `trips` se usa desde el frontend, pero su migracion no esta versionada en `supabase/`. Ese estado ya quedo documentado en `docs/base-datos/`.

## Seguridad

- `vercel.json` define CSP, HSTS y otros headers.
- `supabase/security_hardening.sql` refuerza las politicas RLS.
- `.env` queda ignorado en git y se incluye `.env.example` como referencia.
