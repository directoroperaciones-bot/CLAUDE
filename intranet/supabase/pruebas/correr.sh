#!/usr/bin/env bash
# Prueba las migraciones y los permisos en un PostgreSQL local (como usuario postgres).
# Uso: bash supabase/pruebas/correr.sh   (desde la carpeta intranet/)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${DB:-intranet_prueba}
dropdb --if-exists "$DB" >/dev/null 2>&1 || true
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/pruebas/00_simular_supabase.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
echo "Tablas con RLS:"; psql -At -d "$DB" -c "select count(*) filter (where relrowsecurity) || ' de ' || count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'"
echo "Reglas:"; psql -At -d "$DB" -c "select schemaname || ': ' || count(*) from pg_policies group by schemaname order by schemaname"
SALIDA=$( (psql -d "$DB" -f supabase/pruebas/01_permisos.sql; psql -d "$DB" -f supabase/pruebas/02_aprobaciones.sql) 2>&1 )
echo "$SALIDA" | grep -E '^==|OK |FALLA|ERROR' | sed -E 's/^psql:[^ ]+ (NOTICE|WARNING): +//'
OKS=$(echo "$SALIDA" | grep -c 'OK     ·' || true)
FALLAS=$(echo "$SALIDA" | grep -c 'FALLA  ·\|ERROR' || true)
echo "Resultado: $OKS correctas, $FALLAS fallas"
[ "$FALLAS" -eq 0 ]
