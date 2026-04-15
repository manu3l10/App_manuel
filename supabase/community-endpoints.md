# Community Endpoints (Supabase)

El frontend usa `src/lib/communityApi.ts` para operar sobre `public.community_posts`.

## Operaciones

1. Listar publicaciones
- Método lógico: `listCommunityPosts()`
- Supabase: `select * from community_posts order by created_at desc`
- Acceso: usuarios autenticados

2. Crear publicación
- Método lógico: `createCommunityPost({ location, caption, imageUrl })`
- Supabase: `insert into community_posts (...)`
- Acceso: usuario autenticado, `user_id = auth.uid()`

3. Editar publicación
- Método lógico: `updateCommunityPost(postId, { location, caption, imageUrl })`
- Supabase: `update community_posts set ... where id = postId`
- Acceso: solo autor

4. Eliminar publicación
- Método lógico: `deleteCommunityPost(postId)`
- Supabase: `delete from community_posts where id = postId`
- Acceso: solo autor

## Primer despliegue backend

1. Ejecutar SQL en Supabase SQL Editor:
- `supabase/community_posts.sql`

2. Validar en app:
- Iniciar sesión con dos cuentas distintas.
- Crear publicación con cuenta A.
- Verificar que cuenta B la vea en `/community`.
