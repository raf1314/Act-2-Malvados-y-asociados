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

const DATA_FILE = path.join(__dirname, 'data/tasks.json');
const USERS_FILE = path.join(__dirname, 'data/users.json');

// --- MIDDLEWARES GLOBALES ---
app.use(express.json());
app.use(express.static(__dirname));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - Status: ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// --- MIDDLEWARE DE AUTENTICACIÓN ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token){
        console.log("Intento de acceso sin token");
        return res.status(401).json({ error: "Acceso denegado" });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log("Token inválido o expirado");
            return res.status(403).json({ error: "Token inválido o expirado" });
        }
        req.user = user; 
        next();
    });
};

// --- RUTAS DE NAVEGACIÓN ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "home.html")));
app.get("/calendario", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// --- API: USUARIOS ---

app.post('/api/users', async (req, res) => {
    try {
        const { username, password } = req.body;
        let users = [];
        try {
            const data = await fs.readFile(USERS_FILE, 'utf8');
            console.log(`Nuevo usuario registrado: ${username}`);
            users = JSON.parse(data || '[]');
        } catch (e) { users = []; }

        if (users.find(u => u.username === username)) {
            console.error("Error en registro:", error);
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({ username, password: hashedPassword });
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        console.log(`Login exitoso: ${username}`);
        const users = JSON.parse(data || '[]');
        const user = users.find(u => u.username === username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.error("Error en login:", error);
            return res.status(400).json({ error: "Credenciales inválidas" });
        }

        const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ success: true, token, username: user.username });
    } catch (e) {
        res.status(500).json({ error: "Error en el login" });
    }
});

// --- API: TAREAS (CRUD REST Completo) ---

// 1. OBTENER TODAS LAS TAREAS
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        console.log(`Enviando ${tasks.length} tareas a ${req.user.username}`);
        res.json(JSON.parse(data || '[]'));
    } catch (error) { res.json([]); }
});

// 2. CREAR TAREA (POST)
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const tasks = JSON.parse(data || '[]');
        // Agregamos la nueva tarea (el front debe enviarla en el body)
        tasks.push(req.body); 
        await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2));
        console.log(`Tarea creada por ${req.user.username}`);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Error al crear' }); }
});

// 3. ACTUALIZAR TAREA (PUT)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        console.log(`Editando tarea ${req.params.id} (Usuario: ${req.user.username})`);
        const { id } = req.params;
        const data = await fs.readFile(DATA_FILE, 'utf8');
        let tasks = JSON.parse(data || '[]');
        
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return res.status(404).json({ error: "No encontrada" });

        // SEGURIDAD: Solo el dueño puede editar
        if (tasks[index].owner !== req.user.username) {
            return res.status(403).json({ error: "No autorizado" });
        }

        tasks[index] = { ...tasks[index], ...req.body };
        await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2));
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Error al actualizar' }); }
});

// 4. ELIMINAR TAREA (DELETE)
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        console.log(`Eliminando tarea ${req.params.id} (Usuario: ${req.user.username})`);
        const { id } = req.params;
        const data = await fs.readFile(DATA_FILE, 'utf8');
        let tasks = JSON.parse(data || '[]');

        const task = tasks.find(t => t.id === id);
        if (!task) return res.status(404).json({ error: "No encontrada" });

        // SEGURIDAD: Solo el dueño puede borrar
        if (task.owner !== req.user.username) {
            return res.status(403).json({ error: "No autorizado" });
        }

        const filtered = tasks.filter(t => t.id !== id);
        await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Error al eliminar' }); }
});

app.listen(PORT, () =>  {
    console.log(`\nServidor listo en http://localhost:${PORT}`);
    console.log(`Monitoreando peticiones...\n` + "-".repeat(40));
});