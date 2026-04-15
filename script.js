// =======================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// =======================================================

if (typeof AOS !== 'undefined') {
    AOS.init();
}

// Tus llaves de conexión a Supabase
const supabaseUrl = 'https://trdqrgfnxljjjgufmyhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_pLZMEZPywb7Fie8XBNPsUA_MtcqAPpn';
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

document.addEventListener("DOMContentLoaded", async () => {
    await cargarProyectosDesdeNube();
    
    // FUNCIONALIDAD DEL OJITO DE CONTRASEÑA
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            // Cambia el tipo de input entre password y texto
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Cambia el ícono
            this.classList.toggle('bx-hide');
            this.classList.toggle('bx-show');
        });
    }

    const botonesCarpeta = document.querySelectorAll(".btn-ver");
    botonesCarpeta.forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (usuarioActual === "") {
                e.preventDefault();
                alert("Acceso denegado: Por favor inicia sesión o regístrate para visualizar los proyectos.");
                abrirLogin(); 
            } else {
                if (btn.classList.contains("btn-preview")) {
                    const tipo = btn.getAttribute("data-type");
                    const src = btn.getAttribute("data-src");
                    const titulo = btn.getAttribute("data-title") || "Vista Previa";
                    abrirPreviewModal(tipo, src, titulo);
                } else {
                    alert("Aún no se ha subido ningún archivo para esta semana.");
                }
            }
        });
    });

    configurarControlesAdmin();
});

// =======================================================
// 2. PERSISTENCIA EN LA NUBE
// =======================================================
async function cargarProyectosDesdeNube() {
    const { data, error } = await clienteSupabase.from('proyectos').select('*');
    if (error) { console.error("Error cargando datos:", error.message); return; }

    if (data) {
        const cards = document.querySelectorAll('.week-card');
        data.forEach(proy => {
            const index = proy.id - 1; 
            if (cards[index]) {
                const card = cards[index];
                const parrafo = card.querySelector('p');
                const btnVer = card.querySelector('.btn-ver');

                parrafo.innerText = proy.descripcion;

                if (proy.file_url) {
                    btnVer.setAttribute('data-type', proy.file_type);
                    btnVer.setAttribute('data-src', proy.file_url);
                    btnVer.setAttribute('data-title', `Proyecto - Semana ${proy.id} (${proy.file_name})`);
                    btnVer.classList.add('btn-preview');
                    btnVer.innerHTML = proy.file_type === 'pdf' 
                        ? "<i class='fa-solid fa-file-pdf'></i> Ver Proyecto (PDF)" 
                        : "<i class='fa-regular fa-image'></i> Ver Proyecto (Imagen)";
                }
            }
        });
    }
}

async function guardarRegistroEnSQL(semana, descripcion, url = null, tipo = null, nombreArchivo = null) {
    const { error } = await clienteSupabase.from('proyectos').upsert({ 
        id: semana, descripcion: descripcion, file_url: url, file_type: tipo, file_name: nombreArchivo 
    });
    if (error) console.error("Error SQL:", error.message);
}

