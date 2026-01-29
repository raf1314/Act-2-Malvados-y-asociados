const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data/tasks.json');

app.use(express.json());
app.use(express.static(__dirname)); // Sirve tus archivos HTML/JS actuales

// Leer tareas del JSON
app.get('/api/tasks', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        // Si el archivo no existe, enviamos un array vacío
        res.json([]);
    }
});

// Guardar tareas en el JSON
app.post('/api/tasks', async (req, res) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al escribir el archivo' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});