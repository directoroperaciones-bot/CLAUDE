-- Intranet Caminos · 004_ausencias_y_soportes
-- Ausencias aprobadas para asistencia, informes e inicio, y borrado de soportes al cancelar.

-- Devuelve solo lo necesario para justificar días (nunca motivo ni soportes), de la propia
-- persona o de las personas que quien consulta lidera. Solo solicitudes de día completo.
create function ausencias_aprobadas(p_desde date, p_hasta date)
returns table (persona_id uuid, tipo solicitud_tipo_t, desde date, hasta date, revisado_por uuid)
language sql stable security definer set search_path = public as $$
  select s.persona_id, s.tipo, s.desde, s.hasta, s.revisado_por
  from solicitudes s
  where s.estado = 'aprobada' and s.hora_desde is null
    and s.desde <= p_hasta and s.hasta >= p_desde
    and (s.persona_id = auth.uid() or lidera_sede(sede_de(s.persona_id)))
$$;

revoke all on function ausencias_aprobadas(date, date) from public, anon;
grant execute on function ausencias_aprobadas(date, date) to authenticated;

-- La dueña borra sus soportes mientras la solicitud está pendiente (al cancelarla o quitarlos).
create policy soladj_borrar on solicitud_adjuntos for delete to authenticated using (
  exists (select 1 from solicitudes s where s.id = solicitud_id and s.persona_id = auth.uid() and s.estado = 'pendiente')
);

create policy "soportes: borrar" on storage.objects for delete to authenticated using (
  bucket_id = 'soportes'
  and exists (select 1 from public.solicitudes s where s.id = public.carpeta_id(name)
              and s.persona_id = auth.uid() and s.estado = 'pendiente')
);
