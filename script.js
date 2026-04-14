// =======================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// =======================================================
if (typeof AOS !== 'undefined') {
    AOS.init();
}

// Configuración de conexión (Tus credenciales de Supabase)
const supabaseUrl = 'https://trdqrgfnxljjjgufmyhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_pLZMEZPywb7Fie8XBNPsUA_MtcqAPpn';
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

// Se ejecuta apenas carga la página
document.addEventListener("DOMContentLoaded", async () => {
    // CARGAR DATOS: Traer lo guardado en la base de datos
    await cargarDatosDesdeNube();
    
    // Configurar eventos para ver archivos (usuarios y admin)
    document.querySelectorAll(".btn-ver").forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (usuarioActual === "") {
                e.preventDefault();
                alert("Acceso restringido: Por favor inicia sesión.");
                abrirLogin(); 
            } else if (btn.classList.contains("btn-preview")) {
                abrirPreviewModal(
                    btn.getAttribute("data-type"), 
                    btn.getAttribute("data-src"), 
                    btn.getAttribute("data-title")
                );
            } else {
                alert("No hay archivos cargados para esta semana.");
            }
        });
    });

    configurarAccionesAdmin();
});

// =======================================================
// 2. PERSISTENCIA: LEER Y ESCRIBIR EN LA NUBE
// =======================================================

async function cargarDatosDesdeNube() {
    const { data, error } = await clienteSupabase.from('proyectos').select('*');
    
    if (error) {
        console.error("Error al conectar:", error.message);
        return;
    }

    if (data) {
        const tarjetas = document.querySelectorAll('.week-card');
        data.forEach(item => {
            const index = item.id - 1; 
            if (tarjetas[index]) {
                const card = tarjetas[index];
                const btnVer = card.querySelector('.btn-ver');
                
                // Actualizar texto descriptivo
                card.querySelector('p').innerText = item.descripcion;

                // Si hay un archivo (PDF/IMG), activar el botón de vista previa
                if (item.file_url) {
                    btnVer.setAttribute('data-type', item.file_type);
                    btnVer.setAttribute('data-src', item.file_url);
                    btnVer.setAttribute('data-title', `Semana ${item.id} - ${item.file_name}`);
                    btnVer.classList.add('btn-preview');
                    btnVer.innerHTML = item.file_type === 'pdf' 
                        ? "<i class='fa-solid fa-file-pdf'></i> Ver PDF" 
                        : "<i class='fa-regular fa-image'></i> Ver Imagen";
                }
            }
        });
    }
}

