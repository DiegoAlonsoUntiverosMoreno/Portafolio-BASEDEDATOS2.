// =======================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN (SCRIPT.JS ORIGINAL)
// =======================================================

if (typeof AOS !== 'undefined') {
    AOS.init();
}

// --- SISTEMA DE NOTIFICACIONES ANIMADAS (TOAST) ---
function showToast(mensaje, tipo = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    
    let iconClass = tipo === 'success' ? 'fa-circle-check' : 
                    tipo === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${mensaje}</span>`;
    container.appendChild(toast);
    
    // Forzar reflow para que corra la animación de entrada
    void toast.offsetWidth;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Borrar del DOM tras la animación
    }, 3000);
}

// TEMA: MODO CLARO (DÍA) POR DEFECTO
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const themeBtn = document.getElementById('theme-btn');
    const icon = themeBtn.querySelector('i');
    
    if (document.body.classList.contains('light-mode')) {
        icon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        icon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

// Cargar preferencia de tema al iniciar (Forzando Día si no hay datos guardados)
const themeLocal = localStorage.getItem('theme');
if (themeLocal === 'dark') {
    document.body.classList.remove('light-mode');
    const icon = document.getElementById('theme-btn')?.querySelector('i');
    if(icon) icon.className = 'fa-solid fa-sun';
} else {
    document.body.classList.add('light-mode');
    const icon = document.getElementById('theme-btn')?.querySelector('i');
    if(icon) icon.className = 'fa-solid fa-moon';
}

// --- FUNCIONALIDAD PANTALLA COMPLETA ---
function toggleFullScreenModal() {
    const previewCard = document.querySelector(".preview-card");
    const icon = document.querySelector(".btn-fullscreen-modal i");
    
    if (!document.fullscreenElement) {
        if (previewCard.requestFullscreen) { previewCard.requestFullscreen(); }
        else if (previewCard.webkitRequestFullscreen) { previewCard.webkitRequestFullscreen(); } // Safari
        icon.className = "fa-solid fa-compress";
    } else {
        if (document.exitFullscreen) { document.exitFullscreen(); }
        else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); } // Safari
        icon.className = "fa-solid fa-expand";
    }
}

// Restaurar icono si el usuario sale con la tecla ESC
document.addEventListener('fullscreenchange', () => {
    const icon = document.querySelector(".btn-fullscreen-modal i");
    if (!document.fullscreenElement && icon) {
        icon.className = "fa-solid fa-expand";
    }
});

// Llaves de conexión a Supabase
const supabaseUrl = 'https://oqhnftjqmhtolrchyisj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xaG5mdGpxbWh0b2xyY2h5aXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTcwMDIsImV4cCI6MjA5MjI3MzAwMn0.b3jM5GoyQlhjbuR3s0_HpcRDnWH37TOGIrIqjgE3mH4';
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

document.addEventListener("DOMContentLoaded", async () => {
    await cargarProyectosDesdeNube();
    
    // FUNCIONALIDAD DEL OJITO DE CONTRASEÑA
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('bx-hide');
            this.classList.toggle('bx-show');
        });
    }

    configurarControlesAdmin();
});

// =======================================================
// 2. PERSISTENCIA EN LA NUBE (MÚLTIPLES ARCHIVOS)
// =======================================================
async function cargarProyectosDesdeNube() {
    const { data, error } = await clienteSupabase.from('proyectos').select('*');
    if (error) { console.error("Error cargando datos:", error.message); return; }

    if (data) {
        data.forEach(proy => {
            const card = document.querySelector(`.week-card[data-semana="${proy.id}"]`);
            if (card) {
                const parrafo = card.querySelector('.desc-text');
                parrafo.innerText = proy.descripcion || "Aún no hay archivos subidos.";

                let archivos = [];
                if (proy.file_type === 'multiple' || (proy.file_url && proy.file_url.startsWith('['))) {
                    try { archivos = JSON.parse(proy.file_url); } catch(e) {}
                } else if (proy.file_url) {
                    archivos = [{ url: proy.file_url, type: proy.file_type, name: proy.file_name || 'Archivo' }];
                }

                card.dataset.archivos = JSON.stringify(archivos);
                renderArchivosUI(card, archivos);
            }
        });
    }
}

function renderArchivosUI(card, archivos) {
    const container = card.querySelector('.files-container');
    container.innerHTML = ''; 

    if (archivos.length === 0) {
        container.innerHTML = '<p style="font-size: 13px; color: gray; margin: 0;">Sin archivos subidos</p>';
        return;
    }

    archivos.forEach((file, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'file-wrapper';

        // 1. Lado Izquierdo (Clickeable para visualizar al instante)
        const leftDiv = document.createElement('div');
        leftDiv.className = 'file-left';
        leftDiv.title = "Visualizar Proyecto";
        leftDiv.onclick = () => abrirPreviewModal(file.type, file.url, file.name);
        
        const fileIcon = file.type === 'pdf' ? `<i class='fa-solid fa-file-pdf' style='color:#ef4444;'></i>` : `<i class='fa-regular fa-image' style='color:#3b82f6;'></i>`;
        leftDiv.innerHTML = `${fileIcon} <span>${file.name}</span>`;
        wrapper.appendChild(leftDiv);

        // 2. Lado Derecho (Botones de Acción Cuadrados)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'file-actions';

        // Botón Cuadrado: Visualizar / Expandir
        const btnView = document.createElement('button');
        btnView.className = 'btn-square';
        btnView.title = "Visualizar Proyecto";
        btnView.innerHTML = `<i class="bx bx-expand"></i>`;
        btnView.onclick = (e) => { e.stopPropagation(); abrirPreviewModal(file.type, file.url, file.name); };
        actionsDiv.appendChild(btnView);

        // Botón Cuadrado: Descargar Automáticamente (FORZANDO EL BLOB ORIGINAL)
        const btnDownload = document.createElement('button');
        btnDownload.className = 'btn-square';
        btnDownload.title = "Descargar Archivo";
        btnDownload.innerHTML = `<i class="bx bx-download"></i>`;
        
        if(card.getAttribute('data-semana') === "16") {
            btnDownload.style.borderColor = "#22c55e"; btnDownload.style.color = "#22c55e";
        }
        
        btnDownload.onclick = async (e) => {
            e.stopPropagation(); // Evita que se abra la vista previa
            try {
                // Animación de carga en el botón
                const originalIcon = btnDownload.innerHTML;
                btnDownload.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>'; 
                btnDownload.disabled = true;

                // 1. Extraemos la ruta exacta del archivo guardado en el bucket de Supabase
                const urlParts = file.url.split('/public/portafolio/');
                let blobData;

                if (urlParts.length > 1) {
                    const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
                    // Descarga pura usando la herramienta oficial de Supabase
                    const { data, error } = await clienteSupabase.storage.from('portafolio').download(filePath);
                    if (error) throw error;
                    blobData = data;
                } else {
                    // Método alternativo de emergencia
                    const response = await fetch(file.url);
                    blobData = await response.blob();
                }

                // 2. Convertimos la información cruda y forzamos la descarga segura en el navegador
                const blobUrl = window.URL.createObjectURL(blobData);
                const tempLink = document.createElement('a');
                tempLink.href = blobUrl;
                tempLink.download = file.name;
                document.body.appendChild(tempLink);
                tempLink.click(); // Dispara la ventana de descarga
                
                // 3. Limpiamos
                document.body.removeChild(tempLink);
                window.URL.revokeObjectURL(blobUrl);

                // Restauramos el botón
                btnDownload.innerHTML = originalIcon;
                btnDownload.disabled = false;
            } catch (error) {
                console.error("Error al descargar:", error);
                showToast("Error al descargar el archivo", "error");
                btnDownload.innerHTML = `<i class="bx bx-download"></i>`;
                btnDownload.disabled = false;
            }
        };
        actionsDiv.appendChild(btnDownload);

        // Botón Cuadrado: Eliminar individual (Solo Admin)
        if (usuarioActual === 'admin') {
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-square';
            btnDelete.style.borderColor = "rgba(239, 68, 68, 0.4)";
            btnDelete.style.color = "#ef4444";
            btnDelete.title = "Eliminar archivo";
            btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btnDelete.onclick = (e) => { e.stopPropagation(); eliminarArchivoEspecifico(card, index); };
            
            // Efecto hover rojo
            btnDelete.onmouseover = () => { btnDelete.style.background = "rgba(239, 68, 68, 0.1)"; btnDelete.style.borderColor = "#ef4444"; };
            btnDelete.onmouseout = () => { btnDelete.style.background = "transparent"; btnDelete.style.borderColor = "rgba(239, 68, 68, 0.4)"; };
            
            actionsDiv.appendChild(btnDelete);
        }

        wrapper.appendChild(actionsDiv);
        container.appendChild(wrapper);
    });
}

async function guardarRegistroEnSQL(semana, descripcion, url = null, tipo = null, nombreArchivo = null) {
    const { error } = await clienteSupabase.from('proyectos').upsert({ 
        id: semana, descripcion: descripcion, file_url: url, file_type: tipo, file_name: nombreArchivo 
    });
    if (error) console.error("Error SQL:", error.message);
}

async function eliminarArchivoEspecifico(card, index) {
    if (!confirm("⚠️ ¿Seguro que deseas eliminar este archivo?")) return;
    
    const semana = parseInt(card.getAttribute('data-semana'));
    let archivos = JSON.parse(card.dataset.archivos || '[]');
    
    archivos.splice(index, 1);
    card.dataset.archivos = JSON.stringify(archivos);

    const parrafo = card.querySelector('.desc-text');
    const nuevoJSON = archivos.length > 0 ? JSON.stringify(archivos) : null;
    const nuevoTipo = archivos.length > 0 ? 'multiple' : null;
    
    await guardarRegistroEnSQL(semana, parrafo.innerText, nuevoJSON, nuevoTipo, 'Varios');
    
    showToast("Archivo individual eliminado", "info");
    renderArchivosUI(card, archivos);
}

// =======================================================
// 3. CONTROLES DE ADMINISTRADOR (LOS 4 BOTONES FUNCIONALES)
// =======================================================
function configurarControlesAdmin() {
    const uploadBtns = document.querySelectorAll(".btn-upload");
    const saveBtns = document.querySelectorAll(".btn-save");
    const editBtns = document.querySelectorAll(".btn-edit");
    const deleteBtns = document.querySelectorAll(".btn-delete");

    // 1. BOTÓN SUBIR
    uploadBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest('.week-card');
            const semana = parseInt(card.getAttribute('data-semana'));

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*,application/pdf';

            fileInput.onchange = async e => {
                const file = e.target.files[0];
                if (!file) return;

                const originalBtnText = btn.innerHTML;
                btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Subiendo...";
                btn.disabled = true;

                const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const filePath = `semana_${semana}/${Date.now()}_${nombreLimpio}`;
                const { error: uploadError } = await clienteSupabase.storage.from('portafolio').upload(filePath, file);

                if (uploadError) {
                    showToast("Error al subir el archivo", "error");
                    btn.innerHTML = originalBtnText; btn.disabled = false; return;
                }

                const { data: urlData } = clienteSupabase.storage.from('portafolio').getPublicUrl(filePath);
                const publicUrl = urlData.publicUrl;
                const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
                
                let archivos = JSON.parse(card.dataset.archivos || '[]');
                archivos.push({ url: publicUrl, type: fileType, name: file.name });
                card.dataset.archivos = JSON.stringify(archivos);

                const parrafo = card.querySelector('.desc-text');
                await guardarRegistroEnSQL(semana, parrafo.innerText, JSON.stringify(archivos), 'multiple', 'Varios');

                renderArchivosUI(card, archivos);

                btn.innerHTML = originalBtnText;
                btn.disabled = false;
                showToast(`Archivo subido a la Semana ${semana}`, "success");
            };
            fileInput.click();
        });
    });

    // 2. BOTÓN MODIFICAR
    editBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            const card = btn.closest('.week-card');
            const parrafo = card.querySelector('.desc-text');
            const semana = parseInt(card.getAttribute('data-semana'));
            
            const nuevoTexto = prompt("Escribe la nueva descripción para esta semana:", parrafo.innerText);
            if (nuevoTexto !== null && nuevoTexto.trim() !== "") { 
                parrafo.innerText = nuevoTexto; 
                
                // Guarda los cambios de texto en la base de datos automáticamente
                const archivosJSON = card.dataset.archivos && card.dataset.archivos !== '[]' ? card.dataset.archivos : null;
                const tipoVal = archivosJSON ? 'multiple' : null;
                await guardarRegistroEnSQL(semana, nuevoTexto, archivosJSON, tipoVal, archivosJSON ? 'Varios' : null);
                
                showToast("Descripción modificada y guardada.", "info"); 
            }
        });
    });

    // 3. BOTÓN GUARDAR
    saveBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            const card = btn.closest('.week-card');
            const semana = parseInt(card.getAttribute('data-semana'));
            const parrafo = card.querySelector('.desc-text');
            
            const archivosJSON = card.dataset.archivos && card.dataset.archivos !== '[]' ? card.dataset.archivos : null;
            const tipoVal = archivosJSON ? 'multiple' : null;
            
            await guardarRegistroEnSQL(semana, parrafo.innerText, archivosJSON, tipoVal, archivosJSON ? 'Varios' : null);
            showToast(`¡Datos de la Semana ${semana} guardados!`, "success");
        });
    });

    // 4. BOTÓN ELIMINAR (RESET DE SEMANA)
    deleteBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            const card = btn.closest('.week-card');
            const semana = parseInt(card.getAttribute('data-semana'));
            
            if (confirm(`⚠️ ¿Estás seguro de que deseas ELIMINAR TODOS los datos de la Semana ${semana}?`)) {
                const { error } = await clienteSupabase.from('proyectos').delete().eq('id', semana);
                if (!error) {
                    card.querySelector('.desc-text').innerText = "Aún no hay archivos subidos.";
                    card.dataset.archivos = '[]';
                    renderArchivosUI(card, []);
                    showToast(`Datos de la Semana ${semana} eliminados.`, "error");
                } else {
                    showToast("Error al eliminar los datos.", "error");
                }
            }
        });
    });
}

// =======================================================
// 4. AUTENTICACIÓN SÓLO ADMINISTRADOR
// =======================================================
async function procesarAuth() {
    const userEmail = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");
    const btnText = document.getElementById("btn-auth-text"); 
    
    if (!userEmail || pass.length < 6) { 
        mostrarMensajeUI(errorMsg, "Ingresa credenciales válidas.", "error"); 
        return; 
    }

    const textoOriginal = btnText.innerText;
    btnText.innerText = "Verificando...";

    const { data, error } = await clienteSupabase.auth.signInWithPassword({ email: userEmail, password: pass });
    
    if (error) {
        mostrarMensajeUI(errorMsg, "Credenciales incorrectas o usuario no es admin.", "error");
    } else {
        usuarioActual = "admin";
        actualizarInterfazPorRol();
        cerrarLoginModal();
        showToast("¡Bienvenido Administrador!", "success");
    }
    
    btnText.innerText = textoOriginal;
}

function actualizarInterfazPorRol() {
    const adminElements = document.querySelectorAll(".admin-controls");
    const btnAuthHeader = document.getElementById("text-auth-header");
    const btnAuthSidebar = document.getElementById("text-auth-sidebar");

    if (usuarioActual === "admin") {
        adminElements.forEach(el => el.style.display = "flex");
        btnAuthHeader.innerText = "Cerrar Sesión";
        if (btnAuthSidebar) btnAuthSidebar.innerText = "Cerrar Sesión";
    } else {
        adminElements.forEach(el => el.style.display = "none");
        btnAuthHeader.innerText = "Iniciar Sesión";
        if (btnAuthSidebar) btnAuthSidebar.innerText = "Iniciar Sesión";
    }

    const cards = document.querySelectorAll('.week-card');
    cards.forEach(card => {
        let archivos = JSON.parse(card.dataset.archivos || '[]');
        renderArchivosUI(card, archivos);
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
    
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("login-error").style.display = "none";
    
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
    
    let finalUrl = url;
    if (tipo === "pdf") {
        // Parámetros mágicos que ocultan las barras negras estorbosas de Chrome/Edge
        finalUrl = url + "#toolbar=0&navpanes=0&scrollbar=0";
    }
    
    // Renderizamos instantáneo
    document.getElementById("preview-container").innerHTML = tipo === "image" 
        ? `<img src="${url}" style="max-width:100%; height:100%; object-fit:contain; border-radius:8px;">` 
        : `<iframe src="${finalUrl}" width="100%" height="100%" style="border-radius:8px;"></iframe>`;
    
    modal.style.display = "flex"; 
    
    // Zero-Lag: Usamos requestAnimationFrame para abrir el modal instantáneamente sin retrasos
    requestAnimationFrame(() => {
        modal.style.opacity = "1";
    });
}

function cerrarPreviewModal() {
    const modal = document.getElementById("preview-modal");
    
    // Si estaba en pantalla completa, salimos primero para evitar glitches
    if (document.fullscreenElement) {
        if (document.exitFullscreen) { document.exitFullscreen(); }
        else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
    }

    modal.style.opacity = "0"; 
    setTimeout(() => { modal.style.display = "none"; }, 300); // Animación más veloz
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

// ============================================================
//  6. CHATBOT MEJORADO — UNTIBOT PRO (EXPLICACIONES COMPLETAS)
// ============================================================

(function () {

    // ─── BASE DE CONOCIMIENTO ────────────────────────────────
    const SEMANAS_INFO = {
        1:  { 
            titulo: "Modelos Arquitecturas de Base de Datos",  
            tema: "Arquitectura Centralizada, Cliente-Servidor y Distribuida.",
            explicacion: "Una base de datos puede organizarse de distintas formas:\n\n• Centralizada: todo está en un solo servidor.\n• Cliente-Servidor: los usuarios (clientes) se conectan a un servidor.\n• Distribuida: la información está en varios servidores conectados.\n\n👉 Ejemplo: Google usa arquitectura distribuida."
        },
        2:  { 
            titulo: "Gestores de Base de Datos y Modelo E-R", 
            tema: "SGBD y modelo entidad-relación.",
            explicacion: "Un SGBD (Sistema Gestor de Base de Datos) permite crear y administrar datos.\n\nEl modelo E-R usa:\n• Entidades (Ej: Alumno)\n• Atributos (Nombre, Edad)\n• Relaciones (Alumno estudia Curso)\n\n👉 Es la base para diseñar bases de datos."
        },
        3:  { 
            titulo: "Diseño Relacional", 
            tema: "Modelo lógico y físico.",
            explicacion: "Aquí conviertes el modelo E-R en tablas reales.\n\n• PK (clave primaria): identifica registros.\n• FK (clave foránea): conecta tablas.\n\n👉 Ejemplo:\nTabla Alumno(id, nombre)\nTabla Curso(id, nombre)"
        },
        4:  { 
            titulo: "Normalización", 
            tema: "1FN, 2FN, 3FN.",
            explicacion: "La normalización elimina datos repetidos.\n\n• 1FN: datos atómicos.\n• 2FN: sin dependencias parciales.\n• 3FN: sin dependencias transitivas.\n\n👉 Evita redundancia y mejora rendimiento."
        },
        5:  { 
            titulo: "Funciones SQL", 
            tema: "COUNT, SUM, AVG.",
            explicacion: "Funciones para analizar datos:\n\n• COUNT(): cuenta registros\n• SUM(): suma valores\n• AVG(): promedio\n\n👉 Ejemplo:\nSELECT AVG(salario) FROM empleados;"
        },
        6:  { 
            titulo: "Subconsultas", 
            tema: "Consultas dentro de otras.",
            explicacion: "Una subconsulta es una consulta dentro de otra.\n\n👉 Ejemplo:\nSELECT nombre FROM alumnos WHERE id IN (SELECT id FROM notas);"
        },
        7:  { 
            titulo: "Consultas Complejas", 
            tema: "JOIN e índices.",
            explicacion: "Se combinan tablas usando JOIN.\n\n👉 Ejemplo:\nSELECT * FROM alumnos A JOIN cursos C ON A.id = C.id;\n\nLos índices mejoran la velocidad."
        },
        8:  { 
            titulo: "Examen Parcial", 
            tema: "Evaluación.",
            explicacion: "Semana de evaluación de conocimientos adquiridos."
        },
        9:  { 
            titulo: "Vistas", 
            tema: "Consultas guardadas.",
            explicacion: "Una vista es una consulta almacenada.\n\n👉 Ejemplo:\nCREATE VIEW vista_alumnos AS SELECT * FROM alumnos;"
        },
        10: { 
            titulo: "Stored Procedures", 
            tema: "Código reutilizable.",
            explicacion: "Procedimientos almacenados ejecutan lógica.\n\n👉 Ejemplo:\nCALL obtenerAlumnos();"
        },
        11: { 
            titulo: "Triggers", 
            tema: "Eventos automáticos.",
            explicacion: "Un trigger se ejecuta automáticamente.\n\n👉 Ejemplo:\nCuando insertas datos, guarda historial."
        },
        12: { 
            titulo: "Transacciones", 
            tema: "COMMIT y ROLLBACK.",
            explicacion: "Permiten controlar cambios.\n\n• COMMIT: guarda cambios\n• ROLLBACK: deshace cambios"
        },
        13: { 
            titulo: "Funciones", 
            tema: "Escalares.",
            explicacion: "Funciones que retornan valores.\n\n👉 Ejemplo:\nSELECT UPPER(nombre);"
        },
        14: { 
            titulo: "Cursores", 
            tema: "Recorrer datos.",
            explicacion: "Permiten recorrer registros uno por uno."
        },
        15: { 
            titulo: "Optimización", 
            tema: "Índices.",
            explicacion: "Mejora el rendimiento usando índices."
        },
        16: { 
            titulo: "Proyecto Final", 
            tema: "Integración total.",
            explicacion: "Aplicación completa de todo lo aprendido."
        }
    };

    // ─── HTML ────────────────────────────────────────────────
    const html = `
    <button id="chatbot-toggle"><i class="fa-solid fa-robot"></i></button>

    <div id="chatbot-window">
        <div id="chatbot-header">
            <h4>UntiBot 🤖</h4>
            <button id="chatbot-close">✖</button>
        </div>

        <div id="chatbot-messages"></div>

        <div id="chatbot-input-area">
            <input id="chatbot-input" placeholder="Ej: explica semana 4">
            <button id="chatbot-send">➤</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    const toggleBtn = document.getElementById('chatbot-toggle');
    const window_ = document.getElementById('chatbot-window');
    const closeBtn = document.getElementById('chatbot-close');
    const messages = document.getElementById('chatbot-messages');
    const input = document.getElementById('chatbot-input');
    const send = document.getElementById('chatbot-send');

    toggleBtn.onclick = () => window_.classList.toggle('open');
    closeBtn.onclick = () => window_.classList.remove('open');

    function addMsg(text, type) {
        const div = document.createElement('div');
        div.className = "msg " + type;
        div.innerHTML = text.replace(/\n/g, "<br>");
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    addMsg("Hola 👋 Soy UntiBot PRO. Escribe 'semana 1' o 'explica semana 4'", "bot");

    function detectarSemana(texto) {
        const match = texto.match(/(\d{1,2})/);
        if (match) {
            const n = parseInt(match[1]);
            if (n >= 1 && n <= 16) return n;
        }
        return null;
    }

    function responder(msg) {
        const texto = msg.toLowerCase();

        const semana = detectarSemana(texto);
        if (semana) {
            const data = SEMANAS_INFO[semana];

            return `
            📘 <b>Semana ${semana}: ${data.titulo}</b><br><br>
            ${data.explicacion}
            `;
        }

        if (texto.includes("normalizacion")) {
            return "📊 La normalización organiza datos para evitar redundancia.";
        }

        if (texto.includes("sql")) {
            return "🗄️ SQL sirve para consultar bases de datos.";
        }

        return "Escribe 'semana 1' o 'explica semana 5'.";
    }

    function enviar() {
        const text = input.value.trim();
        if (!text) return;

        addMsg(text, "user");
        const resp = responder(text);
        setTimeout(() => addMsg(resp, "bot"), 300);

        input.value = "";
    }

    send.onclick = enviar;
    input.addEventListener("keypress", e => {
        if (e.key === "Enter") enviar();
    });

})();
