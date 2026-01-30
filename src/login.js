/* ========= LÓGICA DE AUTENTICACIÓN CON JWT ========= */

const form = document.getElementById("loginForm");
const userInput = document.getElementById("username");
const passInput = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");

if (userInput) userInput.focus();

// --- Registro de Usuario (La encriptación ocurre en el servidor) ---
async function handleRegister() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Por favor, llena ambos campos.");
        return;
    }

    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }) // Enviamos objeto simple
    });

    if (response.ok) {
        alert("¡Registrado con éxito!");
    } else {
        const error = await response.json();
        alert("Error: " + error.error);
    }
}

// --- Inicio de Sesión con Generación de Token ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = userInput.value.trim();
    const password = passInput.value;

    try {
        // Ahora enviamos los datos a una ruta específica de login en el servidor
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.token) {
            // GUARDADO SEGURO:
            // Guardamos el Token para futuras peticiones a la API
            sessionStorage.setItem("token", result.token);
            // Guardamos el nombre para personalizar la interfaz
            sessionStorage.setItem("currentUser", result.username);

            window.location.href = "/calendario";
        } else {
            alert(result.error || "Credenciales inválidas");
        }
    } catch (error) {
        console.error("Error en el login:", error);
        alert("Error al conectar con el servidor.");
    }
});

if (registerBtn) {
    registerBtn.addEventListener("click", handleRegister);
}