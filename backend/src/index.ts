import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de verificación
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'API Caja Chica funcionando correctamente' });
});

// Rutas de la API
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
