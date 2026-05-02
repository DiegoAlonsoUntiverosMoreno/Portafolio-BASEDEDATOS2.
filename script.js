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
//  6. CHATBOT IA — UNTIBOT PRO (CONOCIMIENTO TOTAL BD2 - 16 SEMANAS)
// ============================================================

(function () {
    // ─── 1. INYECTAR HTML Y ESTILOS CSS (UI/UX PREMIUM) ────────
    const html = `
    <style>
        .btn-sugerencia { background: rgba(0, 210, 255, 0.1); border: 1px solid rgba(0, 210, 255, 0.3); color: #00d2ff; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; margin: 4px 4px 0 0; transition: all 0.3s ease; display: inline-block; font-family: 'Inter', sans-serif; }
        .btn-sugerencia:hover { background: #00d2ff; color: #000; box-shadow: 0 0 12px rgba(0,210,255,0.5); transform: translateY(-1px); }
        body.light-mode .btn-sugerencia { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
        body.light-mode .btn-sugerencia:hover { background: #3b82f6; color: #fff; box-shadow: 0 0 12px rgba(59,130,246,0.4); }
        
        .chat-header-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; font-size: 16px; transition: 0.2s; margin-left: 8px; display: flex; align-items: center; justify-content: center; height: 30px; width: 30px; border-radius: 50%; }
        .chat-header-btn:hover { color: #00d2ff; background: rgba(0,210,255,0.1); transform: scale(1.05); }
        body.light-mode .chat-header-btn:hover { color: #2563eb; background: rgba(37,99,235,0.1); }
        
        #chatbot-voice.active { color: #10b981; text-shadow: 0 0 8px rgba(16,185,129,0.5); }
        #chatbot-api-btn.active { color: #a855f7; text-shadow: 0 0 8px rgba(168,85,247,0.6); }
        #chatbot-timer.active { color: #f59e0b; font-weight: bold; font-family: 'JetBrains Mono', monospace; background: rgba(245,158,11,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.3); }

        .ia-explicacion { background: rgba(0, 210, 255, 0.05); border-left: 3px solid #00d2ff; padding: 10px 12px; margin-top: 10px; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; }
        body.light-mode .ia-explicacion { background: rgba(37, 99, 235, 0.05); border-left-color: #2563eb; }
        .ia-alerta { border-left-color: #ef4444 !important; background: rgba(239, 68, 68, 0.1) !important; color: #ef4444; font-weight: 500;}
        .ia-escudo { border-left-color: #eab308 !important; background: rgba(234, 179, 8, 0.1) !important; color: #eab308; }

        .ia-codigo { background: #0d1117; color: #c9d1d9; padding: 12px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; overflow-x: auto; border: 1px solid #30363d; margin-top: 8px; white-space: pre-wrap; }
        body.light-mode .ia-codigo { background: #1e293b; color: #e2e8f0; border-color: #475569; }
        .ia-codigo::-webkit-scrollbar { height: 6px; } .ia-codigo::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 3px; }

        .ascii-diagram { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #34d399; background: #000; padding: 12px; border-radius: 6px; white-space: pre; overflow-x: auto; border: 1px solid #064e3b; margin-top: 8px; line-height: 1.3;}
        body.light-mode .ascii-diagram { background: #0f172a; border-color: #1e293b; }

        .kanban-board { display: flex; gap: 8px; margin-top: 10px; font-size: 10px; overflow-x: auto; padding-bottom: 8px; }
        .kanban-col { flex: 1; min-width: 90px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 6px; border: 1px solid rgba(0,210,255,0.15); }
        .kanban-col h5 { margin: 0 0 8px 0; color: #00d2ff; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .kanban-card { background: rgba(0,0,0,0.6); padding: 6px; border-radius: 4px; margin-bottom: 6px; border-left: 2px solid #eab308; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        body.light-mode .kanban-col { background: rgba(0,0,0,0.02); border-color: #cbd5e1; }
        body.light-mode .kanban-col h5 { color: #2563eb; }
        body.light-mode .kanban-card { background: #fff; border: 1px solid #e2e8f0; border-left: 2px solid #eab308; }

        #chatbot-rpg-level { font-size: 10px; color: #eab308; font-weight: 700; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px;}
        #chatbot-header { cursor: grab; user-select: none; } #chatbot-header:active { cursor: grabbing; }
        #chatbot-window.api-mode { border-color: #a855f7 !important; box-shadow: 0 0 40px rgba(168,85,247,0.15) !important; }
        #chatbot-window.api-mode #chatbot-header { background: linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%) !important; border-bottom: 1px solid #a855f7 !important; }
        
        #self-destruct-overlay { position: fixed; inset: 0; background: rgba(239, 68, 68, 0.95); z-index: 9999999; display: none; flex-direction: column; justify-content: center; align-items: center; color: white; font-family: 'JetBrains Mono', monospace; text-align: center; animation: flashRed 0.5s infinite alternate; }
        @keyframes flashRed { from { background: rgba(220, 38, 38, 0.98); } to { background: rgba(153, 27, 27, 0.98); } }
    </style>

    <!-- Overlay Critico DBA -->
    <div id="self-destruct-overlay">
        <h1 style="font-size: 4vw; margin: 0; letter-spacing: 4px;">⚠️ PROTOCOLO DE SEGURIDAD ⚠️</h1>
        <p style="font-size: 1.5vw; margin-top: 15px; color: #fca5a5;">COMANDO 'DROP DATABASE' INTERCEPTADO</p>
        <p id="sd-countdown" style="font-size: 2vw; font-weight: bold; margin-top: 20px;">Restaurando Backup en: 3</p>
    </div>

    <!-- Botón Flotante -->
    <button id="chatbot-toggle">
        <i class="fa-solid fa-robot"></i>
        <div id="chatbot-badge">1</div>
    </button>

    <!-- Ventana Principal -->
    <div id="chatbot-window" style="touch-action: none;">
        <div id="chatbot-header">
            <div class="chatbot-avatar"><i class="fa-solid fa-server"></i></div>
            <div class="chatbot-header-info">
                <h4>UntiBot Core <span style="font-size: 9px; color: #10b981;">v2.1</span></h4>
                <div id="chatbot-rpg-level">Nivel 1: Estudiante [0/100 XP]</div>
            </div>
            <div style="margin-left: auto; display: flex; align-items: center; gap: 2px;">
                <span id="chatbot-timer" style="display: none;">25:00</span>
                <button id="chatbot-api-btn" class="chat-header-btn" title="Modo API REST (JSON)"><i class="fa-solid fa-network-wired"></i></button>
                <button id="chatbot-voice" class="chat-header-btn" title="Activar Voz Narrativa"><i class="fa-solid fa-volume-xmark"></i></button>
                <button id="chatbot-clear" class="chat-header-btn" title="Limpiar Memoria y Chat"><i class="fa-solid fa-broom"></i></button>
                <button id="chatbot-close" class="chat-header-btn" title="Cerrar Asistente">✖</button>
            </div>
        </div>

        <div id="chatbot-messages"></div>

        <div id="chatbot-quick-chips">
            <div class="quick-chip" onclick="enviarMensajeRapido('Semana 12')">📌 Semana 12</div>
            <div class="quick-chip" onclick="enviarMensajeRapido('Cifrar admin123')">🔐 Cifrar Clave</div>
            <div class="quick-chip" onclick="enviarMensajeRapido('Generar Scrum')">📋 Kanban</div>
        </div>

        <div id="chatbot-input-area">
            <input id="chatbot-input" placeholder="Pregunta, o di 'Semana 15'..." autocomplete="off">
            <button id="chatbot-send">➤</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // ─── 2. ESTADOS GLOBALES Y MEMORIA DE LA IA ────────────────
    const Estado = {
        temaMemoria: null,
        vozActivada: false,
        apiMode: false,
        preguntaExamen: null,
        modoEntrevista: false,
        userXP: 0,
        userLevel: 1,
        pomodoroInterval: null,
        timeRemaining: 1500,
        sfxContext: null
    };

    const RANKINGS = ["Estudiante", "Analista Junior", "Ingeniero UPLA", "Maestro T-SQL", "Arquitecto de Datos", "Dios del Backend"];

    // ─── 3. BASE DE CONOCIMIENTOS MASIVA (LAS 16 SEMANAS COMPLETAS) ───────────
    const DB_CONOCIMIENTO = {
        "conceptual": { 
            basico: `<b>El Modelo Conceptual</b> es la primera fase vital del diseño de bases de datos. Sirve para entender el negocio antes de tocar código usando Entidades, Atributos y Relaciones.`, 
            avanzado: `Se apoya en el Diagrama Entidad-Relación (E-R). Define la multiplicidad (1:N, N:M) y es el plano base que luego se transforma en el modelo relacional físico en SQL Server.` 
        },
        "arquitectura": { 
            basico: `<b>La Arquitectura</b> define cómo se estructuran los datos (Centralizada, Cliente-Servidor).`, 
            avanzado: `En la arquitectura Cliente-Servidor (SQL Server), el motor gestiona seguridad, concurrencia y almacenamiento, mientras que el cliente solo envía T-SQL.` 
        },
        "normalizacion": { 
            basico: `<b>La Normalización</b> es el proceso estructurado de eliminar redundancias en tablas relacionales.`, 
            avanzado: `Consiste en aplicar reglas estrictas: 1FN (atomicidad de datos), 2FN (dependencia completa de la Primary Key) y 3FN (sin dependencias transitivas). Previene anomalías transaccionales en el CRUD.` 
        },
        "llave": { 
            basico: `<b>Las Llaves (Keys)</b> mantienen la Integridad Referencial. La Primary Key (PK) es el ID, y la Foreign Key (FK) conecta tablas.`, 
            avanzado: `Las Foreign Keys impiden que existan "registros huérfanos", prohibiendo eliminar un dato primario si aún está enlazado a tablas secundarias.`
        },
        "integridad": { 
            basico: `<b>La Integridad de Datos</b> asegura la exactitud y consistencia de la base de datos en el tiempo.`, 
            avanzado: `Se divide en integridad de Dominio (Data types, Check Constraints), integridad de Entidad (PK) y Referencial (FK).` 
        },
        "join": { 
            basico: `<b>El comando JOIN</b> se utiliza para cruzar y unificar columnas de múltiples tablas conectadas.`, 
            avanzado: `INNER JOIN trae coincidencias exactas. LEFT JOIN garantiza que la tabla principal no pierda registros de consulta aunque no exista cruce en la tabla secundaria.`
        },
        "subconsulta": { 
            basico: `<b>Una Subconsulta</b> es una instrucción SELECT anidada dentro de otra consulta mayor.`, 
            avanzado: `Permiten filtrar (usando IN, EXISTS) datos basados en resultados calculados al vuelo. Pueden ser "correlacionadas" si dependen de variables de la consulta externa.`
        },
        "vista": { 
            basico: `<b>Una Vista (View)</b> es una tabla virtual creada a partir de una consulta SELECT predefinida y almacenada en el motor.`, 
            avanzado: `Aportan enorme seguridad al ocultar columnas sensibles a los usuarios, además de simplificar en el backend la lectura de múltiples JOINs complejos.`
        },
        "procedimiento": { 
            basico: `<b>Un Procedimiento Almacenado (Stored Procedure)</b> es una rutina T-SQL parametrizada y encapsulada en el servidor.`, 
            avanzado: `Son la mejor defensa existente contra ataques de Inyección SQL. Además, el motor cachea su plan de ejecución en la RAM, optimizando drásticamente el rendimiento transaccional.` 
        },
        "trigger": { 
            basico: `<b>Un Trigger (Disparador)</b> es un tipo de SP que se ejecuta <i>automáticamente</i> tras un INSERT, UPDATE o DELETE.`, 
            avanzado: `Utilizan tablas lógicas efímeras en memoria llamadas INSERTED y DELETED. Son esenciales para programar tablas de auditoría ("Logs") y validaciones de negocio estrictas.` 
        },
        "transaccion": { 
            basico: `<b>Las Transacciones</b> agrupan varias sentencias SQL en un solo bloque lógico de ejecución.`, 
            avanzado: `Garantizan el principio ACID. Se usan bloques TRY...CATCH: si todo va bien se usa COMMIT TRAN, si ocurre un fallo se lanza un ROLLBACK TRAN para deshacer todos los cambios y no corromper la BD.` 
        },
        "funcion": { 
            basico: `<b>Las Funciones (UDF)</b> encapsulan lógica en SQL, pero a diferencia de los procedimientos, siempre retornan un valor.`, 
            avanzado: `Existen Funciones Escalares (retornan 1 dato como texto o número) y Funciones de Tabla (retornan un conjunto de resultados que puede ser llamado en el FROM de una consulta principal).` 
        },
        "optimizacion": { 
            basico: `<b>La Optimización y Planes de Ejecución</b> es el proceso de analizar cómo SQL Server lee las tablas para hacer que las consultas "vuelen".`, 
            avanzado: `Implica la creación técnica de Índices. El Clustered Index ordena los datos físicamente en el disco (solo 1 por tabla). El Non-Clustered crea una estructura B-Tree de punteros ligeros para acelerar las búsquedas WHERE.` 
        },
        "plan": { 
            basico: `<b>Los Planes de Ejecución</b> son el mapa visual que SQL Server crea para ejecutar tu consulta.`, 
            avanzado: `Los leemos para detectar cuellos de botella como "Table Scans" y reemplazarlos por eficientes "Index Seeks".` 
        },
        "proyecto": { 
            basico: `<b>El Proyecto Final</b> consolida de forma práctica todo el conocimiento del semestre en una base de datos real.`, 
            avanzado: `Involucra diseñar la arquitectura E-R, normalizar, escribir los DDL/DML, y programar seguridad backend usando vistas, procedimientos almacenados y triggers de auditoría.` 
        },
        "examen": { 
            basico: `<b>La Semana de Exámenes</b> evalúa tus capacidades teóricas y prácticas.`, 
            avanzado: `Enfócate en dominar la Normalización de Datos, el diseño de integridad referencial, e interpretar y escribir consultas con INNER JOINs correctamente.` 
        }
    };

    const DB_EXAMEN = [
        { q: "¿Qué forma normal (1FN, 2FN o 3FN) exige que no existan dependencias transitivas?", a: "3fn" },
        { q: "¿Qué comando T-SQL se usa para deshacer una transacción y proteger la BD si hay error?", a: "rollback" },
        { q: "¿Qué cláusula se usa junto a GROUP BY para filtrar resultados agregados (ej. SUM > 100)?", a: "having" }
    ];

    const DB_ENTREVISTA = [
        { q: "¿Cuál es la diferencia de rendimiento entre un Clustered Index y un Non-Clustered Index?", keys: ["fisico", "físico", "disco", "puntero", "orden"] },
        { q: "¿Por qué deberíamos usar Procedimientos Almacenados en lugar de enviar sentencias SELECT crudas desde el Frontend (Java/C#)?", keys: ["inyeccion", "seguridad", "inyección", "cache", "rendimiento", "plan"] }
    ];

    // ─── 4. CONTROLADORES DE AUDIO (WEB AUDIO API) ─────────────
    function initAudio() { 
        if (!Estado.sfxContext) Estado.sfxContext = new (window.AudioContext || window.webkitAudioContext)(); 
        if (Estado.sfxContext.state === 'suspended') Estado.sfxContext.resume(); 
    }
    
    function playSFX(freq = 600, dur = 0.05, type = 'sine') {
        if (!Estado.vozActivada) return; 
        try {
            initAudio();
            const osc = Estado.sfxContext.createOscillator(); const gain = Estado.sfxContext.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, Estado.sfxContext.currentTime);
            gain.gain.setValueAtTime(0.05, Estado.sfxContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, Estado.sfxContext.currentTime + dur);
            osc.connect(gain); gain.connect(Estado.sfxContext.destination);
            osc.start(); osc.stop(Estado.sfxContext.currentTime + dur);
        } catch (e) {}
    }

    let typingTimer;
    function startTypingSFX() { if(Estado.vozActivada) typingTimer = setInterval(() => playSFX(400 + Math.random()*200, 0.03, 'square'), 120); }
    function stopTypingSFX() { clearInterval(typingTimer); playSFX(800, 0.1, 'triangle'); }

    function hablarIA(textoLimpio) {
        if (!Estado.vozActivada || !window.speechSynthesis) return;
        window.speechSynthesis.cancel(); 
        let textoParaVoz = textoLimpio.replace(/<[^>]+>/g, ' '); 
        let speech = new SpeechSynthesisUtterance(textoParaVoz);
        speech.lang = 'es-ES'; speech.rate = 1.15; window.speechSynthesis.speak(speech);
    }

    // ─── 5. LÓGICA DE INTERFAZ Y DRAGGABLE ─────────────────────
    const UI = {
        toggleBtn: document.getElementById('chatbot-toggle'),
        window: document.getElementById('chatbot-window'),
        header: document.getElementById('chatbot-header'),
        messages: document.getElementById('chatbot-messages'),
        input: document.getElementById('chatbot-input'),
        sendBtn: document.getElementById('chatbot-send'),
        badge: document.getElementById('chatbot-badge')
    };

    let dragState = { isDragging: false, currentX: 0, currentY: 0, initialX: 0, initialY: 0, xOffset: 0, yOffset: 0 };

    function bindDragEvents() {
        UI.header.addEventListener("mousedown", dragStart); document.addEventListener("mousemove", drag); document.addEventListener("mouseup", dragEnd);
        UI.header.addEventListener("touchstart", dragStart, {passive: true}); document.addEventListener("touchmove", drag, {passive: true}); document.addEventListener("touchend", dragEnd);
    }

    function dragStart(e) {
        if (e.target.closest('button')) return; 
        dragState.initialX = e.type === "touchstart" ? e.touches[0].clientX - dragState.xOffset : e.clientX - dragState.xOffset;
        dragState.initialY = e.type === "touchstart" ? e.touches[0].clientY - dragState.yOffset : e.clientY - dragState.yOffset;
        if (e.target === UI.header || UI.header.contains(e.target)) dragState.isDragging = true;
    }
    function drag(e) {
        if (dragState.isDragging) {
            e.preventDefault();
            dragState.currentX = e.type === "touchmove" ? e.touches[0].clientX - dragState.initialX : e.clientX - dragState.initialX;
            dragState.currentY = e.type === "touchmove" ? e.touches[0].clientY - dragState.initialY : e.clientY - dragState.initialY;
            dragState.xOffset = dragState.currentX; dragState.yOffset = dragState.currentY;
            UI.window.style.transform = `translate(${dragState.currentX}px, ${dragState.currentY}px) scale(1)`;
        }
    }
    function dragEnd() { dragState.isDragging = false; }
    bindDragEvents();

    UI.toggleBtn.onclick = () => {
        UI.window.classList.toggle('open'); UI.badge.style.display = 'none'; 
        if (UI.window.classList.contains('open')) {
            UI.input.focus(); 
            if(dragState.xOffset === 0 && dragState.yOffset === 0) UI.window.style.transform = "scale(1) translateY(0)"; 
        } else {
            UI.window.style.transform = "scale(0.85) translateY(20px)"; dragState.xOffset = 0; dragState.yOffset = 0;
        }
    };
    
    document.getElementById('chatbot-close').onclick = () => UI.toggleBtn.click();
    document.getElementById('chatbot-clear').onclick = () => { 
        UI.messages.innerHTML = ''; Estado.temaMemoria = null; Estado.preguntaExamen = null; Estado.modoEntrevista = false;
        renderMensaje("Caché limpiada. Sesión reiniciada. 🧹", "bot", false);
    };

    const apiBtn = document.getElementById('chatbot-api-btn');
    apiBtn.onclick = () => {
        Estado.apiMode = !Estado.apiMode;
        UI.window.classList.toggle('api-mode', Estado.apiMode); apiBtn.classList.toggle('active', Estado.apiMode);
        playSFX(Estado.apiMode ? 800 : 300, 0.1);
        renderMensaje(Estado.apiMode ? "🌐 <b>API REST (JSON) Activada.</b>" : "Modo Interfaz Gráfica restaurado.", "bot", false);
    };

    const voiceBtn = document.getElementById('chatbot-voice');
    voiceBtn.onclick = () => {
        Estado.vozActivada = !Estado.vozActivada;
        voiceBtn.classList.toggle('active', Estado.vozActivada);
        if (Estado.vozActivada) {
            initAudio(); voiceBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>'; hablarIA("Sistemas de audio y voz en línea.");
        } else {
            voiceBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>'; if(window.speechSynthesis) window.speechSynthesis.cancel();
        }
    };

    // ─── 6. HERRAMIENTAS AUXILIARES ─────────────────────────────
    function addXP(points) {
        Estado.userXP += points;
        if (Estado.userXP < 0) Estado.userXP = 0;
        if (Estado.userXP >= 100 && Estado.userLevel < 6) {
            Estado.userLevel++; Estado.userXP = 0;
            renderMensaje(`🌟 <b>¡LEVEL UP!</b> Ascenso a Nivel ${Estado.userLevel}: <b>${RANKINGS[Estado.userLevel-1]}</b>.`, "bot", false);
            playSFX(1000, 0.2); setTimeout(() => playSFX(1200, 0.4), 200);
        }
        document.getElementById('chatbot-rpg-level').innerText = `Nivel ${Estado.userLevel}: ${RANKINGS[Estado.userLevel-1]} [${Estado.userXP}/100 XP]`;
    }

    function cleanString(str) { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

    window.irASemanaBot = function(numSemana) {
        const card = document.querySelector(`.week-card[data-semana="${numSemana}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const oShadow = card.style.boxShadow; const oBorder = card.style.borderColor;
            card.style.boxShadow = '0 0 40px rgba(0, 210, 255, 0.9)'; card.style.borderColor = '#00d2ff';
            playSFX(700, 0.1);
            setTimeout(() => { card.style.boxShadow = oShadow; card.style.borderColor = oBorder; }, 3000);
        }
    };

    function generarRespuestaJSON(endpoint, dataObj) {
        return `<div class="ia-codigo">${JSON.stringify({ status: 200, endpoint: endpoint, data: dataObj }, null, 2)}</div>`;
    }

    // ─── 7. MOTOR NLP (A PRUEBA DE FALLOS / 16 SEMANAS) ─────────
    function processRequest(rawText) {
        try {
            const text = cleanString(rawText);
            const asksDeep = text.includes("fondo") || text.includes("ejemplo") || text.includes("detalle") || text.includes("explicame todo");
            
            let outHtml = ""; let outEndpoint = "/api/v1/chat"; let outData = {};

            // 🚨 1. AUTODESTRUCCIÓN
            if (text.includes("drop database")) {
                addXP(-100);
                const overlay = document.getElementById('self-destruct-overlay'); const countEl = document.getElementById('sd-countdown');
                overlay.style.display = 'flex'; let timer = 3;
                let sdInterval = setInterval(() => {
                    playSFX(200, 0.2, 'sawtooth'); timer--; countEl.innerText = `Restaurando Backup en: ${timer}`;
                    if (timer <= 0) {
                        clearInterval(sdInterval);
                        overlay.innerHTML = `<h1>SISTEMA SALVADO</h1><p>Backup desplegado. Comando bloqueado exitosamente.</p>`;
                        overlay.style.animation = "none"; overlay.style.background = "#10b981";
                        playSFX(600, 0.5); setTimeout(() => { overlay.style.display = 'none'; }, 2000);
                    }
                }, 1000);
                return `<div class="ia-explicacion ia-alerta">🚨 <b>¡ALERTA DE SEGURIDAD!</b> Intento de borrado masivo detectado. Anulando permisos y bloqueando IP...</div>`;
            }

            // 🔐 2. CIFRADOR HASH
            if (text.startsWith("cifrar ") || text.startsWith("encriptar ")) {
                addXP(15);
                let pswd = rawText.substring(7).trim();
                let hash = Array.from(pswd).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1e9+7, 2166136261).toString(16).padEnd(32, 'a0b1c2d3');
                outData = { action: "hash_generation", input: pswd, sha256_simulated: hash };
                outHtml = `🔐 <b>Motor Criptográfico (+15 XP):</b><br>Las contraseñas siempre deben hashearse en la BD. Aquí tienes una simulación:<br><div class="ia-codigo">Original: ${pswd}\nHash_Hex: ${hash}</div>`;
            }

            // 📋 3. TABLERO KANBAN
            else if (text.includes("generar scrum") || text.includes("tablero") || text.includes("kanban")) {
                addXP(25);
                const kbHtml = `<div class="kanban-board"><div class="kanban-col"><h5>Backlog</h5><div class="kanban-card">Diseño E-R</div><div class="kanban-card">Normalizar BD</div></div><div class="kanban-col"><h5>Doing</h5><div class="kanban-card">SPs de Login</div></div><div class="kanban-col"><h5>Done</h5><div class="kanban-card">Crear Repositorio</div></div></div>`;
                outData = { type: "kanban_board", status: "rendered" };
                outHtml = `📋 <b>Tablero Ágil Generado (+25 XP):</b><br>Ideal para organizar el proyecto final del curso:<br>${kbHtml}`;
            }

            // 💼 4. SIMULADOR DE ENTREVISTA 
            else if (Estado.modoEntrevista && Estado.preguntaExamen) {
                let correct = Estado.preguntaExamen.keys.some(k => text.includes(k));
                if (correct) { addXP(60); outHtml = `💼 <b>Reclutador:</b> ¡Excelente! Tienes muy claros los conceptos técnicos. Demuestras un nivel sólido (+60 XP).<br><i>Entrevista finalizada.</i>`; } 
                else { outHtml = `💼 <b>Reclutador:</b> No es la justificación técnica que esperábamos. Te sugiero repasar la teoría de Bases de Datos Relacionales.<br><i>Entrevista finalizada.</i>`; }
                outData = { interview_passed: correct }; Estado.modoEntrevista = false; Estado.preguntaExamen = null;
            }
            else if (text.includes("entrevistame") || text.includes("entrevista")) {
                Estado.preguntaExamen = DB_ENTREVISTA[Math.floor(Math.random() * DB_ENTREVISTA.length)];
                Estado.modoEntrevista = true; outData = { mode: "technical_interview", question: Estado.preguntaExamen.q };
                outHtml = `💼 <b>Simulador de Entrevista IT Activado:</b><br><div class="ia-explicacion">"Hola, postulas al rol de Backend Engineer. Responde de forma técnica: <br><br><b>${Estado.preguntaExamen.q}</b>"</div>`;
            }

            // 🎓 5. MODO EXAMEN NORMAL
            else if (Estado.preguntaExamen && !Estado.modoEntrevista) {
                let esCorrecto = text.includes(Estado.preguntaExamen.a);
                if (esCorrecto) { addXP(50); outHtml = `✅ <b>¡Correcto! (+50 XP)</b> ¿Seguimos estudiando?`; } 
                else { outHtml = `❌ <b>Incorrecto.</b> Respuesta esperada: <i>${Estado.preguntaExamen.a.toUpperCase()}</i>. ¡Inténtalo de nuevo!`; }
                outData = { is_correct: esCorrecto }; Estado.preguntaExamen = null;
            }
            else if (text.includes("evaluame") || text.includes("examen")) {
                Estado.preguntaExamen = DB_EXAMEN[Math.floor(Math.random() * DB_EXAMEN.length)];
                outData = { mode: "exam", question: Estado.preguntaExamen.q };
                outHtml = `🎓 <b>Evaluación Rápida Activada:</b><br><div class="ia-explicacion">❓ <i>${Estado.preguntaExamen.q}</i></div>`;
            }

            // 📌 6. LECTOR DINÁMICO DE SEMANAS (LA MAGIA DE LAS 16 SEMANAS)
            else if (text.match(/(?:semana|unidad|seman|sem)\s*(\d{1,2})/i)) {
                const matchRegex = text.match(/(?:semana|unidad|seman|sem)\s*(\d{1,2})/i);
                const numSemana = parseInt(matchRegex[1]);
                
                const card = document.querySelector(`.week-card[data-semana="${numSemana}"]`);
                outEndpoint = `/api/v1/semana/${numSemana}`;
                
                if (card) {
                    const tOrig = card.querySelector('h2')?.innerText.trim() || `Semana ${numSemana}`; 
                    const dOrig = card.querySelector('.desc-text')?.innerText.trim() || "Sin descripción.";
                    const txtAnalizar = cleanString(tOrig + " " + dOrig);
                    
                    let tDetectado = null;
                    for (const c in DB_CONOCIMIENTO) { 
                        if (txtAnalizar.includes(c)) { 
                            tDetectado = c; 
                            Estado.temaMemoria = c; 
                            break; 
                        } 
                    }

                    setTimeout(() => { window.irASemanaBot(numSemana); }, 200); // Teletransporte turbo rápido
                    
                    outHtml = `🚀 <b>Navegando a la Semana ${numSemana}...</b><br><br>📌 <b>Tema:</b> <i>"${dOrig}"</i>`;
                    outData = { action: "scroll_to_week", title: tOrig, description: dOrig };

                    // VERIFICACIÓN: Si la semana aún no tiene contenido subido
                    if (dOrig.toLowerCase().includes("aún no hay") || dOrig.toLowerCase().includes("aun no hay")) {
                        outHtml += `<br><br><div class="ia-explicacion ia-escudo">⏳ <b>Aviso:</b> El administrador (Diego) aún no ha subido los archivos y descripciones específicas para esta semana. ¡Vuelve pronto!</div>`;
                    } 
                    // Si tiene contenido y detectó un tema del Diccionario
                    else if (tDetectado) {
                        if (asksDeep) { 
                            outHtml += `<br><br><div class="ia-explicacion">🧠 <b>Análisis A Fondo:</b><br><br>${DB_CONOCIMIENTO[tDetectado].avanzado}</div>`; 
                            outData.knowledge = DB_CONOCIMIENTO[tDetectado].avanzado; 
                        } else { 
                            outHtml += `<br><br><div class="ia-explicacion">🧠 <b>Resumen Teórico:</b><br><br>${DB_CONOCIMIENTO[tDetectado].basico}</div><br><span style="font-size:11px; color:#9ca3af;">💡 Dime "explícalo a fondo" para más detalles.</span>`; 
                            outData.knowledge = DB_CONOCIMIENTO[tDetectado].basico; 
                        }
                    } 
                    // Si tiene contenido (ej. proyecto o examen) pero no cuadra exactamente
                    else {
                        outHtml += `<br><br><div class="ia-explicacion">🧠 <b>Análisis de la IA:</b><br>He resaltado la tarjeta en tu pantalla. Se trata de un módulo práctico o de evaluación. ¡Descarga los archivos para revisarlo!</div>`;
                    }
                } else { 
                    outData = { error: "Semana no encontrada" }; outHtml = `La <b>Semana ${numSemana}</b> no está estructurada en el portafolio (Recuerda que son 16).`; 
                }
            }

            // 📖 7. DETECCIÓN TEÓRICA DIRECTA (SIN DECIR SEMANA)
            else {
                let tDetectado = null;
                for (const c in DB_CONOCIMIENTO) { if (text.includes(c)) { tDetectado = c; Estado.temaMemoria = c; break; } }

                if (tDetectado || (asksDeep && Estado.temaMemoria)) {
                    const t = tDetectado ? tDetectado : Estado.temaMemoria; const data = DB_CONOCIMIENTO[t]; addXP(10); 
                    outEndpoint = `/api/v1/conceptos/${t}`;
                    if (asksDeep) { outData = { detail_level: "advanced", info: data.avanzado }; outHtml = `<div class="ia-explicacion">🧠 <b>A Fondo (${t.toUpperCase()}):</b><br><br>${data.avanzado}</div>`; } 
                    else { outData = { detail_level: "basic", info: data.basico }; outHtml = `(+10 XP):<br><div class="ia-explicacion">📖 <b>${t.toUpperCase()}:</b><br><br>${data.basico}</div><br><span style="font-size:11px; color:#9ca3af;">💡 Dime "explícalo a fondo" para más detalles.</span>`; }
                } 
                else if (text === "hola" || text === "menu" || text.includes("ayuda") || text === "inicio") {
                    outHtml = `¡Hola de nuevo! 🤖. Aquí tienes mis atajos principales:<br><br>
                        <button class="btn-sugerencia" onclick="enviarMensajeRapido('Semana 12')">📌 Ir a Semana 12</button>
                        <button class="btn-sugerencia" onclick="enviarMensajeRapido('Generar Scrum')">📋 Crear Tablero Ágil</button>
                        <button class="btn-sugerencia" onclick="enviarMensajeRapido('Entrevístame')">💼 Simular Entrevista IT</button>`;
                }
                else {
                    outEndpoint = "/api/v1/unrecognized"; outData = { error: "Command not found", input: rawText };
                    outHtml = `No reconocí ese comando en mi arquitectura base. ¿Por qué no intentas pedirme la <b>'Semana 15'</b>, un <b>'tablero scrum'</b> o decirme <b>'entrevístame'</b> para practicar SQL?`;
                }
            }

            return Estado.apiMode ? generarRespuestaJSON(outEndpoint, outData) : outHtml;

        } catch (error) {
            console.error("UntiBot Internal Error:", error);
            return `<div class="ia-explicacion ia-alerta">⚠️ <b>Fallo Interno:</b><br>Ocurrió un error procesando el comando. Intenta de nuevo.</div>`;
        }
    }

    // ─── 8. GESTOR DE MENSAJES Y RENDERING ─────────────────────
    function renderMensaje(textoHtml, tipo, reproducirVoz = true) {
        const div = document.createElement('div'); div.className = `chat-msg ${tipo}`;
        const avatarIcon = tipo === 'bot' ? '<i class="fa-solid fa-server"></i>' : '<i class="fa-solid fa-user-astronaut"></i>';
        div.innerHTML = `<div class="msg-avatar">${avatarIcon}</div><div class="msg-bubble">${textoHtml}</div>`;
        UI.messages.appendChild(div); UI.messages.scrollTop = UI.messages.scrollHeight;

        if (tipo === 'bot' && reproducirVoz && !Estado.apiMode) {
            let txtLectura = textoHtml;
            if (textoHtml.includes("SQL Dumper")) txtLectura = "Script generado exitosamente. Descarga iniciada.";
            if (textoHtml.includes("Traductor Text-to-SQL")) txtLectura = "Procesamiento NLP completado. Consulta generada en pantalla.";
            if (textoHtml.includes("Tablero Ágil")) txtLectura = "Tablero Kanban renderizado en la interfaz.";
            hablarIA(txtLectura);
        } else if (tipo === 'bot' && Estado.apiMode && reproducirVoz) {
            hablarIA("Objeto JSON generado en el cuerpo de la respuesta.");
        }
    }

    function mostrarEscribiendo() {
        const idTemp = 'typing-' + Date.now(); const div = document.createElement('div');
        div.className = `chat-msg bot`; div.id = idTemp;
        div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-server"></i></div><div class="msg-bubble" style="padding: 5px 14px;"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
        UI.messages.appendChild(div); UI.messages.scrollTop = UI.messages.scrollHeight; return idTemp;
    }

    window.enviarMensajeRapido = function(texto) { UI.input.value = texto; ejecutarEnvio(); };

    function ejecutarEnvio() {
        const text = UI.input.value.trim(); if (!text) return;
        UI.input.value = ""; initAudio(); renderMensaje(text, "user", false);
        UI.sendBtn.disabled = true; const typingId = mostrarEscribiendo();
        
        startTypingSFX(); 

        // TIEMPO DE RESPUESTA ACELERADO PARA MAYOR FLUIDEZ
        setTimeout(() => {
            stopTypingSFX(); 
            const typingEl = document.getElementById(typingId); if(typingEl) typingEl.remove(); 
            const respuesta = processRequest(text);
            renderMensaje(respuesta, "bot", true); UI.sendBtn.disabled = false;
        }, 500 + Math.random() * 200); 
    }

    UI.sendBtn.onclick = ejecutarEnvio;
    UI.input.addEventListener("keypress", e => { if (e.key === "Enter") ejecutarEnvio(); });

    // MENSAJE DE ARRANQUE Y PRESENTACIÓN ÉPICA
    setTimeout(() => {
        const introMsg = "Sistemas en línea... ⚙️<br><br><b>Saludos.</b> Soy <b>UntiBot Pro</b>, la Inteligencia Artificial Integrada desarrollada por <b>Diego Alonso</b> para este portafolio de <b>Base de Datos 2</b> (UPLA - 5to Ciclo).<br><br><b><u>RESUMEN DE CAPACIDADES:</u></b><br>📌 <b>Navegador Automatizado:</b> Dime qué semana buscar (ej. 'Semana 10') y te llevaré directo a ella analizando su contenido T-SQL.<br>🧠 <b>Tutor T-SQL Avanzado:</b> Cuento con una base de datos interna con todo el sílabo de BD2. Puedo explicar desde Normalización hasta Triggers y Vistas.<br>🛠️ <b>Herramientas de Desarrollador:</b> Simulo cifrados SHA-256, genero tableros Kanban Ágiles y puedo evaluar tus conocimientos técnicos.<br>🌐 <b>Modo Consumo API:</b> Activa el ícono de red en mi cabecera para ver mis respuestas estructuradas en puro formato JSON.<br><br>¿A qué semana viajamos hoy, Ingeniero?";
        renderMensaje(introMsg, "bot", false);
    }, 600);

})();
