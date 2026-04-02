-- ============================================================
-- NutriSnap — Migración: Políticas de Edición (UPDATE)
-- Esto soluciona que los cambios de categoría no se guarden
-- ============================================================

-- 1. Permitir que usuarios registrados editen alimentos globales (para corregir categorías/macros)
CREATE POLICY "Usuarios autenticados pueden editar alimentos globales"
  ON public.global_foods FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Permitir que los usuarios editen sus propias comidas del diario
-- (Útil para corregir volumen, categoría o macros de lo que ya han comido)
CREATE POLICY "Usuarios pueden editar sus propias comidas"
  ON public.meals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Comentario para el SQL Editor
COMMENT ON POLICY "Usuarios autenticados pueden editar alimentos globales" ON public.global_foods IS 'Permite corregir información nutricional o categorías en la base de datos comunitaria.';
