// Intranet Caminos · Edge Function «crear-usuario»
// Crea, restablece, desactiva y reactiva cuentas. Solo la administración (es_admin).
// La llave de servicio vive en las variables de entorno de Supabase; nunca en la página.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } });

const ROLES = ['colaborador', 'directora', 'gerente'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) return responder({ error: 'Inicia sesión para continuar.' }, 401);

  // 1. ¿Quien llama es administración? Se pregunta a la base como esa persona.
  const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: esAdmin, error: errAdmin } = await comoUsuario.rpc('es_admin');
  if (errAdmin) return responder({ error: 'No se pudo verificar tu sesión.' }, 401);
  if (!esAdmin) return responder({ error: 'Solo la administración puede gestionar cuentas.' }, 403);

  // 2. Acción con la llave de servicio.
  const admin = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } });
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return responder({ error: 'La petición no es válida.' }, 400);
  }

  const claveValida = (c: unknown) => typeof c === 'string' && c.length >= 8;

  try {
    switch (b.accion) {
      case 'crear': {
        const correo = String(b.correo ?? '').trim().toLowerCase();
        const nombre = String(b.nombre ?? '').trim();
        const rol = String(b.rol ?? 'colaborador');
        if (!correo || !nombre || !b.sede_id) return responder({ error: 'Faltan el nombre, el correo o la sede.' }, 400);
        if (!ROLES.includes(rol)) return responder({ error: 'Rol no válido.' }, 400);
        if (!claveValida(b.contrasena)) return responder({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);

        const { data, error } = await admin.auth.admin.createUser({
          email: correo,
          password: b.contrasena as string,
          email_confirm: true,
          user_metadata: { debe_cambiar_contrasena: true, nombre },
        });
        if (error) {
          const dup = /already|registered|exists/i.test(error.message);
          return responder({ error: dup ? 'Ya existe una cuenta con ese correo.' : error.message }, 400);
        }
        const { error: errPerfil } = await admin.from('perfiles').insert({
          id: data.user.id, nombre, correo, rol,
          sede_id: Number(b.sede_id), area_id: b.area_id ? Number(b.area_id) : null,
        });
        if (errPerfil) {
          await admin.auth.admin.deleteUser(data.user.id); // no dejar cuentas a medias
          return responder({ error: 'No se pudo crear el perfil: ' + errPerfil.message }, 400);
        }
        return responder({ ok: true, id: data.user.id });
      }
      case 'restablecer': {
        if (!claveValida(b.contrasena)) return responder({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
        const { error } = await admin.auth.admin.updateUserById(String(b.id), {
          password: b.contrasena as string,
          user_metadata: { debe_cambiar_contrasena: true },
        });
        if (error) return responder({ error: error.message }, 400);
        return responder({ ok: true });
      }
      case 'desactivar':
      case 'reactivar': {
        const activar = b.accion === 'reactivar';
        const { error } = await admin.auth.admin.updateUserById(String(b.id), { ban_duration: activar ? 'none' : '876000h' });
        if (error) return responder({ error: error.message }, 400);
        const { error: e2 } = await admin.from('perfiles').update({ activo: activar }).eq('id', String(b.id));
        if (e2) return responder({ error: e2.message }, 400);
        return responder({ ok: true });
      }
      default:
        return responder({ error: 'Acción desconocida.' }, 400);
    }
  } catch (e) {
    return responder({ error: (e as Error).message ?? 'Error inesperado.' }, 500);
  }
});
