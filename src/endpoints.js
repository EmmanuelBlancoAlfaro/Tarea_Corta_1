
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req,res) =>{
    res.status(200).json({
        status: "ok",
        message: "The process is alive"
    });
});

// Ruta de readiness (comprobación de disponibilidad)
app.get('/ready', async (req, res) => {
    try {
        // Intenta hacer una consulta simple a la base de datos
        await pool.query('SELECT 1');
        res.status(200).json({
            status: "ok",
            message: "Database connection is healthy"
        });
    } catch (error) {
        // Si la base no responde, devuelve 503 como pide el documento
        res.status(503).json({
            status: "error",
            message: "Database is not available",
            error: error.message
        });
    }
});
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
});
