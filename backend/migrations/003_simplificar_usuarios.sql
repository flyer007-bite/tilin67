-- Simplificación solicitada para la tabla usuarios.
-- El respaldo caja_chica_db_2026-09-18.sql contiene las columnas anteriores.
ALTER TABLE usuarios
  DROP COLUMN dpi,
  DROP COLUMN telefono,
  DROP COLUMN estado,
  DROP COLUMN ultimo_acceso,
  DROP COLUMN creado_en,
  DROP COLUMN actualizado_en;
