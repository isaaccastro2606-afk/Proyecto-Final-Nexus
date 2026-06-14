const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARES
app.use(cors({
    origin: '*' 
}));
app.use(express.json());

// CONFIGURACIÓN DE POSTGRESQL (SUPABASE)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// FASE 1: OBTENER TODAS LAS UNIDADES (GET)
app.get('/api/buses', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM buses ORDER BY id ASC');
    res.status(200).json(resultado.rows);
  } catch (error) {
    console.error('❌ Error en GET /api/buses:', error.message);
    res.status(500).json({ error: 'Error al leer los datos de la base de datos' });
  }
});

// FASE 2: REGISTRAR UNIDAD (POST)
app.post('/api/buses', async (req, res) => {
  console.log("📥 REQ.BODY COMPLETO:", req.body);

  const { placa, linea, capacidad, hora_salida, num_boleto, estado_cliente, tlf_pasajero } = req.body;

  try {
    const query = `
      INSERT INTO buses (placa, linea, capacidad, hora_salida, num_boleto, estado_cliente, tlf_pasajero)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    const valores = [
      placa,
      linea,
      parseInt(capacidad) || 0,
      hora_salida || null,
      parseInt(num_boleto) || 0,
      estado_cliente || 'Regular',
      tlf_pasajero || null
    ];

    const resultado = await pool.query(query, valores);
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error('❌ Error en Supabase POST:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// FASE 3: ACTUALIZAR/EDITAR UNIDAD (PUT)
app.put('/api/buses/:id', async (req, res) => {
  const { id } = req.params;
  const { placa, linea, capacidad, hora_salida, num_boleto, estado_cliente, tlf_pasajero } = req.body;

  try {
    const query = `
      UPDATE buses 
      SET placa = $1, linea = $2, capacidad = $3, hora_salida = $4, num_boleto = $5, estado_cliente = $6, tlf_pasajero = $7
      WHERE id = $8
      RETURNING *;
    `;

    const valores = [
      placa,
      linea,
      parseInt(capacidad) || 0,
      hora_salida || null,
      parseInt(num_boleto) || 0,
      estado_cliente || 'Regular',
      tlf_pasajero || null,
      id
    ];

    const resultado = await pool.query(query, valores);

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró la unidad para editar' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('❌ Error en Supabase PUT:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// FASE 4: ELIMINAR UNIDAD (DELETE)
app.delete('/api/buses/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log(`🗑️ Petición recibida para eliminar el bus con ID: ${id}`);

  try {
    const query = 'DELETE FROM buses WHERE id = $1 RETURNING *;';
    const resultado = await pool.query(query, [id]);

    if (resultado.rowCount === 0) {
      console.log(`⚠️ No se encontró el ID ${id} en Supabase.`);
      return res.status(404).json({ error: 'No se encontró la unidad' });
    }

    console.log(`✅ Bus con ID ${id} eliminado con éxito de Supabase.`);
    res.json({ mensaje: 'Unidad eliminada correctamente', busEliminado: resultado.rows[0] });
  } catch (error) {
    console.error('❌ Error real en el DELETE de Supabase:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ENCENDER EL SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Nexus activo y escuchando de forma permanente en el puerto ${PORT}`);
});

// ESCUDO CONTRA CAÍDAS SILENCIOSAS
process.on('uncaughtException', (err) => {
  console.error('💥 Se detectó un error inesperado:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesa rechazada no manejada:', reason);
});

// ANCLA DE SEGURIDAD
setInterval(() => {
  // Mantiene el proceso despierto
}, 86400000);