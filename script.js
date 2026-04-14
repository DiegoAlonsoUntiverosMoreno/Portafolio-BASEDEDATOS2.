// =======================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// =======================================================
if (typeof AOS !== 'undefined') {
    AOS.init();
}

const supabaseUrl = 'https://trdqrgfnxljjjgufmyhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_pLZMEZPywb7Fie8XBNPsUA_MtcqAPpn';
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

document.addEventListener("DOMContentLoaded", async () => {
    await cargarDatosDesdeNube();
    
    document.querySelectorAll(".btn-ver").forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (usuarioActual === "") {
                e.preventDefault();
                alert("Acceso restringido: Por favor inicia sesión.");
                abrirLogin(); 
            } else if (btn.classList.contains("btn-preview")) {
                abrirPreviewModal(btn.getAttribute("data-type"), btn.getAttribute("data-src"), btn.getAttribute("data-title"));
            } else {
                alert("No hay archivos cargados para esta semana.");
            }
        });
    });

    configurarAccionesAdmin();
});

// =======================================================
// 2. PERSISTENCIA: LEER Y ESCRIBIR
// =======================================================

async function cargarDatosDesdeNube() {
    const { data, error } = await clienteSupabase.from('proyectos').select('*');
    if (error) return;

    if (data) {
        const tarjetas = document.querySelectorAll('.week-card');
        data.forEach(item => {
            const index = item.id - 1; 
            if (tarjetas[index]) {
                const card = tarjetas[index];
                const btnVer = card.querySelector('.btn-ver');
                card.querySelector('p').innerText = item.descripcion;

                if (item.file_url) {
                    btnVer.setAttribute('data-type', item.file_type);
                    btnVer.setAttribute('data-src', item.file_url);
                    btnVer.setAttribute('data-title', `Semana ${item.id} - ${item.file_name}`);
                    btnVer.classList.add('btn-preview');
                    btnVer.innerHTML = item.file_type === 'pdf' ? "<i class='fa-solid fa-file-pdf'></i> Ver PDF" : "<i class='fa-regular fa-image'></i> Ver Imagen";
                }
            }
        });
    }
}

function configurarAccionesAdmin() {
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

                // --- SOLUCIÓN AL ERROR "INVALID KEY" ---
                // Reemplazamos espacios, tildes y caracteres raros por guiones bajos
                const nombreLimpio = archivo.name
                    .normalize("NFD") // Separa las tildes de las letras
                    .replace(/[\u0300-\u036f]/g, "") // Borra las tildes
                    .replace(/[^a-zA-Z0-9.]/g, '_'); // Todo lo que no sea letra o número será '_'
                
                const ruta = `semana_${semana}/${Date.now()}_${nombreLimpio}`;
                
                // 1. Subir al Storage
                const { error: stError } = await clienteSupabase.storage
                    .from('portafolio')
                    .upload(ruta, archivo);

                if (stError) {
                    alert("Error Storage: " + stError.message);
                    btn.innerHTML = originalHTML;
                    return;
                }

                // 2. Obtener URL y guardar en Database
                const { data: urlData } = clienteSupabase.storage.from('portafolio').getPublicUrl(ruta);
                const { error: dbError } = await clienteSupabase.from('proyectos').upsert({
                    id: semana,
                    descripcion: `Archivo: ${archivo.name}`,
                    file_url: urlData.publicUrl,
                    file_type: archivo.type === 'application/pdf' ? 'pdf' : 'image',
                    file_name: archivo.name
                });

                if (dbError) alert("Error DB: " + dbError.message);
                else {
                    alert("✅ Guardado con éxito.");
                    location.reload();
                }
                btn.innerHTML = originalHTML;
            };
            input.click();
        });
    });

    // Botón Guardar (Texto)
    document.querySelectorAll(".btn-save").forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            const p = btn.closest('.week-card').querySelector('p').innerText;
            const { error } = await clienteSupabase.from('proyectos').upsert({
                id: index + 1,
                descripcion: p
            });
            if (!error) alert("Texto guardado.");
        });
    });

    // Botón Editar
    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const p = btn.closest('.week-card').querySelector('p');
            const n = prompt("Nueva descripción:", p.innerText);
            if (n) p.innerText = n;
        });
    });

    // Botón Eliminar
    document.querySelectorAll(".btn-delete").forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            if (confirm("¿Eliminar registro?")) {
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
        document.getElementById("login-error").style.display = "block";
    } else {
        usuarioActual = (data.user.email === "admin@portafolio.com") ? "admin" : "user";
        actualizarInterfaz();
        cerrarLoginModal();
    }
}

function actualizarInterfaz() {
    const esAdmin = (usuarioActual === "admin");
    document.querySelectorAll(".admin-controls").forEach(el => el.style.display = esAdmin ? "flex" : "none");
    document.getElementById("text-auth-header").innerText = esAdmin ? "Cerrar Sesión" : "Cerrar (User)";
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
// 4. FUNCIONES DE UI (MODALES)
// =======================================================

function abrirLogin() {
    if (usuarioActual !== "") { cerrarSesion(); return; }
    document.getElementById("login-overlay").style.display = "flex";
    createParticles();
    setTimeout(() => { document.getElementById("login-overlay").style.opacity = "1"; }, 10);
}

function cerrarLoginModal() {
    document.getElementById("login-overlay").style.opacity = "0";
    setTimeout(() => { document.getElementById("login-overlay").style.display = "none"; }, 600);
}

function abrirPreviewModal(tipo, url, titulo) {
    const modal = document.getElementById("preview-modal");
    document.getElementById("preview-title").innerHTML = `<i class='fa-solid fa-file-circle-check'></i> ${titulo}`;
    const container = document.getElementById("preview-container");
    container.innerHTML = tipo === "image" ? `<img src="${url}" style="max-width:100%">` : `<iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>`;
    modal.style.display = "flex";
    setTimeout(() => { modal.style.opacity = "1"; }, 10);
}

function cerrarPreviewModal() {
    document.getElementById("preview-modal").style.opacity = "0";
    setTimeout(() => { document.getElementById("preview-modal").style.display = "none"; }, 400);
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

// Menú móvil
const menuIcon = document.querySelector('.menu-icon');
const sideBar = document.querySelector('.sidebar');
if (menuIcon) menuIcon.onclick = () => sideBar.classList.add("open-sidebar");
if (document.querySelector('.close-icon')) document.querySelector('.close-icon').onclick = () => sideBar.classList.remove("open-sidebar");