// =======================================================
// 3. CONTROLES DE ADMINISTRADOR
// =======================================================
function configurarControlesAdmin() {
    const uploadBtns = document.querySelectorAll(".btn-upload");
    const saveBtns = document.querySelectorAll(".btn-save");
    const editBtns = document.querySelectorAll(".btn-edit");
    const deleteBtns = document.querySelectorAll(".btn-delete");

    uploadBtns.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            const semana = index + 1;
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*,application/pdf';

            fileInput.onchange = async e => {
                const file = e.target.files[0];
                if (!file) return;

                const originalBtnText = btn.innerHTML;
                btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Subiendo...";

                const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const filePath = `semana_${semana}/${Date.now()}_${nombreLimpio}`;
                const { error: uploadError } = await clienteSupabase.storage.from('portafolio').upload(filePath, file);

                if (uploadError) {
                    alert("Error: " + uploadError.message);
                    btn.innerHTML = originalBtnText; return;
                }

                const { data: urlData } = clienteSupabase.storage.from('portafolio').getPublicUrl(filePath);
                const publicUrl = urlData.publicUrl;

                const card = btn.closest('.week-card');
                const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
                const parrafo = card.querySelector('p');
                const btnVer = card.querySelector('.btn-ver');

                parrafo.innerText = `Archivo cargado: ${file.name}`;
                btnVer.setAttribute('data-type', fileType);
                btnVer.setAttribute('data-src', publicUrl);
                btnVer.setAttribute('data-title', `Proyecto - Semana ${semana} (${file.name})`);
                btnVer.classList.add('btn-preview');
                btnVer.innerHTML = fileType === 'pdf' ? "<i class='fa-solid fa-file-pdf'></i> Ver PDF" : "<i class='fa-regular fa-image'></i> Ver Imagen";

                await guardarRegistroEnSQL(semana, parrafo.innerText, publicUrl, fileType, file.name);

                btn.innerHTML = originalBtnText;
                alert(`✅ Archivo de Semana ${semana} guardado.`);
            };
            fileInput.click();
        });
    });

    saveBtns.forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            const semana = index + 1;
            const card = btn.closest('.week-card');
            await guardarRegistroEnSQL(semana, card.querySelector('p').innerText, card.querySelector('.btn-ver').getAttribute('data-src'), card.querySelector('.btn-ver').getAttribute('data-type'), "Archivo");
            alert("💾 Cambios guardados.");
        });
    });

    editBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest('.week-card');
            const parrafo = card.querySelector('p');
            const nuevoTexto = prompt("Modificar descripción:", parrafo.innerText);
            if (nuevoTexto) { parrafo.innerText = nuevoTexto; alert("📝 Texto editado. Pulsa Guardar."); }
        });
    });

    deleteBtns.forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            if (confirm("⚠️ ¿Eliminar registro permanentemente?")) {
                const { error } = await clienteSupabase.from('proyectos').delete().eq('id', index + 1);
                if (!error) location.reload();
            }
        });
    });
}

// =======================================================
// 4. AUTENTICACIÓN Y ROLES (SISTEMA DINÁMICO PROFESIONAL)
// =======================================================
let isRegisterMode = false;

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById("auth-title");
    const subtitle = document.getElementById("auth-subtitle");
    const btnText = document.getElementById("btn-auth-text");
    const toggleText = document.getElementById("auth-toggle-text");
    const errorMsg = document.getElementById("login-error");

    errorMsg.style.display = "none"; 

    if (isRegisterMode) {
        title.innerHTML = `Registro en <span class="gradient-text">BD2</span>`;
        subtitle.innerText = "Crea una cuenta nueva para ver los proyectos";
        btnText.innerText = "Crear Cuenta Nueva";
        toggleText.innerHTML = `¿Ya tienes cuenta? <b style="cursor:pointer; color:#00d2ff;" onclick="toggleAuthMode()">Inicia sesión</b>`;
    } else {
        title.innerHTML = `Acceso a <span class="gradient-text">BD2</span>`;
        subtitle.innerText = "Ingresa tus credenciales para continuar";
        btnText.innerText = "Ingresar al Portafolio";
        toggleText.innerHTML = `¿No tienes cuenta? <b style="cursor:pointer; color:#00d2ff;" onclick="toggleAuthMode()">Regístrate aquí</b>`;
    }
}

async function procesarAuth() {
    const userEmail = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");
    const btnText = document.getElementById("btn-auth-text"); 
    
    if (!userEmail || pass.length < 6) { 
        mostrarMensajeUI(errorMsg, "Ingresa un correo válido y clave min. 6 caracteres.", "error"); 
        return; 
    }

    const textoOriginal = btnText.innerText;
    btnText.innerText = isRegisterMode ? "Creando usuario..." : "Verificando...";

    if (isRegisterMode) {
        const { error } = await clienteSupabase.auth.signUp({ email: userEmail, password: pass });
        
        if (error) {
            mostrarMensajeUI(errorMsg, error.message, "error");
        } else {
            mostrarMensajeUI(errorMsg, "¡Cuenta creada! Iniciando sesión automáticamente...", "success");
            setTimeout(async () => {
                const { data, error: loginError } = await clienteSupabase.auth.signInWithPassword({ email: userEmail, password: pass });
                if (!loginError) {
                    usuarioActual = "user"; 
                    actualizarInterfazPorRol();
                    cerrarLoginModal();
                }
            }, 1500);
        }
    } else {
        const { data, error } = await clienteSupabase.auth.signInWithPassword({ email: userEmail, password: pass });
        
        if (error) {
            mostrarMensajeUI(errorMsg, "Credenciales incorrectas o usuario no existe.", "error");
        } else {
            // Mantenemos estrictamente tu regla: Solo admin@ms.upla.edu.pe tiene poder de edición.
            usuarioActual = data.user.email === "admin@ms.upla.edu.pe" ? "admin" : "user";
            actualizarInterfazPorRol();
            cerrarLoginModal();
        }
    }
    btnText.innerText = textoOriginal;
}

