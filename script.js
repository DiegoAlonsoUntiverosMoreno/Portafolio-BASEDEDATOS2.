// =======================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// =======================================================

// Iniciar Animaciones AOS (protegido)
if (typeof AOS !== 'undefined') {
    AOS.init();
}

// Tus llaves de conexión exactas
const supabaseUrl = 'https://trdqrgfnxljjjgufmyhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_pLZMEZPywb7Fie8XBNPsUA_MtcqAPpn';

// Creamos el cliente de conexión
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

// Ejecutar cuando cargue el documento
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Recuperar los datos guardados de la Base de Datos
    await cargarProyectosDesdeNube();
    
    // 2. Configurar eventos de los botones de visualización
    const botonesCarpeta = document.querySelectorAll(".btn-ver");
    botonesCarpeta.forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (usuarioActual === "") {
                e.preventDefault();
                alert("Acceso denegado: Por favor inicia sesión para visualizar los proyectos.");
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

    // 3. Configurar controles de administrador (Subir/Guardar/Eliminar)
    configurarControlesAdmin();
});

// =======================================================
// 2. PERSISTENCIA: CARGAR Y GUARDAR EN LA NUBE
// =======================================================

// Carga la información de la tabla SQL al entrar a la página
async function cargarProyectosDesdeNube() {
    const { data, error } = await clienteSupabase.from('proyectos').select('*');
    
    if (error) {
        console.error("Error cargando datos:", error.message);
        return;
    }

    if (data) {
        const cards = document.querySelectorAll('.week-card');
        data.forEach(proy => {
            const index = proy.id - 1; // La semana 1 es el índice 0
            if (cards[index]) {
                const card = cards[index];
                const parrafo = card.querySelector('p');
                const btnVer = card.querySelector('.btn-ver');

                // Actualizar descripción
                parrafo.innerText = proy.descripcion;

                // Si hay un archivo guardado, actualizar el botón
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

// Función central para guardar texto y links en la Base de Datos
async function guardarRegistroEnSQL(semana, descripcion, url = null, tipo = null, nombreArchivo = null) {
    const { error } = await clienteSupabase
        .from('proyectos')
        .upsert({ 
            id: semana, 
            descripcion: descripcion, 
            file_url: url, 
            file_type: tipo, 
            file_name: nombreArchivo 
        });

    if (error) {
        console.error("Error al guardar en SQL:", error.message);
    }
}

// =======================================================
// 3. LÓGICA DE ADMINISTRADOR (SUBIDAS REALES)
// =======================================================

function configurarControlesAdmin() {
    const uploadBtns = document.querySelectorAll(".btn-upload");
    const saveBtns = document.querySelectorAll(".btn-save");
    const editBtns = document.querySelectorAll(".btn-edit");
    const deleteBtns = document.querySelectorAll(".btn-delete");

    // Lógica para el botón SUBIR (Storage + Database)
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

                // 1. Subir el archivo físico al bucket de Supabase
                const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const filePath = `semana_${semana}/${Date.now()}_${nombreLimpio}`;

                const { data: uploadData, error: uploadError } = await clienteSupabase.storage
                    .from('portafolio')
                    .upload(filePath, file);

                if (uploadError) {
                    alert("Error al subir archivo: " + uploadError.message);
                    btn.innerHTML = originalBtnText;
                    return;
                }

                // 2. Obtener la URL pública del archivo subido
                const { data: urlData } = clienteSupabase.storage.from('portafolio').getPublicUrl(filePath);
                const publicUrl = urlData.publicUrl;

                // 3. Actualizar la tarjeta visualmente
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

                // 4. Guardar los datos en la tabla SQL para que no se borren
                await guardarRegistroEnSQL(semana, parrafo.innerText, publicUrl, fileType, file.name);

                btn.innerHTML = originalBtnText;
                alert(`✅ Semana ${semana}: Archivo guardado permanentemente en la nube.`);
            };
            fileInput.click();
        });
    });

    // Lógica para el botón GUARDAR (Solo texto)
    saveBtns.forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            const semana = index + 1;
            const card = btn.closest('.week-card');
            const parrafo = card.querySelector('p').innerText;
            const btnVer = card.querySelector('.btn-ver');
            
            await guardarRegistroEnSQL(
                semana, 
                parrafo, 
                btnVer.getAttribute('data-src'), 
                btnVer.getAttribute('data-type'), 
                "Archivo"
            );
            alert("💾 Cambios de texto sincronizados en la base de datos.");
        });
    });

    // Lógica para el botón MODIFICAR (Solo texto local)
    editBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest('.week-card');
            const parrafo = card.querySelector('p');
            const nuevoTexto = prompt("Modificar la descripción del proyecto:", parrafo.innerText);
            if (nuevoTexto) {
                parrafo.innerText = nuevoTexto;
                alert("📝 Texto cambiado. Recuerda pulsar 'Guardar' para subirlo a la nube.");
            }
        });
    });

    // Lógica para el botón ELIMINAR
    deleteBtns.forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            if (confirm("⚠️ ¿Estás seguro de eliminar este registro de la base de datos?")) {
                const semana = index + 1;
                const { error } = await clienteSupabase.from('proyectos').delete().eq('id', semana);
                if (!error) {
                    alert("🗑️ Registro borrado. La página se reiniciará.");
                    location.reload();
                }
            }
        });
    });
}

