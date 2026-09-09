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


// Gets

// Ruta de health (comprobación de estado)
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
        // Si la base no responde, devuelve 503
        res.status(503).json({
            status: "error",
            message: "Database is not available",
            error: error.message
        });
    }
});

// POST

// Crear un nuevo usuario
app.post('/users', async (req, res) => {
    try {
        const { username, email } = req.body;

        // Validación 1: Campos vacíos
        if (!username || !email) {
            return res.status(400).json({ 
                error: "Faltan campos obligatorios (username, email)" 
            });
        }

        const query = 'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *';
        const values = [username, email];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ 
                error: "El username o el email ya están registrados" 
            });
        }
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
});
