/* ========= MODELO ========= */
class Task {
    constructor({ id, name, description, date, status }) {
        this.id = id || Date.now().toString();
        this.name = name;
        this.description = description;
        this.date = date;
        this.status = status;
    }
}

/* ========= MANEJO DE TAREAS ========= */
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    }

    save() {
        localStorage.setItem("tasks", JSON.stringify(this.tasks));
    }

    add(task) {
        this.tasks.push(task);
        this.save();
    }

    update(task) {
        this.tasks = this.tasks.filter(t => t.id !== task.id);
        this.tasks.push(task);
        this.save();
    }

    delete(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
    }

    getFiltered(search, status) {
        return this.tasks.filter(t => {
            const matchText = t.name.toLowerCase().includes(search.toLowerCase());
            const matchStatus = !status || t.status === status;
            return matchText && matchStatus;
        });
    }
}

/* ========= UI ========= */
class CalendarUI {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.currentDate = new Date();
        this.calendarGrid = document.getElementById("calendarGrid");
        this.monthLabel = document.getElementById("currentMonth");
        this.searchInput = document.getElementById("searchInput");
        this.statusFilter = document.getElementById("statusFilter");

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        document.getElementById("prevMonth").onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        };

        document.getElementById("nextMonth").onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        };

        this.searchInput.oninput = () => this.render();
        this.statusFilter.onchange = () => this.render();
    }

    render() {
        this.calendarGrid.innerHTML = "";

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

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

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            const dayDiv = document.createElement("div");
            dayDiv.className = "day";
            dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
            dayDiv.onclick = () => openModal({ date: dateStr });

            filteredTasks
                .filter(t => t.date === dateStr)
                .forEach(task => {
                    const taskDiv = document.createElement("div");
                    taskDiv.className = `task ${task.status}`;
                    taskDiv.textContent = task.name;
                    taskDiv.onclick = e => {
                        e.stopPropagation();
                        openModal(task);
                    };
                    dayDiv.appendChild(taskDiv);
                });

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

function openModal(task = {}) {
    modal.classList.remove("hidden");

    form.taskId.value = task.id || "";
    form.taskName.value = task.name || "";
    form.taskDescription.value = task.description || "";
    form.taskDate.value = task.date || "";
    form.taskStatus.value = task.status || "pendiente";

    deleteBtn.style.display = task.id ? "inline-block" : "none";
}

modal.onclick = e => {
    if (e.target === modal) modal.classList.add("hidden");
};

form.onsubmit = e => {
    e.preventDefault();

    const task = new Task({
        id: form.taskId.value,
        name: form.taskName.value,
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

deleteBtn.onclick = () => {
    taskManager.delete(form.taskId.value);
    modal.classList.add("hidden");
    calendar.render();
};
