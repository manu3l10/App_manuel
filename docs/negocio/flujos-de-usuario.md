# Flujos de usuario

Este documento describe los caminos principales que sigue una persona dentro de MTA para planear, guardar y administrar viajes. Su objetivo es dejar claro que hace el usuario, que responde la app y que datos se modifican en cada etapa.

## 1. Entrada, registro e inicio de sesion

1. El usuario abre la PWA.
2. Si no tiene sesion activa, ve la pantalla de bienvenida.
3. Puede registrarse o iniciar sesion con email y password.
4. Tambien puede autenticarse con Google OAuth.
5. Si la sesion queda activa, entra a la pantalla principal con el asistente IA.

Resultado:

- el usuario autenticado accede a la app completa
- el usuario sin sesion permanece en bienvenida
- la sesion se conserva segun la preferencia de recordar cuenta

Datos involucrados:

- Supabase Auth
- almacenamiento local/session storage de sesion

## 2. Planeacion desde el asistente IA

1. El usuario entra a la pantalla principal.
2. Escribe una solicitud de viaje en el chat.
3. El asistente propone destino, fechas, presupuesto y opciones.
4. El usuario puede aceptar vuelos sugeridos.
5. Al aceptar, se crea un viaje en `trips`.
6. Los detalles extendidos, como vuelos y hotel, se guardan por id de viaje.

Resultado:

- aparece un nuevo itinerario en `Mis itinerarios`
- el viaje impacta el calendario
- el asistente puede continuar el flujo ofreciendo hotel

Datos involucrados:

- tabla `trips`
- detalles extendidos del viaje en almacenamiento local
- ultimo viaje activo para cambios posteriores

## 3. Agregar o cambiar hotel

1. Despues de guardar un viaje, el asistente pregunta si el usuario quiere agendar hotel.
2. El usuario revisa opciones de hotel.
3. Puede expandir detalles y elegir una opcion.
4. La app asocia el hotel al viaje correspondiente.
5. Si el usuario ya tenia hotel, la nueva seleccion reemplaza la anterior.

Resultado:

- el itinerario muestra el hotel seleccionado
- el calendario marca los dias de estadia
- el usuario puede volver a pedir cambios desde `Mis itinerarios`

Datos involucrados:

- detalles extendidos del viaje
- fechas de check-in y check-out
- imagen, nombre, ubicacion y precio por noche del hotel

## 4. Consultar y administrar itinerarios

1. El usuario abre `Mis itinerarios`.
2. Ve sus viajes guardados en tarjetas.
3. Cada tarjeta muestra destino, fechas, presupuesto y detalles de vuelos u hotel.
4. Puede abrir el detalle completo del itinerario.
5. Puede editar el itinerario para cambiar vuelos u hotel.
6. Puede eliminar vuelos, hotel o el viaje completo.
7. Puede marcar el hotel como favorito.

Resultado:

- el viaje funciona como unidad central de organizacion
- los cambios se reflejan en calendario y favoritos
- el usuario puede volver al asistente con contexto del viaje

Datos involucrados:

- tabla `trips`
- detalles extendidos del viaje
- tabla `user_place_favorites`

## 5. Ver calendario

1. El usuario entra a `Mi Calendario`.
2. Ve el mes actual con dias resaltados.
3. Los vuelos y hoteles aparecen como senales visuales dentro del calendario.
4. El usuario toca un dia marcado.
5. La app muestra el detalle del vuelo o del hotel asociado a esa fecha.
6. Desde la lista de proximos viajes puede abrir detalles o eliminar un viaje.

Resultado:

- el usuario entiende rapidamente su agenda
- los vuelos y hoteles quedan vinculados a fechas concretas

Datos involucrados:

- tabla `trips`
- detalles extendidos del viaje
- reglas de rango para estadias de hotel

## 6. Comunidad

1. El usuario abre `Comunidad`.
2. La app carga el feed de publicaciones.
3. Puede crear una publicacion con lugar, descripcion e imagen.
4. Puede editar o eliminar sus propias publicaciones.
5. Puede dar like a publicaciones.
6. Puede comentar publicaciones.
7. Puede responder comentarios.
8. Puede guardar publicaciones para verlas luego en favoritos.

