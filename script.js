/* ========= MODELO ========= */

// Clase que representa una tarea individual
class Task {
    // Constructor que recibe un objeto con las propiedades de la tarea
    constructor({ id, name, materia, description, hora, date, status, profesor }) {
        this.id = id || Date.now().toString(); // ID único
        this.name = name;                      // Nombre de la tarea
        this.materia = materia;                // Materia asociada (opcional)
        this.description = description;        // Descripción detallada
        this.date = date;                      // Fecha en formato YYYY-MM-DD
        this.status = status;                  // Estado (pendiente, completado)
        this.profesor= profesor;               // Para agregar al profesor como campo (nuevo)
        this.hora=hora                         // Campo para agregar las horas (Nuevo)
    }
}

/* ========= MANEJO DE TAREAS ========= */

// Clase encargada de manejar las tareas y la comunicación con el servidor
class TaskManager {
    constructor() {
        this.tasks = []; // Inicializa como un arreglo vacío
    }

    // Carga las tareas iniciales desde el servidor
    async init() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                throw new Error('No se pudieron cargar las tareas.');
            }
            this.tasks = await response.json();
        } catch (error) {
            console.error(error);
            this.tasks = []; // En caso de error, empieza con un arreglo vacío
        }
    }

    // Guarda las tareas actuales en el servidor
    async save() {
        try {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.tasks),
            });
        } catch (error) {
            console.error('Error al guardar las tareas:', error);
        }
    }

    // Agrega una nueva tarea
    async add(task) {
        this.tasks.push(task);
        await this.save();
    }

    // Actualiza una tarea existente
    async update(task) {
            const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            this.tasks[index] = task;
        } else {
            this.tasks.push(task);
        }
        await this.save();
    }

    // Elimina una tarea por ID
    async delete(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        await this.save();
    }

    // Devuelve tareas filtradas por texto y estado
    getFiltered(search, status) {
        const searchLower = search.toLowerCase();

        return this.tasks.filter(t => {
            const matchText =
                t.name.toLowerCase().includes(searchLower) ||
                (t.materia && t.materia.toLowerCase().includes(searchLower));

            const matchStatus = !status || t.status === status;

            return matchText && matchStatus;
        });
    }
}

/* ========= UI ========= */

// Clase que maneja la interfaz del calendario
class CalendarUI {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.currentDate = new Date();
        this.expandedDay = null;

        this.calendarGrid = document.getElementById("calendarGrid");
        this.monthLabel = document.getElementById("currentMonth");
        this.searchInput = document.getElementById("searchInput");
        this.statusFilter = document.getElementById("statusFilter");

