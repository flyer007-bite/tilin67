-- Migración aditiva de referencia. La ejecución idempotente se realiza con:
-- npm run migrate
-- No ejecutar 003_simplificar_usuarios.sql: elimina campos de auditoría útiles.

-- El migrador TypeScript agrega, solo cuando faltan:
-- usuarios.empresa_id / usuarios.departamento_id
-- usuarios.dpi / telefono / estado / ultimo_acceso / creado_en / actualizado_en
-- roles.empresa_id / roles.departamento_id
-- fondos_caja.empresa_id / fondos_caja.departamento_id
-- gastos.persona_realizo_gasto_nombre
-- permisos RBAC independientes para tipos_comprobante
-- índices organizacionales y uq_movimientos_referencia cuando los datos lo permiten.

-- Antes de volver NOT NULL fondos_caja.empresa_id/departamento_id debe hacerse
-- un backfill explícito, revisado por el responsable de los datos históricos.
SELECT 'Ejecuta npm run migrate desde backend; revisa después los fondos sin organización.' AS instruccion;
