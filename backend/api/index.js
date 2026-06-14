const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
// Configuración dinámica del puerto para evitar choques en local o la nube
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
    console.error('❌ Error detallado en GET /api/buses:', error);
    res.status(500).json({ error: 'Error al leer los datos de la base de datos' });
  }
});

// FASE 2: REGISTRAR UNIDAD (POST)
app.post('/api/buses', async (req, res) => {
  console.log("📥 REQ.BODY COMPLETO RECIBIDO:", req.body);

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
      tlf_pasajero ? String(tlf_pasajero).trim() : null // Asegura formato string limpio
    ];

    const resultado = await pool.query(query, valores);
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    // CORRECCIÓN: Ahora imprime el error completo con código y detalle de Postgres
    console.error('❌ DETALLE REAL DEL ERROR EN POST:', error);
    res.status(400).json({ 
      error: error.message, 
      detail: error.detail || 'Violación de restricciones de base de datos' 
    });
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
      tlf_pasajero ? String(tlf_pasajero).trim() : null,
      id
    ];

    const resultado = await pool.query(query, valores);

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró la unidad para editar' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('❌ DETALLE REAL DEL ERROR EN PUT:', error);
    res.status(400).json({ 
      error: error.message, 
      detail: error.detail || 'Error al actualizar registro' 
    });
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
      console.log(`⚠️ No se encontró el ID ${id} en la base de datos.`);
      return res.status(404).json({ error: 'No se encontró la unidad' });
    }

    console.log(`✅ Bus con ID ${id} eliminado con éxito.`);
    res.json({ mensaje: 'Unidad eliminada correctamente', busEliminado: resultado.rows[0] });
  } catch (error) {
    console.error('❌ Error real en el DELETE:', error);
    res.status(500).json({ error: error.message });
  }
});

// ENCENDER EL SERVIDOR
// BORRA EL app.listen() Y REEMPLÁZALO SOLO CON ESTA LÍNEA:
module.exports = app;

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