-- Intranet Caminos · 002_archivos
-- Buckets privados y reglas de archivos. La primera carpeta de cada ruta es el id del
-- comunicado o de la solicitud dueña, así el archivo hereda sus permisos (RLS).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('comunicados', 'comunicados', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('soportes', 'soportes', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

-- Comunicados: ve quien puede ver el comunicado; suben y borran el autor o la gerencia.
create policy "comunicados: ver" on storage.objects for select to authenticated using (
  bucket_id = 'comunicados'
  and exists (select 1 from public.comunicados c where c.id = public.carpeta_id(name))
);
create policy "comunicados: subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'comunicados'
  and exists (select 1 from public.comunicados c where c.id = public.carpeta_id(name)
              and (c.autor_id = auth.uid() or public.es_gerencia()))
);
create policy "comunicados: borrar" on storage.objects for delete to authenticated using (
  bucket_id = 'comunicados'
  and exists (select 1 from public.comunicados c where c.id = public.carpeta_id(name)
              and (c.autor_id = auth.uid() or public.es_gerencia()))
);

-- Soportes de solicitudes: ve quien puede ver la solicitud; sube la dueña mientras está pendiente.
create policy "soportes: ver" on storage.objects for select to authenticated using (
  bucket_id = 'soportes'
  and exists (select 1 from public.solicitudes s where s.id = public.carpeta_id(name))
);
create policy "soportes: subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'soportes'
  and exists (select 1 from public.solicitudes s where s.id = public.carpeta_id(name)
              and s.persona_id = auth.uid() and s.estado = 'pendiente')
);
