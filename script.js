// =======================================================
// 1. CONFIGURACIÓN INICIAL
// =======================================================
if (typeof AOS !== 'undefined') {
    AOS.init();
}

// Tus llaves de conexión a Supabase
const supabaseUrl = 'https://trdqrgfnxljjjgufmyhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_pLZMEZPywb7Fie8XBNPsUA_MtcqAPpn';
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

// Se ejecuta al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    // CARGA REAL: Traer los datos de la base de datos al abrir la web
    await cargarDatosDesdeNube();
    
    // Configurar botones de ver proyecto (para usuarios normales y admin)
    const botonesVer = document.querySelectorAll(".btn-ver");
    botonesVer.forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (usuarioActual === "") {
                e.preventDefault();
                alert("Inicia sesión para ver los archivos.");
                abrirLogin(); 
            } else {
                if (btn.classList.contains("btn-preview")) {
                    abrirPreviewModal(
                        btn.getAttribute("data-type"), 
                        btn.getAttribute("data-src"), 
                        btn.getAttribute("data-title")
                    );
                } else {
                    alert("Aún no hay archivos subidos para esta semana.");
                }
            }
        });
    });

    configurarPanelAdmin();
});

// =======================================================
// 2. PERSISTENCIA (GUARDADO Y CARGA REAL EN SUPABASE)
// =======================================================

// Lee la base de datos y pinta las tarjetas
async function cargarDatosDesdeNube() {
    const { data, error } = await clienteSupabase.from('proyectos').select('*');
    
    if (error) {
        console.error("Error al conectar con la tabla:", error.message);
        return;
    }

    if (data) {
        const tarjetas = document.querySelectorAll('.week-card');
        data.forEach(item => {
            const index = item.id - 1; // Semana 1 es el índice 0
            if (tarjetas[index]) {
                const card = tarjetas[index];
                const btnVer = card.querySelector('.btn-ver');
                
                // Ponemos la descripción guardada
                card.querySelector('p').innerText = item.descripcion;

                // Si tiene archivo, activamos el botón de vista previa
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

// Activa las funciones de los botones del administrador
function configurarPanelAdmin() {
    const uploadBtns = document.querySelectorAll(".btn-upload");
    const saveBtns = document.querySelectorAll(".btn-save");
    const editBtns = document.querySelectorAll(".btn-edit");
    const deleteBtns = document.querySelectorAll(".btn-delete");

    // BOTÓN SUBIR (Sube a Storage y guarda en Database)
    uploadBtns.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            const semana = index + 1;
            const inputOculto = document.createElement('input');
            inputOculto.type = 'file';
            inputOculto.accept = 'application/pdf,image/*';

            inputOculto.onchange = async (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;

                const textoOriginal = btn.innerHTML;
                btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Subiendo...";

                // 1. SUBIR AL STORAGE
                // Limpiamos el nombre para evitar errores con espacios o tildes
                const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const rutaArchivo = `semana_${semana}/${Date.now()}_${nombreLimpio}`;
                
                const { data: storageData, error: storageError } = await clienteSupabase.storage
                    .from('portafolio')
                    .upload(rutaArchivo, archivo);

                if (storageError) {
                    alert("Error al subir archivo: " + storageError.message);
                    btn.innerHTML = textoOriginal;
                    return;
                }

                // 2. OBTENER URL PÚBLICA
                const { data: urlPublica } = clienteSupabase.storage
                    .from('portafolio')
                    .getPublicUrl(rutaArchivo);

                const urlFinal = urlPublica.publicUrl;
                const tipo = archivo.type === 'application/pdf' ? 'pdf' : 'image';

                // 3. GUARDAR EN LA BASE DE DATOS (UPSERT)
                const { error: dbError } = await clienteSupabase.from('proyectos').upsert({
                    id: semana,
                    descripcion: `Archivo cargado: ${archivo.name}`,
                    file_url: urlFinal,
                    file_type: tipo,
                    file_name: archivo.name
                });

                if (dbError) {
                    alert("Error al guardar registro: " + dbError.message);
                } else {
                    alert("¡Éxito! Archivo guardado permanentemente.");
                    location.reload(); // Recarga para mostrar los datos desde la nube
                }
                btn.innerHTML = textoOriginal;
            };
            inputOculto.click();
        });
    });

    // BOTÓN GUARDAR (Solo guarda el texto si lo modificaste)
    saveBtns.forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            const semana = index + 1;
            const card = btn.closest('.week-card');
            const descripcion = card.querySelector('p').innerText;

            const { error } = await clienteSupabase.from('proyectos').upsert({
                id: semana,
                descripcion: descripcion
            });

            if (error) {
                alert("Error al guardar texto: " + error.message);
            } else {
                alert("💾 Descripción guardada correctamente.");
            }
        });
    });

    // BOTÓN MODIFICAR (Cambia el texto en pantalla)
    editBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const p = btn.closest('.week-card').querySelector('p');
            const nuevo = prompt("Nueva descripción:", p.innerText);
            if (nuevo) {
                p.innerText = nuevo;
                alert("Texto cambiado. Haz clic en 'Guardar' para subirlo a la nube.");
            }
        });
    });

    // BOTÓN ELIMINAR (Borra el registro de la base de datos)
    deleteBtns.forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            if (confirm("⚠️ ¿Estás seguro de eliminar este proyecto?")) {
                const semana = index + 1;
                const { error } = await clienteSupabase.from('proyectos').delete().eq('id', semana);
                
                if (error) {
                    alert("Error al eliminar: " + error.message);
                } else {
                    alert("🗑️ Proyecto eliminado.");
                    location.reload();
                }
            }
        });
    });
}

