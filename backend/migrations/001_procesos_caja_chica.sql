-- Migración no destructiva para el flujo Arqueo -> Cierre -> Liquidación.
-- Aplicar una sola vez sobre caja_chica_db después de revisar y respaldar la base.

CREATE TABLE IF NOT EXISTS procesos_detalles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('arqueo', 'cierre', 'liquidacion') NOT NULL,
  proceso_id INT NOT NULL,
  fondo_id INT NOT NULL,
  usuario_id INT NOT NULL,
  solicitud_id CHAR(36) NOT NULL,
  huella_movimientos CHAR(64) NOT NULL,
  datos_json JSON NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_procesos_detalles_solicitud (tipo, solicitud_id),
  UNIQUE KEY uq_procesos_detalles_proceso (tipo, proceso_id),
  KEY idx_procesos_detalles_fondo_fecha (fondo_id, creado_en),
  CONSTRAINT fk_procesos_detalles_fondo FOREIGN KEY (fondo_id) REFERENCES fondos_caja(id),
  CONSTRAINT fk_procesos_detalles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

ALTER TABLE arqueo_comprobantes
  ADD COLUMN categoria ENUM('factura', 'recibo', 'vale', 'liquidacion_tramite') NULL AFTER gasto_id,
  ADD COLUMN monto_verificado DECIMAL(10,2) NULL AFTER categoria;

ALTER TABLE arqueos
  ADD COLUMN solicitud_id CHAR(36) NULL AFTER usuario_id,
  ADD COLUMN huella_movimientos CHAR(64) NULL AFTER resultado,
  ADD COLUMN periodo VARCHAR(7) NULL AFTER fecha_arqueo,
  ADD UNIQUE KEY uq_arqueos_solicitud (solicitud_id),
  ADD KEY idx_arqueos_fondo_fecha (fondo_id, fecha_arqueo);

ALTER TABLE cierres
  ADD COLUMN arqueo_id INT NULL AFTER usuario_id,
  ADD COLUMN solicitud_id CHAR(36) NULL AFTER arqueo_id,
  ADD COLUMN huella_movimientos CHAR(64) NULL AFTER estado,
  ADD UNIQUE KEY uq_cierres_solicitud (solicitud_id),
  ADD KEY idx_cierres_fondo_fecha (fondo_id, fecha_cierre),
  ADD CONSTRAINT fk_cierres_arqueo FOREIGN KEY (arqueo_id) REFERENCES arqueos(id);

ALTER TABLE liquidaciones
  ADD COLUMN cierre_id INT NULL AFTER usuario_id,
  ADD COLUMN solicitud_id CHAR(36) NULL AFTER cierre_id,
  ADD COLUMN receptor_nombre VARCHAR(150) NULL AFTER solicitud_id,
  ADD COLUMN comprobante_entrega VARCHAR(100) NULL AFTER receptor_nombre,
  ADD COLUMN observaciones_finales TEXT NULL AFTER comprobante_entrega,
  ADD COLUMN huella_movimientos CHAR(64) NULL AFTER estado,
  ADD UNIQUE KEY uq_liquidaciones_solicitud (solicitud_id),
  ADD KEY idx_liquidaciones_fondo_fecha (fondo_id, fecha_liquidacion),
  ADD CONSTRAINT fk_liquidaciones_cierre FOREIGN KEY (cierre_id) REFERENCES cierres(id);
