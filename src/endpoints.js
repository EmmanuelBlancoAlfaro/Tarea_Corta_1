require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const {createRemoteJWKSet, jwtVerify} = require('jose'); 
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

const ISSUER = `http://keycloak:8080/realms/user-realm`;
const JWKS = createRemoteJWKSet(
    new URL(`${ISSUER}/protocol/openid-connect/certs`)
);

async function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
        return res.status(401).json({ error: 'missing bearer token'});
    } 
    try {
        const {payload} = await jwtVerify(token, JWKS, {
            algorithms: ['RS256'],
            clockTolerance: '5s',
        });
        req.user = payload;
        next();
    } catch(error) {
        
        return res.status(401).json({error: 'invalid token', details: error.message});
        
    }
}

function requireRole(role) {
    return (req, res, next) => {
        const roles = req.user?.realm_access?.roles || [];
        if (!roles.includes(role)) {
            return res.status(403).json({ error: 'forbidden: insufficient role' });
        }
        next();
    };
}

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

// Ruta para obtener todos los usuarios
app.get('/users',  requireAuth, async (req, res) => {
    try { 
        const { created_at } = req.query; // EJ: /users?created_at=2026-09-09
        let query = 'SELECT * FROM users';
        let values = [];
        
        // Si envian un parametro de fecha, filtra los usuarios por esa fecha
        if (created_at) {
            // Creamos el rango para abarcar todo el día seleccionado
            const startDate = `${created_at} 00:00:00`;
            const endDate = `${created_at} 23:59:59`;

            query += ' WHERE created_at >= $1 AND created_at <= $2';
            values.push(startDate, endDate);
        }

        query += ' ORDER BY id ASC';

        const result = await pool.query(query, values);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/users/:id',  requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) {
            return res.status(400).json({ error: "El ID debe ser un número" });
        }
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST
// Crear un nuevo usuario
app.post('/users', requireAuth, requireRole('user-admin'), async (req, res) => {
    try {
        const { username, email } = req.body;

        // Validación 1: Campos vacíos
        if (!username || !email) {
            return res.status(400).json({ 
                error: "Faltan campos obligatorios (username, email)" 
            });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        // Validación 2: Formato de email
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: "Formato de email inválido" 
            });
        }
        
        // Validación 3: Longitud del username
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                error: "El username debe tener entre 3 y 20 caracteres" 
            });
        }

        // 4. Validar que el username no tenga números (/\d/ busca cualquier dígito)
        const tieneNumeros = /\d/.test(username);
        if (tieneNumeros) {
            return res.status(400).json({ error: "El username no puede contener números" });
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
        res.status(400).json({ error: error.message });
    }
});

// PUT
// Actualizar un usuario existente
app.put('/users/:id', requireAuth, requireRole('user-admin'), async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) {
            return res.status(400).json({ error: "El ID debe ser un número" });
        }
        const { username, email } = req.body;

        // Validación 1: Campos vacíos
        if (!username || !email) {
            return res.status(400).json({ 
                error: "Faltan campos obligatorios (username, email)" 
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validación 2: Formato de email
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: "Formato de email inválido" 
            });
        }

        // Validación 3: Longitud del username
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                error: "El username debe tener entre 3 y 20 caracteres" 
            });
        }

        // 4. Validar que el username no tenga números (/\d/ busca cualquier dígito)
        const tieneNumeros = /\d/.test(username);
        if (tieneNumeros) {
            return res.status(400).json({ error: "El username no puede contener números" });
        }

        // Construimos la consulta dinámica de actualización de forma segura, por si se desea unicamente cambiar el username o el email, sin afectar el otro campo.
        let fields = [];
        let values = [];
        let index = 1;

        if (username) {
            fields.push(`username = $${index++}`);
            values.push(username);
        }
        if (email) {
            fields.push(`email = $${index++}`);
            values.push(email);
        }

        values.push(id);

        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: "El username o el email ya están registrados"
            });
        }
        res.status(400).json({ error: error.message });
    }
});

// DELETE
// Eliminar un usuario existente
app.delete('/users/:id', requireAuth, requireRole('user-admin'), async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) {
            return res.status(400).json({ error: "El ID debe ser un número" });
        }
        const query = 'DELETE FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app