Resultado:

- la app genera contenido social alrededor de viajes
- las interacciones relevantes pueden crear notificaciones
- las publicaciones guardadas aparecen en `Favoritos`

Datos involucrados:

- `community_posts`
- `community_comments`
- `community_post_likes`
- `community_comment_likes`
- `community_saved_posts`
- `community_notifications`

## 7. Notificaciones

1. El usuario abre la campana desde la pantalla principal.
2. La app lista sus notificaciones de comunidad.
3. Si toca una notificacion, se marca como leida y navega a `Comunidad`.
4. El usuario puede ir a `Ajustes`.
5. En `Notificaciones`, puede activar o desactivar avisos sociales.
6. Si las apaga, la app deja de crear nuevas notificaciones cuando otra persona:
   - da like a una publicacion suya
   - comenta una publicacion suya
   - responde un comentario suyo
7. Si las vuelve a activar, esas interacciones vuelven a generar avisos.

Resultado:

- el usuario controla si quiere recibir avisos sociales
- el switch queda guardado por cuenta
- las notificaciones antiguas no se borran; solo se evita crear nuevas mientras esten apagadas

Datos involucrados:

- `community_notifications`
- `community_notification_settings`
- funcion `are_community_notifications_enabled`

## 8. Favoritos

### Hoteles y restaurantes

1. El usuario marca un hotel o restaurante como favorito.
2. La app crea o elimina el registro correspondiente.
3. La seccion `Favoritos` refleja el cambio.
4. Puede filtrar por hoteles, restaurantes o todos.

### Publicaciones guardadas

1. Desde comunidad, el usuario guarda una publicacion.
2. La app crea o elimina un registro en `community_saved_posts`.
3. La publicacion aparece en la pestaña de guardados dentro de `Favoritos`.

Resultado:

- el usuario puede reunir lugares y publicaciones importantes
- favoritos funciona como repositorio personal de consulta rapida

Datos involucrados:

- `user_place_favorites`
- `community_saved_posts`
- `community_posts`

## 9. Perfil

1. El usuario abre `Perfil`.
2. Puede actualizar nombre, biografia y avatar.
3. Si cambia el avatar, la imagen se sube al bucket de avatares.
4. La app sincroniza nombre y avatar con publicaciones y notificaciones de comunidad.
5. Puede cerrar sesion.

Resultado:

- la identidad del usuario se mantiene consistente en la app
- comunidad muestra datos actualizados del autor

Datos involucrados:

- Supabase Auth metadata
- bucket `avatars`
- funcion `sync_community_profile`
- tablas `community_posts`, `community_comments` y `community_notifications`

## 10. Ajustes

1. El usuario abre `Ajustes`.
2. Puede cambiar el idioma de la interfaz.
3. Puede activar o desactivar notificaciones sociales.
4. La preferencia queda asociada a su usuario.

Resultado:

- la experiencia se adapta a preferencias basicas del usuario
- las notificaciones respetan la decision del usuario incluso cuando otros usuarios interactuan con su contenido

Datos involucrados:

- contexto de idioma
- `community_notification_settings`

## Dependencias tecnicas por flujo

- Autenticacion: Supabase Auth
- Viajes: tabla `trips`
- Detalles extendidos: almacenamiento local por id de viaje
- Comunidad: tablas `community_*`
- Notificaciones: `community_notifications` y `community_notification_settings`
- Favoritos de lugares: `user_place_favorites`
- Avatares: Supabase Storage bucket `avatars`
- Sincronizacion de perfil en comunidad: RPC `sync_community_profile`

## Principios de experiencia

- Cada pantalla debe respetar los limites seguros del celular.
- El usuario siempre debe poder volver al inicio desde el header o menu.
- Las acciones sociales deben tener respuesta inmediata en UI.
- Las preferencias del usuario deben persistir por cuenta, no solo durante la sesion actual.
- Las acciones destructivas deben mantener el viaje, post o favorito en un estado coherente.
