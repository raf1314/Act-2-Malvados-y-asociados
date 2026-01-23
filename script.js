/* ========= MODELO ========= */

// Clase que representa una tarea individual
class Task {
    // Constructor que recibe un objeto con las propiedades de la tarea
    constructor({ id, name, materia, description, hora, date, status }) {
        this.id = id || Date.now().toString(); // ID único (usa timestamp si no existe)
        this.name = name;                      // Nombre de la tarea
        this.materia = materia;                // Materia asociada (opcional)
        this.description = description;        // Descripción detallada
        this.hora = hora;                      // Hora de la tarea (opcional)
        this.date = date;                      // Fecha en formato YYYY-MM-DD
        this.status = status;                  // Estado (pendiente, completado, etc.)
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
        return this.tasks.filter(t => {
            // Coincidencia por nombre (ignora mayúsculas)
            const q = search.toLowerCase();
            const matchText =
                (t.name || "").toLowerCase().includes(q) ||
                (t.materia || "").toLowerCase().includes(q);
            // Coincidencia por estado (si no hay filtro, acepta todos)
            const matchStatus = !status || t.status === status;
            return matchText && matchStatus; // Ambas condiciones deben cumplirse
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

                // Tamaño del post-it según cantidad
                const sizeClass =
                    dayTasks.length === 1 ? "large" : "small";

                taskDiv.className = `task ${task.status} ${sizeClass}`;
                taskDiv.textContent = task.name;

                // Click para editar tarea
                taskDiv.onclick = e => {
                    e.stopPropagation(); // Evita abrir el modal del día
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
                    this.expandedDay = dateStr; // Expande el día
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
                    this.expandedDay = null; // Colapsa el día
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

// Referencias al modal y formulario
const modal = document.getElementById("taskModal");
const form = document.getElementById("taskForm");
const deleteBtn = document.getElementById("deleteTask");
const materiaInput = document.getElementById("taskMateria");

// Inicializa gestor y UI
const taskManager = new TaskManager();
const calendar = new CalendarUI(taskManager);

// Abre el modal para crear o editar tarea
function openModal(task = {}) {
    modal.classList.remove("hidden"); // Muestra el modal

    form.taskDate.value = task.date || form.taskDate.value || ""; //Guarda la fecha por el dia clickeado
    form.taskDate.readOnly = true; //Bloquea la edicion manual

    // Rellena el formulario
    form.taskId.value = task.id || "";
    form.taskName.value = task.name || "";
    materiaInput.value = task.materia || "";
    form.taskDescription.value = task.description || "";
    form.taskStatus.value = task.status || "pendiente";

    // Muestra botón eliminar solo si existe ID
    deleteBtn.style.display = task.id ? "inline-block" : "none";
}

// Cierra el modal al hacer click fuera
modal.onclick = e => {
    if (e.target === modal) modal.classList.add("hidden");
};

// Envío del formulario
form.onsubmit = e => {
    e.preventDefault(); // Evita recargar la página

    const task = new Task({
        id: form.taskId.value,
        name: form.taskName.value,
        materia: materiaInput.value,
        description: form.taskDescription.value,
        date: form.taskDate.value,
        status: form.taskStatus.value
    });

    // Decide si actualiza o crea
    form.taskId.value
        ? taskManager.update(task)
        : taskManager.add(task);

    modal.classList.add("hidden"); // Cierra modal
    calendar.render();             // Actualiza calendario
};

// Eliminación de tarea
deleteBtn.onclick = () => {
    taskManager.delete(form.taskId.value);
    modal.classList.add("hidden");
    calendar.render();
};

