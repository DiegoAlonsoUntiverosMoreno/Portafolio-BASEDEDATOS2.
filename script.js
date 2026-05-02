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
//  6. CHATBOT IA — AÑADIDO E INTEGRADO (UNTIBOT)
// ============================================================

(function () {
    // ─── DATOS DE CADA SEMANA ────────────────────────────────
    const SEMANAS_INFO = {
        1:  { titulo: "Modelos Arquitecturas de Base de Datos",  tema: "Arquitectura Centralizada (todo en 1 servidor, punto único de fallo), Arquitectura Cliente-Servidor (Servidor aloja datos, Clientes piden y muestran) y Arquitectura Distribuida (nodos separados, alta disponibilidad y tolerancia a fallos)." },
        2:  { titulo: "Gestores de Base de Datos y Modelo Entidad-Relación", tema: "SGBD (Relacionales/SQL como SQL Server y No relacionales/NoSQL). Modelo E-R con Entidades (objetos), Atributos (características), Relaciones y Cardinalidades (1:1, 1:N, N:M)." },
        3:  { titulo: "Diseño de Arquitectura de Base de Datos y Modelado Relacional", tema: "Fases del diseño: Conceptual (Modelo E-R), Lógico (Modelado Relacional) y Físico (SQL Server). Modelado relacional abarca Tabla, Fila/Tupla, Columna, Clave Primaria (PK) y Clave Foránea (FK)." },
        4:  { titulo: "Tipos de Arquitectura de Base de Datos y Normalizacion", tema: "Tipos de arquitectura por distribución (Centralizada, Distribuida y en la Nube). Normalización: 1FN (Atomicidad), 2FN (Dependencia Funcional Completa a la PK) y 3FN (Sin dependencias transitivas)." },
        5:  { titulo: "Funciones de Agregación",   tema: "Uso de COUNT, SUM, AVG, MAX, MIN con GROUP BY y HAVING. Se generan reportes estadísticos y resúmenes de datos desde múltiples tablas." },
        6:  { titulo: "Subconsultas avanzadas",    tema: "Subconsultas correlacionadas, EXISTS, IN, ALL y ANY. Se construyen consultas anidadas para resolver problemas complejos de recuperación de datos." },
        7:  { titulo: "Consultas complejas",       tema: "Optimización de consultas T-SQL, uso de índices y análisis de planes de ejecución básicos para mejorar el rendimiento en SQL Server." },
        8:  { titulo: "Exámenes Parciales",        tema: "Semana de Exámenes Parciales de Base de Datos 2. Se evalúan todos los temas de la Unidad I y II." },
        9:  { titulo: "Subconsultas y Vistas",     tema: "Creación y uso de Vistas (CREATE VIEW) y subconsultas avanzadas. Las vistas permiten encapsular consultas complejas y reutilizarlas como tablas virtuales." },
        10: { titulo: "Procedimientos Almacenados",tema: "Stored Procedures con operaciones CRUD (INSERT, UPDATE, DELETE, SELECT). Se aprende a crear lógica de negocio directamente en el motor de base de datos." },
        11: { titulo: "Triggers DML",              tema: "Triggers de tipo AFTER INSERT, UPDATE y DELETE. Permiten ejecutar lógica automática ante cambios en los datos, ideal para auditoría y validaciones." },
        12: { titulo: "Transacciones y Errores",   tema: "Control de transacciones con BEGIN TRAN, COMMIT, ROLLBACK y manejo de errores con TRY/CATCH. Fundamental para garantizar la atomicidad de operaciones." },
        13: { titulo: "Funciones Escalares y de Tabla", tema: "Creación de funciones escalares que retornan un valor y funciones con valor de tabla (TVF) que retornan conjuntos de datos reutilizables en consultas." },
        14: { titulo: "Cursores",                  tema: "Cursores en T-SQL para recorrer registros uno a uno. Se aprende cuándo usarlos y sus alternativas más eficientes para procesamiento masivo de datos." },
        15: { titulo: "Optimización",              tema: "Planes de ejecución, índices clustered y non-clustered, estadísticas y mejoras de rendimiento en SQL Server. Se analiza cómo el motor procesa las consultas." },
        16: { titulo: "Proyecto Final",            tema: "Proyecto Final Sustentatorio de Base de Datos 2. Integración de todos los conceptos: diseño, normalización, stored procedures, triggers y optimización." },
    };

    const SYSTEM_PROMPT = `Eres UntiBot, el asistente IA del portafolio de Base de Datos 2 de Diego Alonso Untiveros Moreno, estudiante de la Universidad Peruana Los Andes (UPLA).

Tu personalidad: profesional pero amigable, entusiasta de las bases de datos, respondes SIEMPRE en español, eres conciso (máximo 3-4 oraciones por respuesta), usas emojis técnicos ocasionalmente (📊 🗄️ 🔑 ⚡ etc).

BASE DE CONOCIMIENTO TEÓRICO (UNIDAD I - SEMANAS 1 A 4):
Utiliza ESTA información exacta si el usuario pregunta sobre estos temas:

1. Modelos de Arquitectura de Base de Datos (Por Distribución):
- Arquitectura Centralizada: Todos los componentes del SGBD y datos residen en un servidor central. Ventajas: Simplicidad, Consistencia. Desventajas: Punto Único de Fallo (SPOF), Cuello de Botella.
- Arquitectura Cliente-Servidor: Servidor aloja la BD, múltiples Clientes envían peticiones. Ventajas: Reducción de tráfico, mejor distribución de carga. Desventajas: Depende de la red.
- Arquitectura Distribuida: Datos fragmentados en múltiples nodos geográficos. Ventajas: Alta Disponibilidad, Rendimiento Local. Desventajas: Complejidad extrema, Alto Costo.

2. Gestores de Base de Datos (SGBD) y Modelo Entidad-Relación (E-R):
- SGBD Relacionales (RDBMS): Tablas con relaciones estrictas (SQL Server, MySQL). No Relacionales (NoSQL): Flexibles (MongoDB).
- Modelo E-R (Peter Chen): Entidades (rectángulos), Atributos (óvalos), Relaciones (rombos). Cardinalidad: 1:1, 1:N, N:M.

3. Diseño de Arquitectura de Base de Datos y Modelado Relacional:
- Fases: Conceptual (E-R), Lógico (Relacional), Físico (Motor específico ej. SQL Server).
- Modelado Relacional (E.F. Codd): Tabla, Fila (Tupla), Columna (Atributo), PK (Primary Key), FK (Foreign Key).

4. Tipos de Arquitectura y Normalización:
- Normalización: Organizar datos para reducir redundancia e integridad.
- 1FN (Atomicidad): Valores atómicos, sin grupos repetitivos.
- 2FN (Dependencia Funcional Completa): Estar en 1FN y los atributos no clave dependen completamente de toda la PK.
- 3FN (Dependencia Transitiva): Estar en 2FN y ningún atributo no clave depende de otro no clave.

CONTENIDO DEL PORTAFOLIO - 16 semanas en 4 unidades:
${Object.entries(SEMANAS_INFO).map(([s, d]) => `• Semana ${s} - ${d.titulo}: ${d.tema}`).join('\n')}

INSTRUCCIONES CLAVE:
- Si el usuario menciona una semana específica (ej: "semana 5", "week 3", "s10"), explica su tema y di que puedes llevarlo ahí.
- Si preguntan por SQL, normalización, JOINs, stored procedures, triggers, transacciones, índices o cualquier tema de BD: responde con conocimiento técnico preciso basado en la información de arriba.
- Si preguntan quién es Diego: es estudiante de Ingeniería de Sistemas en UPLA, apasionado por el modelado y diseño de bases de datos con SQL Server.
- Si el mensaje es un saludo: saluda de vuelta y ofrece navegar al portafolio o explicar alguna semana.
- NUNCA inventes archivos subidos ni notas de examen.
- Sé RÁPIDO y DIRECTO. No uses markdown complejo, solo texto limpio con saltos de línea si es necesario.`;

    // ─── CONSTRUIR HTML DEL CHATBOT ──────────────────────────
    const html = `
    <button id="chatbot-toggle" title="Abrir Asistente IA">
        <i class="fa-solid fa-robot"></i>
        <span id="chatbot-badge">1</span>
    </button>

    <div id="chatbot-window">
        <div id="chatbot-header">
            <div class="chatbot-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="chatbot-header-info">
                <h4>UntiBot <span style="font-size:11px;color:#00d2ff;font-weight:400;">IA</span></h4>
                <p>● En línea · Responde al instante</p>
            </div>
            <button id="chatbot-close" title="Cerrar"><i class="bx bx-x"></i></button>
        </div>

        <div id="chatbot-messages"></div>

        <div id="chatbot-quick-chips">
            <button class="quick-chip" data-msg="¿Qué temas cubre este portafolio?">📚 Temas</button>
            <button class="quick-chip" data-msg="Llévame a la Semana 1">📍 Semana 1</button>
            <button class="quick-chip" data-msg="Explícame la Normalización de la Semana 4">🔗 Normalización</button>
            <button class="quick-chip" data-msg="¿Qué son los Stored Procedures?">⚙️ SP</button>
            <button class="quick-chip" data-msg="Llévame al Proyecto Final">🏆 Final</button>
            <button class="quick-chip" data-msg="¿Quién es Diego?">👤 Diego</button>
        </div>

        <div id="chatbot-input-area">
            <textarea id="chatbot-input" rows="1" placeholder="Escribe algo... (ej: Semana 4, qué es 1FN...)" maxlength="400"></textarea>
            <button id="chatbot-send" title="Enviar"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // ─── REFERENCIAS ─────────────────────────────────────────
    const toggleBtn   = document.getElementById('chatbot-toggle');
    const window_     = document.getElementById('chatbot-window');
    const closeBtn    = document.getElementById('chatbot-close');
    const messagesDiv = document.getElementById('chatbot-messages');
    const inputEl     = document.getElementById('chatbot-input');
    const sendBtn     = document.getElementById('chatbot-send');
    const badge       = document.getElementById('chatbot-badge');
    const chips       = document.querySelectorAll('.quick-chip');

    let isOpen    = false;
    let isLoading = false;
    let history   = []; // conversación para el API

    // ─── ABRIR / CERRAR ──────────────────────────────────────
    toggleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        window_.classList.toggle('open', isOpen);
        if (isOpen) {
            badge.style.display = 'none';
            if (messagesDiv.children.length === 0) addWelcomeMessage();
            setTimeout(() => inputEl.focus(), 400);
        }
    });
    closeBtn.addEventListener('click', () => {
        isOpen = false;
        window_.classList.remove('open');
    });

    // ─── MENSAJE DE BIENVENIDA ───────────────────────────────
    function addWelcomeMessage() {
        addBotMessage("¡Hola! 👋 Soy **UntiBot**, el asistente IA de este portafolio.\n\nPuedo explicarte cualquier tema de BD2 (como las arquitecturas de la Semana 1 o el Modelo E-R de la Semana 2), navegar a una sección específica o responder tus dudas sobre SQL Server. ¿Por dónde empezamos? 🗄️");
    }

    // ─── AÑADIR MENSAJES AL CHAT ─────────────────────────────
    function addBotMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-msg bot';
        div.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-bubble">${formatText(text)}</div>`;
        messagesDiv.appendChild(div);
        scrollBottom();
    }

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-msg user';
        div.innerHTML = `
            <div class="msg-bubble">${escapeHtml(text)}</div>
            <div class="msg-avatar"><i class="fa-solid fa-user"></i></div>`;
        messagesDiv.appendChild(div);
        scrollBottom();
    }

    function addTyping() {
        const div = document.createElement('div');
        div.className = 'chat-msg bot';
        div.id = 'chatbot-typing';
        div.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-bubble" style="padding:8px 14px;">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>`;
        messagesDiv.appendChild(div);
        scrollBottom();
    }

    function removeTyping() {
        const t = document.getElementById('chatbot-typing');
        if (t) t.remove();
    }

    // ─── FORMATO DE TEXTO ────────────────────────────────────
    function formatText(text) {
        return escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
    function escapeHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function scrollBottom() {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // ─── DETECTAR SEMANA EN EL MENSAJE ──────────────────────
    function detectarSemana(texto) {
        const lower = texto.toLowerCase();
        // "semana 10", "s10", "s-10", "week 10", "semana10"
        const match = lower.match(/(?:semana\s*|s[-\s]?|week\s*)(\d{1,2})/);
        if (match) {
            const n = parseInt(match[1]);
            if (n >= 1 && n <= 16) return n;
        }
        // "proyecto final" → semana 16
        if (lower.includes('proyecto final') || lower.includes('final sustentatorio')) return 16;
        // "examen parcial" → semana 8
        if (lower.includes('examen parcial') || lower.includes('parciales')) return 8;
        return null;
    }

    // ─── NAVEGAR A SEMANA ────────────────────────────────────
    function navegarASemana(num) {
        const card = document.querySelector(`.week-card[data-semana="${num}"]`);
        if (card) {
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Efecto visual temporal
                card.style.transition = 'box-shadow 0.4s, border-color 0.4s';
                card.style.boxShadow = '0 0 30px rgba(0, 210, 255, 0.5)';
                card.style.borderColor = '#00d2ff';
                setTimeout(() => {
                    card.style.boxShadow = '';
                    card.style.borderColor = '';
                }, 2500);
            }, 400);
        }
    }

    // ─── LLAMADA AL API DE GEMINI ─────────────────────────
    async function llamarAPI(mensajeUsuario) {
        history.push({ role: 'user', content: mensajeUsuario });

        // Filtrar el historial para asegurar estricta alternancia entre 'user' y 'model'.
        // Gemini rechaza (Error 400) si hay dos roles iguales seguidos.
        let validHistory = [];
        for (let i = 0; i < history.length; i++) {
            let msgRole = history[i].role === 'assistant' ? 'model' : 'user';
            
            if (validHistory.length === 0) {
                if (msgRole === 'user') {
                    validHistory.push({ role: msgRole, parts: [{ text: history[i].content }] });
                }
            } else {
                let lastMsg = validHistory[validHistory.length - 1];
                if (lastMsg.role !== msgRole) {
                    validHistory.push({ role: msgRole, parts: [{ text: history[i].content }] });
                } else {
                    // Si se envían 2 'user' seguidos, los unimos para evitar el error HTTP 400
                    lastMsg.parts[0].text += "\n\n" + history[i].content;
                }
            }
        }

        // Inyectamos todo el PROMPT de forma invisible solo en el primer mensaje que se manda.
        if (validHistory.length > 0 && validHistory[0].role === 'user') {
            let systemText = "INSTRUCCIONES DE SISTEMA (Obligatorio cumplir):\n" + SYSTEM_PROMPT + "\n\n---\n\nMENSAJE DEL USUARIO:\n";
            if (!validHistory[0].parts[0].text.startsWith("INSTRUCCIONES DE SISTEMA")) {
                 validHistory[0].parts[0].text = systemText + validHistory[0].parts[0].text;
            }
        }

        const apiKey = "AIzaSyAadZXXC69yzg03JEjaldnruseu9L9qaaU"; 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: validHistory
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                // 🔴 IMPRIME EL ERROR REAL EN LA CONSOLA (F12) PARA DEBUGGEAR
                console.error("❌ ERROR API GEMINI:", response.status, errText);
                throw new Error("HTTP " + response.status + ": " + errText);
            }

            const data = await response.json();
            const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!respuesta) throw new Error("Sin respuesta válida de Gemini.");

            history.push({ role: 'assistant', content: respuesta });
            if (history.length > 20) history = history.slice(-20); // Mantiene historial corto
            
            return respuesta;

        } catch (error) {
            console.error("❌ ERROR EN LLAMADA FETCH:", error);
            // IMPORTANTE: Quitamos el mensaje que falló para que el siguiente intento no colapse la alternancia
            history.pop(); 
            throw error;
        }
    }

    // ─── ENVIAR MENSAJE ──────────────────────────────────────
    async function enviarMensaje(texto) {
        texto = texto.trim();
        if (!texto || isLoading) return;

        isLoading = true;
        sendBtn.disabled = true;
        inputEl.value = '';
        inputEl.style.height = 'auto';

        addUserMessage(texto);

        // Detectar navegación
        const semana = detectarSemana(texto);
        if (semana) navegarASemana(semana);

        addTyping();

        try {
            const respuesta = await llamarAPI(texto);
            removeTyping();
            addBotMessage(respuesta);
        } catch (err) {
            removeTyping();
            addBotMessage('Ups, hubo un problema técnico. ¿Podrías intentar enviar de nuevo tu mensaje? 🔄');
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            inputEl.focus();
        }
    }

    // ─── EVENTOS ─────────────────────────────────────────────
    sendBtn.addEventListener('click', () => enviarMensaje(inputEl.value));

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensaje(inputEl.value);
        }
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
    });

    // Chips de acceso rápido
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            enviarMensaje(chip.dataset.msg);
        });
    });

})();