function configurarAccionesAdmin() {
    // BOTÓN SUBIR (Storage + Database)
    document.querySelectorAll(".btn-upload").forEach((btn, index) => {
        btn.addEventListener("click", () => {
            if (usuarioActual !== "admin") return;
            
            const semana = index + 1;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf,image/*';

            input.onchange = async (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;

                const originalHTML = btn.innerHTML;
                btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";

                // 1. Subir al Storage (Bucket: portafolio)
                const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const ruta = `semana_${semana}/${Date.now()}_${nombreLimpio}`;
                
                const { error: stError } = await clienteSupabase.storage
                    .from('portafolio')
                    .upload(ruta, archivo);

                if (stError) {
                    alert("Error Storage: " + stError.message);
                    btn.innerHTML = originalHTML;
                    return;
                }

                // 2. Obtener URL y guardar en Tabla 'proyectos'
                const { data: urlData } = clienteSupabase.storage.from('portafolio').getPublicUrl(ruta);
                const { error: dbError } = await clienteSupabase.from('proyectos').upsert({
                    id: semana,
                    descripcion: `Proyecto: ${archivo.name}`,
                    file_url: urlData.publicUrl,
                    file_type: archivo.type === 'application/pdf' ? 'pdf' : 'image',
                    file_name: archivo.name
                });

                if (dbError) alert("Error DB: " + dbError.message);
                else {
                    alert("✅ Guardado permanentemente en la nube.");
                    location.reload();
                }
                btn.innerHTML = originalHTML;
            };
            input.click();
        });
    });

    // BOTÓN GUARDAR (Solo texto)
    document.querySelectorAll(".btn-save").forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            const p = btn.closest('.week-card').querySelector('p').innerText;
            const { error } = await clienteSupabase.from('proyectos').upsert({
                id: index + 1,
                descripcion: p
            });
            if (!error) alert("Texto sincronizado.");
        });
    });

    // BOTÓN EDITAR (Cambio local de texto)
    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const p = btn.closest('.week-card').querySelector('p');
            const n = prompt("Nueva descripción:", p.innerText);
            if (n) p.innerText = n;
        });
    });

    // BOTÓN ELIMINAR
    document.querySelectorAll(".btn-delete").forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            if (confirm("¿Eliminar registro de la base de datos?")) {
                await clienteSupabase.from('proyectos').delete().eq('id', index + 1);
                location.reload();
            }
        });
    });
}

// =======================================================
// 3. AUTENTICACIÓN
// =======================================================

async function validarLogin() {
    const email = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    
    const { data, error } = await clienteSupabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        const errDiv = document.getElementById("login-error");
        errDiv.style.display = "block";
        errDiv.innerText = "Error: Credenciales inválidas.";
    } else {
        usuarioActual = (data.user.email === "admin@portafolio.com") ? "admin" : "user";
        actualizarInterfaz();
        cerrarLoginModal();
    }
}

function actualizarInterfaz() {
    const esAdmin = (usuarioActual === "admin");
    
    // Mostrar u ocultar controles de edición
    document.querySelectorAll(".admin-controls").forEach(el => {
        el.style.display = esAdmin ? "flex" : "none";
    });

    // Actualizar botones de navegación
    const btnHeader = document.getElementById("text-auth-header");
    if (btnHeader) btnHeader.innerText = esAdmin ? "Cerrar Sesión (Admin)" : "Cerrar Sesión";

    // Quitar desenfoque de las tarjetas
    document.querySelectorAll('.week-card').forEach(card => {
        card.style.filter = 'blur(0)';
        card.style.opacity = '1';
    });
}

async function registrarUsuario() {
    const email = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    const { error } = await clienteSupabase.auth.signUp({ email, password: pass });
    if (error) alert(error.message);
    else alert("Cuenta creada. Ahora intenta ingresar.");
}

async function cerrarSesion() {
    await clienteSupabase.auth.signOut();
    location.reload();
}

// =======================================================
// 4. FUNCIONES DE MODALES Y UI
// =======================================================

function abrirLogin() {
    if (usuarioActual !== "") { cerrarSesion(); return; }
    const overlay = document.getElementById("login-overlay");
    overlay.style.display = "flex";
    createParticles();
    setTimeout(() => { overlay.style.opacity = "1"; }, 10);
}

function cerrarLoginModal() {
    const overlay = document.getElementById("login-overlay");
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.style.display = "none"; }, 600);
}

function abrirPreviewModal(tipo, url, titulo) {
    const modal = document.getElementById("preview-modal");
    const container = document.getElementById("preview-container");
    document.getElementById("preview-title").innerHTML = `<i class='fa-solid fa-file-circle-check'></i> ${titulo}`;
    
    container.innerHTML = tipo === "image" 
        ? `<img src="${url}" style="max-width:100%; height:auto;">` 
        : `<iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>`;

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

// Menú Móvil
const menuIcon = document.querySelector('.menu-icon');
const closeIcon = document.querySelector('.close-icon');
const sideBar = document.querySelector('.sidebar');

if (menuIcon && sideBar) {
    menuIcon.onclick = () => { sideBar.classList.add("open-sidebar"); sideBar.classList.remove("close-sidebar"); };
}
if (closeIcon && sideBar) {
    closeIcon.onclick = () => { sideBar.classList.add("close-sidebar"); sideBar.classList.remove("open-sidebar"); };
}
