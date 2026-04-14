// Iniciar Animaciones AOS
if (typeof AOS !== 'undefined') {
    AOS.init();
} else {
    console.warn("La librería AOS no se pudo cargar.");
}

/* =======================================================
   LÓGICA DE SUPABASE Y AUTENTICACIÓN
   ======================================================= */
   
// TUS LLAVES DE CONEXIÓN A SUPABASE
const supabaseUrl = 'https://trdqrgfnxljjjgufmyhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_pLZMEZPywb7Fie8XBNPsUA_MtcqAPpn';

// Creamos el cliente de conexión
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

// Función para crear partículas en el login
function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    container.innerHTML = ''; 
    const particleCount = 50; 
    for (let i = 0; i < particleCount; i++) {
        let particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = Math.random() * 100 + 'vh'; 
        particle.style.animationDuration = (Math.random() * 4 + 2) + 's'; 
        particle.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(particle);
    }
}

function abrirLogin() {
    if (usuarioActual !== "") {
        cerrarSesion();
        return;
    }
    const loginOverlay = document.getElementById("login-overlay");
    loginOverlay.style.display = "flex";
    createParticles(); 
    setTimeout(() => { loginOverlay.style.opacity = "1"; }, 10);
}

function cerrarLoginModal() {
    const loginOverlay = document.getElementById("login-overlay");
    loginOverlay.style.opacity = "0";
    setTimeout(() => { 
        loginOverlay.style.display = "none"; 
        const container = document.getElementById('particles-container');
        if (container) container.innerHTML = ''; 
    }, 600);
}

// Mostrar/Ocultar contraseña
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
if(togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bx-show');
        this.classList.toggle('bx-hide');
    });
}

// Iniciar sesión con la tecla "Enter"
const inputsAuth = document.querySelectorAll('#username, #password');
inputsAuth.forEach(input => {
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            validarLogin();
        }
    });
});

// FUNCIÓN DE LOGIN CONECTADA A SUPABASE
async function validarLogin() {
    const userEmail = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");
    
    const adminElements = document.querySelectorAll(".admin-controls");
    const btnAuthHeader = document.getElementById("text-auth-header");
    const btnAuthSidebar = document.getElementById("btn-auth-sidebar");
    
    const loginBtn = document.querySelector(".login-btn span");
    loginBtn.innerText = "Autenticando...";

    // Consulta a la Base de Datos de Supabase
    const { data, error } = await clienteSupabase.auth.signInWithPassword({
        email: userEmail,
        password: pass,
    });

    if (error) {
        // Falló el login
        errorMsg.style.display = "block";
        loginBtn.innerText = "Ingresar al Portafolio";
    } else {
        // Login exitoso
        errorMsg.style.display = "none";
        
        // Verificamos si es el admin 
        if (data.user.email === "admin@portafolio.com") {
            usuarioActual = "admin";
            if(btnAuthHeader) btnAuthHeader.innerText = "Cerrar Sesión";
            if(btnAuthSidebar) btnAuthSidebar.innerHTML = "<i class='fa-solid fa-right-from-bracket'></i> Cerrar Sesión";
            adminElements.forEach(el => el.style.display = "flex"); 
        } else {
            usuarioActual = "user";
            if(btnAuthHeader) btnAuthHeader.innerText = "Cerrar Sesión (Usuario)";
            if(btnAuthSidebar) btnAuthSidebar.innerHTML = "<i class='fa-solid fa-right-from-bracket'></i> Cerrar Sesión (Usuario)";
            adminElements.forEach(el => el.style.display = "none"); 
        }

        document.querySelectorAll('.week-card').forEach(card => {
            card.style.animation = 'none';
            card.style.filter = 'blur(0)';
            card.style.opacity = '1';
        });

        loginBtn.innerText = "Ingresar al Portafolio";
        cerrarLoginModal();
    }
}

async function cerrarSesion() {
    // Cerramos sesión en Supabase
    await clienteSupabase.auth.signOut();
    
    usuarioActual = "";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    passwordInput.setAttribute('type', 'password'); 
    if (togglePassword) { togglePassword.classList.remove('bx-show'); togglePassword.classList.add('bx-hide'); }
    
    const adminElements = document.querySelectorAll(".admin-controls");
    adminElements.forEach(el => el.style.display = "none");

    const btnAuthHeader = document.getElementById("text-auth-header");
    const btnAuthSidebar = document.getElementById("btn-auth-sidebar");
    if(btnAuthHeader) btnAuthHeader.innerText = "Iniciar Sesión";
    if(btnAuthSidebar) btnAuthSidebar.innerHTML = "<i class='fa-solid fa-right-to-bracket'></i> Iniciar Sesión";
    
    document.querySelectorAll('.week-card').forEach(card => {
        card.style.animation = '';
        card.style.filter = '';
        card.style.opacity = '';
    });

    const sideBar = document.querySelector('.sidebar');
    if(sideBar) {
        sideBar.classList.remove("open-sidebar");
        sideBar.classList.add("close-sidebar");
    }
    
    alert("Has cerrado sesión. Modo público activado.");
}

/* =======================================================
   LÓGICA DE VISTA PREVIA (PDF E IMÁGENES)
   ======================================================= */
