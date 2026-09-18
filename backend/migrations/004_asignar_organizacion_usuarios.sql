-- Asignación inicial para que las cuentas existentes usen el acceso por empresa/departamento.
UPDATE usuarios u
JOIN departamentos d ON d.empresa_id = 'SOY502' AND d.nombre = 'Administración'
SET u.empresa_id = 'SOY502', u.departamento_id = d.id
WHERE u.email = 'admin@cajachica.com';

UPDATE usuarios u
JOIN departamentos d ON d.empresa_id = 'ND' AND d.nombre = 'Contabilidad'
SET u.empresa_id = 'ND', u.departamento_id = d.id
WHERE u.email = 'control@cajachica.com';

UPDATE usuarios u
JOIN departamentos d ON d.empresa_id = 'SOY502' AND d.nombre = 'Operaciones'
SET u.empresa_id = 'SOY502', u.departamento_id = d.id
WHERE u.email = 'user@cajachica.com';
