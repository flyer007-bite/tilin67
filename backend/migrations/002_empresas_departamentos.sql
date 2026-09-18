-- Organización multiempresa para Caja Chica.
-- Se ejecuta una sola vez sobre la base existente.

CREATE TABLE IF NOT EXISTS empresas (
  id VARCHAR(20) NOT NULL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  estado TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id VARCHAR(20) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  estado TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_departamento_empresa_nombre (empresa_id, nombre),
  CONSTRAINT fk_departamento_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id)
) ENGINE=InnoDB;

ALTER TABLE roles MODIFY nombre VARCHAR(255) NOT NULL;
ALTER TABLE roles ADD COLUMN empresa_id VARCHAR(20) NULL AFTER descripcion;
ALTER TABLE roles ADD COLUMN departamento_id INT NULL AFTER empresa_id;
ALTER TABLE roles ADD KEY idx_roles_organizacion (empresa_id, departamento_id);
ALTER TABLE roles ADD CONSTRAINT fk_roles_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE roles ADD CONSTRAINT fk_roles_departamento FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE;

ALTER TABLE usuarios ADD COLUMN empresa_id VARCHAR(20) NULL AFTER rol_id;
ALTER TABLE usuarios ADD COLUMN departamento_id INT NULL AFTER empresa_id;
ALTER TABLE usuarios ADD KEY idx_usuarios_organizacion (empresa_id, departamento_id);
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_departamento FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL;

INSERT INTO empresas (id, nombre) VALUES
  ('SOY502', 'SOY502'),
  ('ND', 'ND')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), estado = 1;

INSERT INTO departamentos (empresa_id, nombre)
SELECT e.id, d.nombre
FROM empresas e
CROSS JOIN (
  SELECT 'Administración' AS nombre UNION ALL SELECT 'Contabilidad' UNION ALL
  SELECT 'Operaciones' UNION ALL SELECT 'Sistemas' UNION ALL SELECT 'Recursos Humanos'
) d
WHERE e.id IN ('SOY502', 'ND')
ON DUPLICATE KEY UPDATE estado = 1;

INSERT INTO roles (nombre, descripcion, empresa_id, departamento_id, estado, creado_en, actualizado_en)
SELECT CONCAT(e.id, ' - ', d.nombre, ' - Administrador'),
       CONCAT('Administrador de ', d.nombre, ' en ', e.nombre), e.id, d.id, 1, NOW(), NOW()
FROM empresas e JOIN departamentos d ON d.empresa_id = e.id
WHERE e.id IN ('SOY502', 'ND')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), estado = 1;

INSERT INTO roles (nombre, descripcion, empresa_id, departamento_id, estado, creado_en, actualizado_en)
SELECT CONCAT(e.id, ' - ', d.nombre, ' - Usuario'),
       CONCAT('Usuario de ', d.nombre, ' en ', e.nombre), e.id, d.id, 1, NOW(), NOW()
FROM empresas e JOIN departamentos d ON d.empresa_id = e.id
WHERE e.id IN ('SOY502', 'ND')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), estado = 1;

-- Los administradores por departamento heredan los permisos del administrador global.
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT destino.id, rp.permiso_id
FROM roles destino
JOIN roles origen ON origen.nombre = 'Administrador'
JOIN rol_permisos rp ON rp.rol_id = origen.id
WHERE destino.empresa_id IS NOT NULL AND destino.nombre LIKE '% - Administrador';

-- Los usuarios por departamento heredan los permisos del operador actual.
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT destino.id, rp.permiso_id
FROM roles destino
JOIN roles origen ON origen.nombre = 'Operador Caja Chica'
JOIN rol_permisos rp ON rp.rol_id = origen.id
WHERE destino.empresa_id IS NOT NULL AND destino.nombre LIKE '% - Usuario';