// =======================================================
// 3. AUTENTICACIÓN (LOGIN Y REGISTRO)
// =======================================================

async function validarLogin() {
    const email = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");
    const loginBtnText = document.querySelectorAll(".login-btn span")[0];
    
    if (!email || !pass) {
        mostrarMensajeUI(errorMsg, "Llena todos los campos.", "error");
        return;
    }

    loginBtnText.innerText = "Verificando...";

    const { data, error } = await clienteSupabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        mostrarMensajeUI(errorMsg, "Credenciales incorrectas.", "error");
        loginBtnText.innerText = "Ingresar al Portafolio";
    } else {
        errorMsg.style.display = "none";
        usuarioActual = data.user.email === "admin@portafolio.com" ? "admin" : "user";
        actualizarUI();
        cerrarLoginModal();
        loginBtnText.innerText = "Ingresar al Portafolio";
    }
}

async function registrarUsuario() {
    const email = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");
    const regBtnText = document.querySelectorAll(".login-btn span")[1];

    if (!email || pass.length < 6) { 
        mostrarMensajeUI(errorMsg, "Contraseña mínima 6 caracteres.", "error");
        return; 
    }

    regBtnText.innerText = "Creando...";

    const { error } = await clienteSupabase.auth.signUp({ email, password: pass });

    if (error) {
        mostrarMensajeUI(errorMsg, error.message, "error");
    } else {
        mostrarMensajeUI(errorMsg, "¡Cuenta creada! Ya puedes ingresar.", "success");
    }
    regBtnText.innerText = "Crear Nueva Cuenta";
}

function actualizarUI() {
    const adminControles = document.querySelectorAll(".admin-controls");
    const btnHeader = document.getElementById("text-auth-header");
    const btnSidebar = document.getElementById("btn-auth-sidebar");

    if (usuarioActual === "admin") {
        adminControles.forEach(el => el.style.display = "flex");
        if(btnHeader) btnHeader.innerText = "Cerrar Sesión";
        if(btnSidebar) btnSidebar.innerHTML = "<i class='fa-solid fa-right-from-bracket'></i> Cerrar Sesión";
    } else {
        adminControles.forEach(el => el.style.display = "none");
        if(btnHeader) btnHeader.innerText = "Cerrar (Usuario)";
        if(btnSidebar) btnSidebar.innerHTML = "<i class='fa-solid fa-right-from-bracket'></i> Cerrar (Usuario)";
    }

    document.querySelectorAll('.week-card').forEach(c => {
        c.style.filter = 'blur(0)';
        c.style.opacity = '1';
    });
}

async function cerrarSesion() {
    await clienteSupabase.auth.signOut();
    location.reload();
}

// =======================================================
// 4. FUNCIONES VISUALES (MODALES Y EFECTOS)
// =======================================================

function mostrarMensajeUI(elemento, texto, tipo) {
    elemento.style.display = "block";
    elemento.style.color = tipo === "error" ? "#ff4d4d" : "#00d2ff";
    elemento.style.background = tipo === "error" ? "rgba(255, 77, 77, 0.15)" : "rgba(0, 210, 255, 0.1)";
    elemento.style.border = tipo === "error" ? "1px solid rgba(255, 77, 77, 0.4)" : "1px solid #00d2ff";
    elemento.innerHTML = tipo === "error" ? `<i class='bx bx-error-circle'></i> ${texto}` : `<i class='bx bx-check-circle'></i> ${texto}`;
}

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

function abrirPreviewModal(tipo, url, titulo) {
    const modal = document.getElementById("preview-modal");
    document.getElementById("preview-title").innerHTML = `<i class='fa-solid fa-file-lines'></i> ${titulo}`;
    const container = document.getElementById("preview-container");
    
    container.innerHTML = tipo === "image" 
        ? `<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;">` 
        : `<iframe src="${url}" width="100%" height="100%" style="border:none; background:white;"></iframe>`;

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
    for (let i = 0; i < 40; i++) {
        let p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh'; 
        p.style.animationDuration = (Math.random() * 4 + 2) + 's'; 
        p.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(p);
    }
}

// Menú lateral móvil
const menuIcon = document.querySelector('.menu-icon');
const closeIcon = document.querySelector('.close-icon');
const sideBar = document.querySelector('.sidebar');

if (menuIcon && sideBar) {
    menuIcon.onclick = () => { sideBar.classList.add("open-sidebar"); sideBar.classList.remove("close-sidebar"); };
}
if (closeIcon && sideBar) {
    closeIcon.onclick = () => { sideBar.classList.add("close-sidebar"); sideBar.classList.remove("open-sidebar"); };
}
const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
        if(sideBar) {
            sideBar.classList.add("close-sidebar");
            sideBar.classList.remove("open-sidebar");
        }
    });
});
