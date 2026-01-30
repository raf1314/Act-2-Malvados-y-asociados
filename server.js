import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const SECRET_KEY = "tu_clave_secreta_super_segura";

// 1. DEFINICIÓN DE RUTAS DE ARCHIVOS (Siempre al principio)
const DATA_FILE = path.join(__dirname, 'data/tasks.json');
const USERS_FILE = path.join(__dirname, 'data/users.json');

// 2. MIDDLEWARES GLOBALES
app.use(express.json());
app.use(express.static(__dirname));

// 3. MIDDLEWARE DE AUTENTICACIÓN
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Acceso denegado" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido o expirado" });
        req.user = user;
        next();
    });
};

// 4. RUTAS DE NAVEGACIÓN (HTML)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/calendario", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// 5. RUTAS DE API: USUARIOS (Registro y Login)

// Registro
app.post('/api/users', async (req, res) => {
    try {
        const { username, password } = req.body;
        let users = [];
        
        try {
            const data = await fs.readFile(USERS_FILE, 'utf8');
            users = JSON.parse(data || '[]');
        } catch (e) { users = []; }

        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        users.push({ username, password: hashedPassword });
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data || '[]');
        const user = users.find(u => u.username === username);

        if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Contraseña incorrecta" });

        const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ success: true, token, username: user.username });
    } catch (e) {
        res.status(500).json({ error: "Error en el inicio de sesión" });
    }
});

// 6. RUTAS DE API: TAREAS (Protegidas)

app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data || '[]'));
    } catch (error) { 
        res.json([]); 
    }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        // req.body debe ser el array completo de tareas enviado desde el front
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: 'Error al guardar tareas' }); 
    }
});

// Inicialización
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});