        this.bindEvents();
    }

    // Asigna eventos a botones y filtros
    bindEvents() {
        document.getElementById("prevMonth").onclick = async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.expandedDay = null;
            await this.render();
        };

        document.getElementById("nextMonth").onclick = async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.expandedDay = null;
            await this.render();
        };

        this.searchInput.oninput = () => this.render();
        this.statusFilter.onchange = () => this.render();
    }

    // Renderiza el calendario completo
    async render() {
        this.calendarGrid.innerHTML = "";

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        this.monthLabel.textContent = this.currentDate.toLocaleDateString("es-MX", {
            month: "long",
            year: "numeric"
        });

        const firstDay = new Date(year, month, 1).getDay() || 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i < firstDay; i++) {
            this.calendarGrid.appendChild(document.createElement("div"));
        }

        const filteredTasks = this.taskManager.getFiltered(
            this.searchInput.value,
            this.statusFilter.value
        );

        const MAX_VISIBLE = 2;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayDiv = document.createElement("div");
            dayDiv.className = "day";

            if (dateStr === todayStr) {
                dayDiv.classList.add("today");
            }

            if (this.expandedDay === dateStr) {
                dayDiv.classList.add("expanded");
            }

            dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
            dayDiv.onclick = () => openModal({ date: dateStr });

            const dayTasks = filteredTasks.filter(t => t.date === dateStr);
            const isExpanded = this.expandedDay === dateStr;

            const tasksToShow = isExpanded
                ? dayTasks
                : dayTasks.slice(0, MAX_VISIBLE);

            tasksToShow.forEach(task => {
                const taskDiv = document.createElement("div");
                const sizeClass = dayTasks.length === 1 ? "large" : "small";
                taskDiv.className = `task ${task.status} ${sizeClass}`;
                taskDiv.textContent = task.name;
                taskDiv.onclick = e => {
                    e.stopPropagation();
                    openModal(task);
                };
                dayDiv.appendChild(taskDiv);
            });

            if (!isExpanded && dayTasks.length > MAX_VISIBLE) {
                const moreDiv = document.createElement("div");
                const remaining = dayTasks.length - MAX_VISIBLE;
                moreDiv.className = "more-tasks";
                moreDiv.textContent = `+${remaining} más`;
                moreDiv.onclick = e => {
                    e.stopPropagation();
                    this.expandedDay = dateStr;
                    this.render();
                };
                dayDiv.appendChild(moreDiv);
            }

            if (isExpanded && dayTasks.length > MAX_VISIBLE) {
                const lessDiv = document.createElement("div");
                lessDiv.className = "less-tasks";
                lessDiv.textContent = "ver menos";
                lessDiv.onclick = e => {
                    e.stopPropagation();
                    this.expandedDay = null;
                    this.render();
                };
                dayDiv.appendChild(lessDiv);
            }

            this.calendarGrid.appendChild(dayDiv);
        }
    }
}

/* ========= MODAL ========= */

const modal = document.getElementById("taskModal");
const form = document.getElementById("taskForm");
const deleteBtn = document.getElementById("deleteTask");

function openModal(task = {}) {
    modal.classList.remove("hidden");
    const isEditing = !!task.id;
    const taskDateInput = form.taskDate;

    taskDateInput.value = task.date || "";
    taskDateInput.readOnly = !isEditing;

    form.taskMateria.value = task.materia || "";
    form.taskMateria.readOnly = isEditing;

    form.taskProfesor.value = task.profesor || ""; //Nuevo para el profeosr

    form.taskHora.value = task.hora || "";  //Para las Horas

    form.taskId.value = task.id || "";
    form.taskName.value = task.name || "";
    form.taskDescription.value = task.description || "";
    form.taskStatus.value = task.status || "pendiente";

    deleteBtn.style.display = isEditing ? "inline-block" : "none";
}

modal.onclick = e => {
    if (e.target === modal) modal.classList.add("hidden");
};

// Función promise que envuelve una operación asíncrona
async function promise(asyncOperation) {
    try {
        const result = await asyncOperation(); 
        return result;
    } catch (error) {
        throw error;
    }
}


// --- Inicialización de la Aplicación ---

(async () => {
    const taskManager = new TaskManager();
    const calendar = new CalendarUI(taskManager);

    // Carga los datos iniciales y luego renderiza el calendario
    await taskManager.init();
    await calendar.render();

    // Envío del formulario
    form.onsubmit = async (e) => {
        e.preventDefault();

        const taskData = {
            id: form.taskId.value,
            name: form.taskName.value,
            materia: form.taskMateria.value,
            profesor: form.taskProfesor.value, // Para el profesor
            description: form.taskDescription.value,
            date: form.taskDate.value,
            hora: form.taskHora.value,         // Para las horas
            status: form.taskStatus.value
        };

        const task = new Task(taskData);

        const operation = () => form.taskId.value
            ? taskManager.update(task)
            : taskManager.add(task);

        await promise(operation);
        form.reset();
        modal.classList.add("hidden");
        await calendar.render();
    };

    // Eliminación de tarea
    deleteBtn.onclick = async () => {
        const operation = () => taskManager.delete(form.taskId.value);
        await promise(operation);
        
        modal.classList.add("hidden");
        await calendar.render();
    };
})();

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "/home.html"; // vuelve a home.html
  });
}