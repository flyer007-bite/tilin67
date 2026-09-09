import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'El correo y la contraseña son obligatorios' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.nombre_completo, u.email, u.password, u.estado, u.rol_id, r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    const usuario = rows[0];

    if (!usuario.estado) {
      res.status(403).json({ message: 'El usuario se encuentra inactivo' });
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

    // Actualizar registro de último acceso
    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);

    const accessToken = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, rol_id: usuario.rol_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    const userData = {
      id: usuario.id,
      fullName: usuario.nombre_completo,
      username: usuario.email.split('@')[0],
      email: usuario.email,
      role: usuario.rol.toLowerCase(),
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