function actualizarInterfazPorRol() {
    const adminElements = document.querySelectorAll(".admin-controls");
    const btnAuthHeader = document.getElementById("text-auth-header");
    const btnAuthSidebar = document.getElementById("text-auth-sidebar");

    if (usuarioActual === "admin") {
        adminElements.forEach(el => el.style.display = "flex");
        btnAuthHeader.innerText = "Cerrar Sesión (Admin)";
        if (btnAuthSidebar) btnAuthSidebar.innerText = "Cerrar Sesión (Admin)";
    } else {
        adminElements.forEach(el => el.style.display = "none");
        btnAuthHeader.innerText = "Cerrar Sesión";
        if (btnAuthSidebar) btnAuthSidebar.innerText = "Cerrar Sesión";
    }

    document.querySelectorAll('.week-card').forEach(card => {
        card.style.filter = 'blur(0)'; card.style.opacity = '1';
    });
}

async function cerrarSesion() {
    await clienteSupabase.auth.signOut();
    location.reload(); 
}

// =======================================================
// 5. INTERFAZ Y MODALES
// =======================================================
function abrirLogin() {
    if (usuarioActual !== "") { cerrarSesion(); return; }
    
    if (isRegisterMode) toggleAuthMode(); 
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("login-error").style.display = "none";
    
    // Al abrir de nuevo el modal, asegurarse de ocultar la contraseña por defecto
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (passwordInput && togglePassword) {
        passwordInput.setAttribute('type', 'password');
        togglePassword.classList.remove('bx-show');
        togglePassword.classList.add('bx-hide');
    }

    const overlay = document.getElementById("login-overlay");
    overlay.style.display = "flex";
    createParticles(); 
    setTimeout(() => { overlay.style.opacity = "1"; }, 10);

    const sideBar = document.querySelector('.sidebar');
    if (sideBar && sideBar.classList.contains('open-sidebar')) {
        sideBar.classList.remove("open-sidebar");
        sideBar.classList.add("close-sidebar");
    }
}

function cerrarLoginModal() {
    const overlay = document.getElementById("login-overlay");
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.style.display = "none"; }, 600);
}

function mostrarMensajeUI(elemento, texto, tipo) {
    elemento.style.display = "block";
    elemento.style.color = tipo === "error" ? "#ff4d4d" : "#00d2ff";
    elemento.innerHTML = texto;
}

function abrirPreviewModal(tipo, url, titulo) {
    const modal = document.getElementById("preview-modal");
    document.getElementById("preview-title").innerHTML = `<i class='fa-solid fa-file-lines'></i> ${titulo}`;
    document.getElementById("preview-container").innerHTML = tipo === "image" ? `<img src="${url}" style="max-width:100%">` : `<iframe src="${url}" width="100%" height="100%"></iframe>`;
    modal.style.display = "flex"; setTimeout(() => { modal.style.opacity = "1"; }, 10);
}

function cerrarPreviewModal() {
    const modal = document.getElementById("preview-modal");
    modal.style.opacity = "0"; setTimeout(() => { modal.style.display = "none"; }, 400);
}

function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return; container.innerHTML = ''; 
    for (let i = 0; i < 30; i++) {
        let p = document.createElement('div'); p.classList.add('particle');
        p.style.left = Math.random() * 100 + 'vw'; p.style.top = Math.random() * 100 + 'vh'; 
        container.appendChild(p);
    }
}

const sideBar = document.querySelector('.sidebar');
if (document.querySelector('.menu-icon')) document.querySelector('.menu-icon').addEventListener("click", () => { sideBar.classList.remove("close-sidebar"); sideBar.classList.add("open-sidebar"); });
if (document.querySelector('.close-icon')) document.querySelector('.close-icon').addEventListener("click", () => { sideBar.classList.remove("open-sidebar"); sideBar.classList.add("close-sidebar"); });
