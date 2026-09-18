import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password, empresa_id, departamento_id } = req.body;

  if (!email || !password || !empresa_id || !departamento_id) {
    res.status(400).json({ message: 'Selecciona empresa, departamento, correo y contraseña.' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.nombre_completo, u.email, u.password, u.rol_id, u.empresa_id, u.departamento_id,
              r.nombre AS rol, e.nombre AS empresa, d.nombre AS departamento
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       INNER JOIN empresas e ON u.empresa_id = e.id
       INNER JOIN departamentos d ON u.departamento_id = d.id AND d.empresa_id = u.empresa_id
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    const usuario = rows[0];

    if (usuario.empresa_id !== String(empresa_id) || Number(usuario.departamento_id) !== Number(departamento_id)) {
      res.status(401).json({ message: 'La empresa o el departamento no corresponden a esta cuenta.' });
      return;
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    // Consulta de los permisos del rol del usuario desde MySQL
    const [permisosRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.modulo, p.accion
       FROM rol_permisos rp
       INNER JOIN permisos p ON rp.permiso_id = p.id
       WHERE rp.rol_id = ?`,
      [usuario.rol_id]
    );

    // Mapeo de permisos al formato CASL (action / subject) de Vuexy
    const userAbilityRules = permisosRows.map((p) => ({
      action: p.accion,
      subject: p.modulo,
    }));

    const accessToken = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, rol_id: usuario.rol_id, empresa_id: usuario.empresa_id, departamento_id: usuario.departamento_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    const userData = {
      id: usuario.id,
      fullName: usuario.nombre_completo,
      username: usuario.email.split('@')[0],
      email: usuario.email,
      role: usuario.rol.toLowerCase(),
      empresaId: usuario.empresa_id,
      empresa: usuario.empresa,
      departamentoId: usuario.departamento_id,
      departamento: usuario.departamento,
      abilityRules: userAbilityRules,
    };

    res.json({
      accessToken,
      userData,
      userAbilityRules,
      token: accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const organizacionLogin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [empresas] = await pool.query<RowDataPacket[]>('SELECT id, nombre FROM empresas WHERE estado = 1 ORDER BY nombre');
    const [departamentos] = await pool.query<RowDataPacket[]>('SELECT id, empresa_id, nombre FROM departamentos WHERE estado = 1 ORDER BY empresa_id, nombre');
    res.json({ empresas, departamentos });
  } catch {
    res.status(500).json({ message: 'No se pudo cargar la organización.' });
  }
};
