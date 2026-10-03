# Intranet Caminos

Intranet del equipo de Caminos, construida según el *Manual técnico de implementación · Intranet corporativa*
y con el sistema de diseño de Caminos (coral `#F25061`, amarillo `#F5B75F`, fondo hueso, Poppins, logo oficial).

Es una **página estática** (HTML + CSS + JavaScript, sin compilación) que se publica en GitHub Pages, más un
**proyecto de Supabase** (Auth, Postgres con RLS, Storage y la Edge Function `crear-usuario`).

| Módulo | Qué hace |
| --- | --- |
| Inicio | Saludo, pase de jornada con reloj y 4 marcas, herramientas, últimos comunicados, mis solicitudes y mi semana |
| Malla | Turnos de lunes a sábado; las líderes editan su sede, copian la semana anterior y ajustan los turnos |
| Comunicados | Publicar con imágenes, confirmar lectura, seguimiento de quién falta, buscador sin tildes |
| Asistencia | ¿Quién está trabajando hoy?, con indicadores y estado por persona (líderes) |
| Informes | Panel mensual: puntualidad vs. meta, gráfica, ranking, detalle, tabla ordenable, exportación a Excel |
| Solicitudes | Vacaciones, permisos e incapacidades con soportes; revisores asignados por la gerencia (módulo opcional) |
| Equipo | Crear cuentas con contraseña temporal, restablecer, desactivar y reactivar (administración) |
| Guía de uso | Ayuda integrada que muestra a cada persona solo lo que aplica a su rol |

## Estructura

```
intranet/
├── index.html                    ← la intranet real (carga supabase-js, config y app)
├── assets/
│   ├── estilos.css               ← sistema de diseño de Caminos
│   ├── app.css                   ← piezas propias de la intranet
│   ├── config.js                 ← URL y llave PUBLICABLE de Supabase  (POR CONFIGURAR)
│   ├── app.js                    ← toda la aplicación
│   ├── logo-caminos.svg / .png   ← logo oficial (de original/caminos-documentos-2.5.3)
│   ├── icono-caminos.png         ← favicon: estrella blanca sobre coral
│   └── estrella-caminos.svg      ← estrella decorativa de la pantalla de acceso
├── supabase/
│   ├── migrations/001…004.sql    ← esquema, archivos, datos iniciales, ausencias
│   ├── instalar_todo.sql         ← las 4 migraciones en un archivo
│   ├── functions/crear-usuario/index.ts
│   └── pruebas/                  ← permisos en Postgres local (00, 01, 02 y correr.sh)
└── pruebas/
    ├── demo.html                 ← la intranet con Supabase simulado (sin proyecto real)
    ├── supabase-simulado.js
    └── probar-interfaz.js        ← prueba automática con Playwright + capturas
```

## Probarla ya, sin Supabase

Abre `pruebas/demo.html` en el navegador (doble clic). Todas las cuentas usan la contraseña **`clave1234`**:

| Cuenta | Perfil |
| --- | --- |
| `laura@caminos.simulado` | Gerencia + administración (primer ingreso: cambia contraseña y acepta datos) |
| `andrea@caminos.simulado` | Directora de operaciones (líder de sede) |
| `julian@caminos.simulado` | Colaborador, revisa y aprueba incapacidades (contabilidad) |
| `camilo@`, `valentina@`, `sofia@caminos.simulado` | Colaboradores |

Agrega `?sedes=2` a la dirección para simular una segunda sede. Los datos viven en memoria: al recargar vuelven al inicio.

## Pruebas

```bash
# 1. Permisos de la base (PostgreSQL 16 local, como usuario postgres)
bash supabase/pruebas/correr.sh            # → 79 correctas, 0 fallas

# 2. Interfaz completa con Playwright (escritorio 1300 px y celular 390 px)
node pruebas/probar-interfaz.js            # → 41 correctas, 0 fallas; capturas en pruebas/capturas/
```

## Puesta en marcha (manual §7 y §9)

1. **Supabase** (con la cuenta dueña de Caminos, que no se comparte): crear el proyecto `intranet-caminos` en una
   región de América, con *Enable Data API* activo, **sin** *Automatically expose new tables* y con RLS automático.
2. Revisar `supabase/migrations/003_datos_iniciales.sql` (sedes, áreas, turnos, herramientas, configuración) y ejecutar
   `supabase/instalar_todo.sql` en **SQL Editor**. Verificar: 15 tablas con RLS, 34 reglas en `public` y 6 en `storage`.
3. **Auth**: apagar *Allow new users to sign up*, contraseña mínima 8, *Site URL* = la dirección de GitHub Pages.
4. **Edge Function**: publicar `supabase/functions/crear-usuario/index.ts` con el nombre `crear-usuario` (Verify JWT activo).
5. **Primera administradora**: crear el usuario en *Authentication → Users* (Auto Confirm) y su perfil:
   ```sql
   insert into perfiles (id, nombre, correo, sede_id, area_id, rol, es_admin)
   select id, 'Nombre completo', email, 1, 1, 'gerente', true from auth.users where email = 'correo@agenciacaminos.com.co';
   ```
6. Copiar la **Project URL** y la **Publishable key** (nunca la secret/service_role) en `assets/config.js`.
7. **GitHub Pages**: publicar el contenido de esta carpeta en un repositorio público `intranet-caminos`
   (*Settings → Pages → Deploy from a branch → main / root*). Opcional: dominio propio `intranet.agenciacaminos.com.co`.
8. Probar con una cuenta de cada rol, borrar los datos de prueba y crear las cuentas desde **Equipo**.
9. Fase final (en sitio): IP fija de cada oficina en `sedes.ips_oficina` y `validar_ip = {"activo": true}`.

## Datos POR CONFIRMAR con Caminos

Están marcados con «POR CONFIRMAR» en el código:

- `assets/app.js` → objeto `EMPRESA`: razón social, NIT, lema, RNT; texto legal de tratamiento de datos.
- `003_datos_iniciales.sql` → sedes y zonas horarias, áreas, turnos reales, URL de las herramientas (AppSheet, generador de documentos…).
- Tolerancias (5 y 5 min), meta de puntualidad (95 %) y si se activan las solicitudes desde el inicio.
