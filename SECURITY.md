# Security Notes

## Implementado en el repo

- `vercel.json` define security headers para produccion:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`

- `supabase/security_hardening.sql` refuerza RLS y validaciones para:
  - publicaciones guardadas
  - likes de comentarios
  - notificaciones
  - respuestas de comentarios

## CORS

La app es frontend estatico y se conecta directamente a Supabase con la anon key. Por eso CORS no se controla desde React.

Para restringir origenes hay que configurar los dominios permitidos en Supabase y Vercel con los dominios reales de produccion.

Dominios que se deben permitir cuando existan:

- dominio de produccion en Vercel
- dominio preview si el equipo lo usa
- `http://localhost:5173` solo para desarrollo local

No se deben permitir comodines como `*` en produccion.

