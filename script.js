// =======================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
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
