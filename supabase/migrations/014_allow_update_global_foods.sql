-- ============================================================
-- NutriSnap — Migración: Políticas de Edición Global
-- Permite que usuarios autenticados actualicen alimentos
-- ============================================================

-- Añadir política de actualización para usuarios autenticados
create policy "Usuarios autenticados pueden modificar alimentos globales"
  on public.global_foods for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Opcional: También permitir DELETE si fuera necesario en el futuro (descomentar si se desea)
-- create policy "Usuarios autenticados pueden eliminar sus propios alimentos"
--   on public.global_foods for delete
--   using (auth.uid() = created_by);