// =======================================================
// 4. AUTENTICACIÓN (LOGIN Y REGISTRO)
// =======================================================

async function validarLogin() {
    const userEmail = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");
    const loginBtnText = document.querySelectorAll(".login-btn span")[0]; 
    
    if (!userEmail || !pass) {
        mostrarMensajeUI(errorMsg, "Escribe tu correo y contraseña.", "error");
        return;
    }

    loginBtnText.innerText = "Verificando...";

    const { data, error } = await clienteSupabase.auth.signInWithPassword({
        email: userEmail,
        password: pass,
    });

    if (error) {
        mostrarMensajeUI(errorMsg, "Credenciales incorrectas.", "error");
        loginBtnText.innerText = "Ingresar al Portafolio";
    } else {
        usuarioActual = data.user.email === "admin@portafolio.com" ? "admin" : "user";
        actualizarInterfazPorRol();
        cerrarLoginModal();
        loginBtnText.innerText = "Ingresar al Portafolio";
    }
}

async function registrarUsuario() {
    const userEmail = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");

    if (!userEmail || pass.length < 6) {
        mostrarMensajeUI(errorMsg, "Contraseña mínima 6 caracteres.", "error");
        return;
    }

    const regBtnText = document.querySelectorAll(".login-btn span")[1]; 
    regBtnText.innerText = "Creando...";

    const { error } = await clienteSupabase.auth.signUp({
        email: userEmail,
        password: pass,
    });

    if (error) {
        mostrarMensajeUI(errorMsg, error.message, "error");
    } else {
        mostrarMensajeUI(errorMsg, "¡Cuenta creada! Ahora dale a 'Ingresar'.", "success");
    }
    regBtnText.innerText = "Crear Nueva Cuenta";
}

function actualizarInterfazPorRol() {
    const adminElements = document.querySelectorAll(".admin-controls");
    const btnAuthHeader = document.getElementById("text-auth-header");
    const btnAuthSidebar = document.getElementById("text-auth-sidebar"); // NUEVO PARA EL MÓVIL

    if (usuarioActual === "admin") {
        adminElements.forEach(el => el.style.display = "flex");
        btnAuthHeader.innerText = "Cerrar Sesión";
        if (btnAuthSidebar) btnAuthSidebar.innerText = "Cerrar Sesión"; // Actualiza en móvil
    } else {
        adminElements.forEach(el => el.style.display = "none");
        btnAuthHeader.innerText = "Cerrar Sesión (Usuario)";
        if (btnAuthSidebar) btnAuthSidebar.innerText = "Cerrar Sesión (Usuario)"; // Actualiza en móvil
    }

    document.querySelectorAll('.week-card').forEach(card => {
        card.style.filter = 'blur(0)';
        card.style.opacity = '1';
    });
}

async function cerrarSesion() {
    await clienteSupabase.auth.signOut();
    location.reload(); 
}

// =======================================================
// 5. FUNCIONES VISUALES (MODALES, MENSAJES, PARTÍCULAS)
// =======================================================

function abrirLogin() {
    if (usuarioActual !== "") { cerrarSesion(); return; }
    const overlay = document.getElementById("login-overlay");
    overlay.style.display = "flex";
    createParticles(); 
    setTimeout(() => { overlay.style.opacity = "1"; }, 10);

    // NUEVO: Cerrar el menú lateral en móvil al abrir el login
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
    const container = document.getElementById("preview-container");
    document.getElementById("preview-title").innerHTML = `<i class='fa-solid fa-file-lines'></i> ${titulo}`;
    
    container.innerHTML = tipo === "image" 
        ? `<img src="${url}" style="max-width:100%">` 
        : `<iframe src="${url}" width="100%" height="100%"></iframe>`;

    modal.style.display = "flex";
    setTimeout(() => { modal.style.opacity = "1"; }, 10);
}

function cerrarPreviewModal() {
    const modal = document.getElementById("preview-modal");
    modal.style.opacity = "0";
    setTimeout(() => { modal.style.display = "none"; }, 400);
}

function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    container.innerHTML = ''; 
    for (let i = 0; i < 30; i++) {
        let p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh'; 
        container.appendChild(p);
    }
}

// Lógica del menú lateral móvil
const sideBar = document.querySelector('.sidebar');
if (document.querySelector('.menu-icon')) {
    document.querySelector('.menu-icon').addEventListener("click", () => {
        sideBar.classList.remove("close-sidebar");
        sideBar.classList.add("open-sidebar");
    });
}
if (document.querySelector('.close-icon')) {
    document.querySelector('.close-icon').addEventListener("click", () => {
        sideBar.classList.remove("open-sidebar");
        sideBar.classList.add("close-sidebar");
    });
}