function abrirPreviewModal(tipo, url, titulo) {
    const modal = document.getElementById("preview-modal");
    const container = document.getElementById("preview-container");
    const titleEl = document.getElementById("preview-title");
    
    titleEl.innerHTML = `<i class='fa-solid fa-file-lines'></i> ${titulo}`;
    container.innerHTML = ""; 

    if (tipo === "image") {
        container.innerHTML = `<img src="${url}" alt="${titulo}">`;
    } else if (tipo === "pdf") {
        container.innerHTML = `<iframe src="${url}"></iframe>`;
    } else {
        container.innerHTML = `<p style="color: white;">Formato no soportado.</p>`;
    }

    modal.style.display = "flex";
    setTimeout(() => { modal.style.opacity = "1"; }, 10);
}

function cerrarPreviewModal() {
    const modal = document.getElementById("preview-modal");
    modal.style.opacity = "0";
    setTimeout(() => { 
        modal.style.display = "none"; 
        document.getElementById("preview-container").innerHTML = ""; 
    }, 400);
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Lógica para botones de visualización
    const botonesCarpeta = document.querySelectorAll(".btn-ver");
    botonesCarpeta.forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (usuarioActual === "") {
                e.preventDefault();
                alert("Acceso denegado: Por favor inicia sesión para visualizar los archivos del proyecto.");
                abrirLogin(); 
            } else {
                if (btn.classList.contains("btn-preview")) {
                    const tipo = btn.getAttribute("data-type");
                    const src = btn.getAttribute("data-src");
                    const titulo = btn.getAttribute("data-title") || "Vista Previa";
                    abrirPreviewModal(tipo, src, titulo);
                } else {
                    alert("Carpeta abierta. Aún no has enlazado un archivo a esta semana.");
                }
            }
        });
    });

    // 2. Lógica para botones exclusivos del Administrador
    const uploadBtns = document.querySelectorAll(".btn-upload");
    const saveBtns = document.querySelectorAll(".btn-save");
    const editBtns = document.querySelectorAll(".btn-edit");
    const deleteBtns = document.querySelectorAll(".btn-delete");

    uploadBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest('.week-card');
            if (card) {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*,application/pdf'; 

                fileInput.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return;

                    let fileType = '';
                    if (file.type.startsWith('image/')) {
                        fileType = 'image';
                    } else if (file.type === 'application/pdf') {
                        fileType = 'pdf';
                    } else {
                        alert("⚠️ Formato no soportado. Por favor sube una imagen o un PDF.");
                        return;
                    }

                    const fileUrl = URL.createObjectURL(file);
                    
                    const btnVer = card.querySelector('.btn-ver');
                    const tituloSemana = card.querySelector('h2').innerText.trim();
                    
                    btnVer.setAttribute('data-type', fileType);
                    btnVer.setAttribute('data-src', fileUrl);
                    btnVer.setAttribute('data-title', `Proyecto - ${tituloSemana} (${file.name})`);
                    btnVer.classList.add('btn-preview');
                    
                    btnVer.innerHTML = fileType === 'pdf' ? "<i class='fa-solid fa-file-pdf'></i> Visualizar PDF" : "<i class='fa-regular fa-image'></i> Visualizar Imagen";
                    card.querySelector('p').innerText = `Archivo cargado: ${file.name}`;
                    
                    alert("✅ Archivo cargado exitosamente desde tu PC.");
                };

                fileInput.click();

            } else {
                alert("☁️ Abriendo panel general de archivos...");
            }
        });
    });

    saveBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            alert("💾 ¡Cambios guardados localmente!");
        });
    });

    editBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest('.week-card');
            if (card) {
                const parrafo = card.querySelector('p');
                const nuevoTexto = prompt("Modificar la descripción del proyecto de esta semana:", parrafo.innerText);
                if(nuevoTexto !== null && nuevoTexto.trim() !== "") {
                    parrafo.innerText = nuevoTexto;
                    alert("✅ Descripción actualizada.");
                }
            } else {
                alert("⚙️ Abriendo panel de configuración general del entorno de Base de Datos...");
            }
        });
    });

    deleteBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest('.week-card');
            if (card) {
                const confirmacion = confirm("⚠️ ¿Estás seguro de que deseas eliminar permanentemente los archivos de esta semana? Esta acción no se puede deshacer.");
                if (confirmacion) {
                    const btnVer = card.querySelector('.btn-ver');
                    btnVer.removeAttribute('data-type');
                    btnVer.removeAttribute('data-src');
                    btnVer.removeAttribute('data-title');
                    btnVer.classList.remove('btn-preview');
                    
                    btnVer.innerHTML = "<i class='fa-solid fa-folder-open'></i> Visualizar Proyecto";
                    card.querySelector('p').innerText = "Aún no hay archivos subidos.";
                    
                    alert("🗑️ Archivos eliminados y registro limpiado correctamente.");
                }
            }
        });
    });
});

/* =======================================================
   LÓGICA DEL MENÚ LATERAL
   ======================================================= */
const sideBar = document.querySelector('.sidebar');
const menu = document.querySelector('.menu-icon');
const closeIcon = document.querySelector('.close-icon');

if(menu && sideBar) {
    menu.addEventListener("click", function(){
        sideBar.classList.remove("close-sidebar");
        sideBar.classList.add("open-sidebar");
    });
}

if(closeIcon && sideBar) {
    closeIcon.addEventListener("click", function(){
        sideBar.classList.remove("open-sidebar");
        sideBar.classList.add("close-sidebar");
    });
}

const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
        if(sideBar) {
            sideBar.classList.remove("open-sidebar");
            sideBar.classList.add("close-sidebar");
        }
    });
});
