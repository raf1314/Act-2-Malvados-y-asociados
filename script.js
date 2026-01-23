/* ========= MODELO ========= */

// Clase que representa una tarea individual
class Task {
    // Constructor que recibe un objeto con las propiedades de la tarea
    constructor({ id, name, materia, description, hora, date, status }) {
        this.id = id || Date.now().toString(); // ID único
        this.name = name;                      // Nombre de la tarea
        this.materia = materia;                // Materia asociada (opcional)
        this.description = description;        // Descripción detallada
        this.date = date;                      // Fecha en formato YYYY-MM-DD
        this.status = status;                  // Estado (pendiente, completado)
    }
}

/* ========= MANEJO DE TAREAS ========= */

// Clase encargada de manejar las tareas y el LocalStorage
class TaskManager {
    constructor() {
        // Carga las tareas desde localStorage o inicializa un arreglo vacío
        this.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    }

    // Guarda las tareas actuales en localStorage
    save() {
        localStorage.setItem("tasks", JSON.stringify(this.tasks));
    }

    // Agrega una nueva tarea
    add(task) {
        this.tasks.push(task); // Añade la tarea al arreglo
        this.save();           // Guarda cambios
    }

    // Actualiza una tarea existente
    update(task) {
        // Elimina la versión anterior de la tarea
        this.tasks = this.tasks.filter(t => t.id !== task.id);
        // Agrega la versión actualizada
        this.tasks.push(task);
        this.save(); // Guarda cambios
    }

    // Elimina una tarea por ID
    delete(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save(); // Guarda cambios
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
        this.taskManager = taskManager; // Referencia al manejador de tareas
        this.currentDate = new Date();  // Fecha actual del calendario
        this.expandedDay = null;        // Día actualmente expandido

        // Referencias a elementos del DOM
        this.calendarGrid = document.getElementById("calendarGrid");
        this.monthLabel = document.getElementById("currentMonth");
        this.searchInput = document.getElementById("searchInput");
        this.statusFilter = document.getElementById("statusFilter");

        this.bindEvents(); // Vincula eventos de la UI
        this.render();     // Renderiza el calendario inicial
    }

    // Asigna eventos a botones y filtros
    bindEvents() {
        // Botón mes anterior
        document.getElementById("prevMonth").onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.expandedDay = null; // Colapsa cualquier día expandido
            this.render();
        };

        // Botón mes siguiente
        document.getElementById("nextMonth").onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.expandedDay = null; // Colapsa cualquier día expandido
            this.render();
        };

        // Filtro por texto
        this.searchInput.oninput = () => this.render();

        // Filtro por estado
        this.statusFilter.onchange = () => this.render();
    }

    // Renderiza el calendario completo
    render() {
        this.calendarGrid.innerHTML = ""; // Limpia el calendario

        const year = this.currentDate.getFullYear(); // Año actual
        const month = this.currentDate.getMonth();   // Mes actual (0-11)

        // Fecha REAL de hoy (sin hora para evitar errores)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        // Muestra el nombre del mes y año
        this.monthLabel.textContent = this.currentDate.toLocaleDateString("es-MX", {
            month: "long",
            year: "numeric"
        });

        // Día de la semana en que inicia el mes
        const firstDay = new Date(year, month, 1).getDay() || 7;
        // Número total de días del mes
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Celdas vacías antes del día 1
        for (let i = 1; i < firstDay; i++) {
            this.calendarGrid.appendChild(document.createElement("div"));
        }

        // Obtiene tareas filtradas
        const filteredTasks = this.taskManager.getFiltered(
            this.searchInput.value,
            this.statusFilter.value
        );

        const MAX_VISIBLE = 2; // Máximo de tareas visibles sin expandir

        // Recorre todos los días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            const dayDiv = document.createElement("div");
            dayDiv.className = "day";

            // ✅ MARCAR EL DÍA ACTUAL
            if (dateStr === todayStr) {
                dayDiv.classList.add("today");
            }

            // Marca el día como expandido si aplica
            if (this.expandedDay === dateStr) {
                dayDiv.classList.add("expanded");
            }

            // Número del día
            dayDiv.innerHTML = `<span class="day-number">${day}</span>`;

            // Click para crear nueva tarea
            dayDiv.onclick = () => openModal({ date: dateStr });

            // Tareas correspondientes al día
            const dayTasks = filteredTasks.filter(t => t.date === dateStr);
            const isExpanded = this.expandedDay === dateStr;

            // Decide cuántas tareas mostrar
            const tasksToShow = isExpanded
                ? dayTasks
                : dayTasks.slice(0, MAX_VISIBLE);

            // Renderiza cada tarea
            tasksToShow.forEach(task => {
                const taskDiv = document.createElement("div");

                const sizeClass =
                    dayTasks.length === 1 ? "large" : "small";

                taskDiv.className = `task ${task.status} ${sizeClass}`;
                taskDiv.textContent = task.name;

                // Click para editar tarea
                taskDiv.onclick = e => {
                    e.stopPropagation();
                    openModal(task);
                };

                dayDiv.appendChild(taskDiv);
            });

            // Botón "+X más"
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

            // Botón "ver menos"
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

            // Agrega el día al calendario
            this.calendarGrid.appendChild(dayDiv);
        }
    }
}

/* ========= MODAL ========= */

const modal = document.getElementById("taskModal");
const form = document.getElementById("taskForm");
const deleteBtn = document.getElementById("deleteTask");

const taskManager = new TaskManager();
const calendar = new CalendarUI(taskManager);

// Abre el modal para crear o editar tarea
function openModal(task = {}) {
    modal.classList.remove("hidden");

    const isEditing = !!task.id; // true si existe id
    const taskDateInput = form.taskDate;

    // Fecha: fija al crear, editable al editar
    taskDateInput.value = task.date || "";
    taskDateInput.readOnly = !isEditing;

    //Materia: editable al crear, fia al editar
    form.taskMateria.value = task.materia || "";
    form.taskMateria.readOnly = isEditing;

    form.taskId.value = task.id || "";
    form.taskName.value = task.name || "";
    form.taskDescription.value = task.description || "";
    form.taskStatus.value = task.status || "pendiente";

    deleteBtn.style.display = isEditing ? "inline-block" : "none";
}

// Cierra el modal al hacer click fuera
modal.onclick = e => {
    if (e.target === modal) modal.classList.add("hidden");
};

// Envío del formulario
form.onsubmit = e => {
    e.preventDefault();

    const task = new Task({
        id: form.taskId.value,
        name: form.taskName.value,
        materia: form.taskMateria.value,
        description: form.taskDescription.value,
        date: form.taskDate.value,
        status: form.taskStatus.value
    });

    form.taskId.value
        ? taskManager.update(task)
        : taskManager.add(task);

    modal.classList.add("hidden");
    calendar.render();
};

// Eliminación de tarea
deleteBtn.onclick = () => {
    taskManager.delete(form.taskId.value);
    modal.classList.add("hidden");
    calendar.render();
};
