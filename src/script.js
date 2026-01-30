/* ========= MODELO ========= */

const userLogueado = sessionStorage.getItem("currentUser");
const token = sessionStorage.getItem("token");

if (!userLogueado || !token) {
    window.location.href = "/home.html";
}

class Task {
    constructor({ id, name, materia, description, hora, date, status, profesor, owner }) {
        this.id = id || Date.now().toString();
        this.name = name;
        this.materia = materia;
        this.description = description;
        this.date = date;
        this.status = status;
        this.profesor = profesor;
        this.hora = hora;
        this.owner = owner || sessionStorage.getItem("currentUser");
    }
}

/* ========= MANEJO DE TAREAS (API REST) ========= */

class TaskManager {
    constructor() {
        this.tasks = [];
    }

async init() {
        try {
            // RE-CAPTURAR los datos actuales del storage
            const currentUser = sessionStorage.getItem("currentUser");
            const currentToken = sessionStorage.getItem("token");

            const response = await fetch('/api/tasks', {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (!response.ok) throw new Error("Sesión expirada");

            const allTasks = await response.json();
            
            // FILTRO CRÍTICO: Asegúrate de que t.owner coincida exactamente
            // Agregamos un console.log para depurar en el navegador
            this.tasks = allTasks.filter(t => t.owner === currentUser);
            
            console.log(`Tareas cargadas para ${currentUser}:`, this.tasks.length);
        } catch (error) {
            console.error("Error al cargar:", error);
            sessionStorage.clear();
            window.location.href = "/home.html";
        }
    }

    // CREAR: Usa POST /api/tasks
    async add(task) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(task)
            });

            if (response.ok) {
                this.tasks.push(task);
            }
        } catch (error) {
            console.error('Error al agregar tarea:', error);
        }
    }

    // ACTUALIZAR: Usa PUT /api/tasks/:id
    async update(task) {
        try {
            const response = await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(task)
            });

            if (response.ok) {
                const index = this.tasks.findIndex(t => t.id === task.id);
                if (index !== -1) this.tasks[index] = task;
            }
        } catch (error) {
            console.error('Error al actualizar tarea:', error);
        }
    }

    // ELIMINAR: Usa DELETE /api/tasks/:id
    async delete(id) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.tasks = this.tasks.filter(t => t.id !== id);
            }
        } catch (error) {
            console.error('Error al eliminar tarea:', error);
        }
    }

    getFiltered(search, status) {
        const searchLower = search.toLowerCase();
        return this.tasks.filter(t => {
            const matchText = t.name.toLowerCase().includes(searchLower) ||
                              (t.materia && t.materia.toLowerCase().includes(searchLower));
            const matchStatus = !status || t.status === status;
            return matchText && matchStatus;
        });
    }
}

/* ========= UI & CALENDARIO ========= */
// (El código de CalendarUI se mantiene igual que el tuyo, solo asegúrate de llamar a render)

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

    async render() {
        this.calendarGrid.innerHTML = "";
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        this.monthLabel.textContent = this.currentDate.toLocaleDateString("es-MX", {
            month: "long", year: "numeric"
        });

        const firstDay = new Date(year, month, 1).getDay() || 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i < firstDay; i++) {
            this.calendarGrid.appendChild(document.createElement("div"));
        }

        const filteredTasks = this.taskManager.getFiltered(this.searchInput.value, this.statusFilter.value);
        const MAX_VISIBLE = 2;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayDiv = document.createElement("div");
            dayDiv.className = "day";
            if (dateStr === todayStr) dayDiv.classList.add("today");
            if (this.expandedDay === dateStr) dayDiv.classList.add("expanded");

            dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
            dayDiv.onclick = () => {
                const today = new Date().toISOString().split("T")[0];
                if (dateStr < today) return; //  Bloquea fechas pasadas
                openModal({ date: dateStr });
            };
            const dayTasks = filteredTasks.filter(t => t.date === dateStr);
            const isExpanded = this.expandedDay === dateStr;
            const tasksToShow = isExpanded ? dayTasks : dayTasks.slice(0, MAX_VISIBLE);

            tasksToShow.forEach(task => {
                const taskDiv = document.createElement("div");
                taskDiv.className = `task ${task.status} ${dayTasks.length === 1 ? "large" : "small"}`;
                taskDiv.textContent = task.name;
                taskDiv.onclick = e => {
                    e.stopPropagation();
                    openModal(task);
                };
                dayDiv.appendChild(taskDiv);
            });

            if (!isExpanded && dayTasks.length > MAX_VISIBLE) {
                const moreDiv = document.createElement("div");
                moreDiv.className = "more-tasks";
                moreDiv.textContent = `+${dayTasks.length - MAX_VISIBLE} más`;
                moreDiv.onclick = e => {
                    e.stopPropagation();
                    this.expandedDay = dateStr;
                    this.render();
                };
                dayDiv.appendChild(moreDiv);
            }
            this.calendarGrid.appendChild(dayDiv);
        }
    }
}

/* ========= MODAL & FORMULARIO ========= */

const modal = document.getElementById("taskModal");
const form = document.getElementById("taskForm");
const deleteBtn = document.getElementById("deleteTask");

const taskDateInput = document.getElementById("taskDate"); // NUEVO
function setMinDate() {
    const today = new Date().toISOString().split("T")[0];
    taskDateInput.min = today;
}


function openModal(task = {}) {
    setMinDate();

    modal.classList.remove("hidden");
    const isEditing = !!task.id;

    form.taskId.value = task.id || "";
    form.taskDate.value = task.date || "";

    form.taskDate.readOnly = !isEditing; 

    form.taskMateria.value = task.materia || "";
    form.taskProfesor.value = task.profesor || "";
    form.taskHora.value = task.hora || "";
    form.taskName.value = task.name || "";
    form.taskDescription.value = task.description || "";
    form.taskStatus.value = task.status || "pendiente";

    deleteBtn.style.display = isEditing ? "inline-block" : "none";
}


/* ========= INICIALIZACIÓN ESTRUCTURADA ========= */

(async () => {
    const taskManager = new TaskManager();
    const calendar = new CalendarUI(taskManager);

    await taskManager.init();
    await calendar.render();

    form.onsubmit = async (e) => {
        e.preventDefault();
        const taskData = {
            id: form.taskId.value,
            name: form.taskName.value,
            materia: form.taskMateria.value,
            profesor: form.taskProfesor.value,
            description: form.taskDescription.value,
            date: form.taskDate.value,
            hora: form.taskHora.value,
            status: form.taskStatus.value,
            owner: userLogueado
        };

        const task = new Task(taskData);

        if (form.taskId.value) {
            await taskManager.update(task);
        } else {
            await taskManager.add(task);
        }

        form.reset();
        modal.classList.add("hidden");
        await calendar.render();
    };

    deleteBtn.onclick = async () => {
        if (confirm("¿Seguro que quieres eliminar esta tarea?")) {
            await taskManager.delete(form.taskId.value);
            modal.classList.add("hidden");
            await calendar.render();
        }
    };

    // Saludo y Logout
    const userDisplay = document.getElementById("userDisplay");
    if (userDisplay) userDisplay.textContent = `Hola, ${userLogueado}`;

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            sessionStorage.clear();
            window.location.href = "/home.html";
        };
    }
})();