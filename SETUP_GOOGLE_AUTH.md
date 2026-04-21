# Configuración de Google OAuth en Supabase

## Pasos para habilitar Google Sign-In

### 1. Crear un proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombre sugerido: "My Travel Assistance"

### 2. Habilitar la API de Google+

1. En el panel izquierdo, ve a **APIs & Services** > **Library**
2. Busca "Google+ API"
3. Haz clic en el resultado y presiona **Enable**

### 3. Crear credenciales OAuth 2.0

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth 2.0 Client ID**
3. Si es la primera vez, puede pedir que configures la pantalla de consentimiento (Authorization screen):
   - Selecciona **External** como User Type
   - Completa los datos básicos (nombre de la app, email, etc.)
4. Para el tipo de aplicación, selecciona **Web Application**
5. Nombre: `MTA Frontend` o similar
6. Añade los **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   https://tudominio.com
   ```
   (Usa tu dominio real de producción)

7. Añade los **Authorized redirect URIs**:
   ```
   https://wxrxagmxrmpfdltrclld.supabase.co/auth/v1/callback
   ```
   (Reemplaza el subdomain con el tuyo de Supabase si es diferente)

8. Copia el **Client ID** (lo necesitarás)
9. Descarga el archivo JSON como referencia

### 4. Configurar Google OAuth en Supabase

1. Ve a tu dashboard de Supabase
2. Selecciona tu proyecto
3. Ve a **Authentication** > **Providers**
4. Busca y habilita **Google**
5. Pega el **Client ID** que copiaste de Google Cloud Console
6. El **Client Secret** también está disponible en Google Cloud Console si lo necesitas

### 5. Autorizar dominios en Supabase (IMPORTANTE para producción)

1. En **Authentication** > **URL Configuration**
2. Agrega bajo **Authorized redirect URLs**:
   - `http://localhost:5173` (desarrollo local)
   - `http://localhost:3000` (si usas otro puerto)
   - `https://tudominio.com` (producción)

3. Agrega bajo **Site URL**:
   - Para desarrollo: `http://localhost:5173`
   - Para producción: `https://tudominio.com`

### 6. Probar el login

1. Inicia tu app con `npm run dev`
2. En la pantalla de bienvenida, deberías ver el botón de Google
3. Haz clic en "Google" y sigue el flujo de autenticación

## Notas importantes

- **Variables de entorno**: Supabase maneja automáticamente el Client ID y Secret, no necesitas agregarlos a tu `.env`
- **Desarrollo local**: Google OAuth funciona con `localhost:5173` pero debe estar configurado en Google Cloud Console
- **Seguridad**: Nunca expongas el Client Secret en el cliente (frontend). Supabase maneja esto en el backend
- **Email desde Google**: Cuando un usuario se autentica con Google, Supabase automáticamente crea un usuario con su email y información del perfil
- **Android y WebView**: Google puede bloquear el login si la app se abre dentro de un navegador embebido (por ejemplo desde redes sociales, mensajeria o un WebView nativo). En Android, prueba siempre tambien abriendo la URL directamente en Chrome.

## Troubleshooting

### "redirect_uri_mismatch" error
- Verifica que la URL en `Authorized redirect URIs` en Google Cloud Console coincida exactamente con la de Supabase
- Incluye el protocolo (`https://` o `http://`)

### El botón de Google no funciona
- Asegúrate que Google+ API esté habilitada en Google Cloud Console
- Verifica que el Client ID sea correcto en Supabase
- Verifica que el dominio de la app exista en **Authorized JavaScript origins**
- Si falla solo en Android, abre la app directamente en Chrome y evita navegadores embebidos

### Usuario se crea pero no inicia sesión
- Puede ser que la pantalla de consentimiento no esté configurada correctamente
- Revisa los logs en Supabase Dashboard > Authentication > Logs

## Referencias

- [Documentación Supabase - Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
