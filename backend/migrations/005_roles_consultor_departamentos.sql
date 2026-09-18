-- Crea un rol Consultor por cada departamento existente.
-- Sus permisos se copian del rol global "Control".

INSERT INTO roles (nombre, descripcion, empresa_id, departamento_id, estado, creado_en, actualizado_en)
SELECT CONCAT(e.id, ' - ', d.nombre, ' - Consultor'),
       CONCAT('Consultor de ', d.nombre, ' en ', e.nombre),
       e.id, d.id, 1, NOW(), NOW()
FROM empresas e
JOIN departamentos d ON d.empresa_id = e.id
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), estado = 1;

INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT destino.id, origen_permisos.permiso_id
FROM roles destino
JOIN roles origen ON origen.nombre = 'Control'
JOIN rol_permisos origen_permisos ON origen_permisos.rol_id = origen.id
WHERE destino.empresa_id IS NOT NULL
  AND destino.nombre LIKE '% - Consultor';
