if (typeof AOS !== 'undefined') AOS.init();

const supabaseUrl = 'https://trdqrgfnxljjjgufmyhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_pLZMEZPywb7Fie8XBNPsUA_MtcqAPpn';
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let usuarioActual = ""; 

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cargar datos de la nube inmediatamente
    await cargarDatosDesdeNube();
    
    // 2. Botones de Ver Proyecto
    document.querySelectorAll(".btn-ver").forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (usuarioActual === "") {
                alert("Por favor, inicia sesión para ver los contenidos.");
                abrirLogin(); 
            } else if (btn.classList.contains("btn-preview")) {
                abrirPreviewModal(btn.getAttribute("data-type"), btn.getAttribute("data-src"), btn.getAttribute("data-title"));
            } else {
                alert("Esta semana aún no tiene archivos cargados.");
            }
        });
    });

    configurarPanelAdmin();
});

async function cargarDatosDesdeNube() {
    const { data, error } = await clienteSupabase.from('proyectos').select('*');
    if (error) return;
    if (data) {
        const tarjetas = document.querySelectorAll('.week-card');
        data.forEach(item => {
            const card = tarjetas[item.id - 1];
            if (card) {
                card.querySelector('p').innerText = item.descripcion;
                if (item.file_url) {
                    const btn = card.querySelector('.btn-ver');
                    btn.setAttribute('data-type', item.file_type);
                    btn.setAttribute('data-src', item.file_url);
                    btn.setAttribute('data-title', `Semana ${item.id} - ${item.file_name}`);
                    btn.classList.add('btn-preview');
                    btn.innerHTML = item.file_type === 'pdf' ? "<i class='fa-solid fa-file-pdf'></i> Ver PDF" : "<i class='fa-regular fa-image'></i> Ver Imagen";
                }
            }
        });
    }
}

function configurarPanelAdmin() {
    // LÓGICA DE SUBIDA (Solo funcionará si el token es de Admin)
    document.querySelectorAll(".btn-upload").forEach((btn, index) => {
        btn.addEventListener("click", () => {
            if (usuarioActual !== "admin") {
                alert("Acceso denegado: Solo el administrador puede subir archivos.");
                return;
            }
            const semana = index + 1;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf,image/*';
            input.onchange = async (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;
                
                btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";
                const ruta = `semana_${semana}/${Date.now()}_${archivo.name}`;
                
                const { error: stError } = await clienteSupabase.storage.from('portafolio').upload(ruta, archivo);
                if (stError) { alert("Error: " + stError.message); btn.innerHTML = "Subir"; return; }

                const { data: urlData } = clienteSupabase.storage.from('portafolio').getPublicUrl(ruta);
                const { error: dbError } = await clienteSupabase.from('proyectos').upsert({
                    id: semana,
                    descripcion: `Proyecto: ${archivo.name}`,
                    file_url: urlData.publicUrl,
                    file_type: archivo.type === 'application/pdf' ? 'pdf' : 'image',
                    file_name: archivo.name
                });

                if (dbError) alert("Error DB: " + dbError.message);
                else location.reload();
            };
            input.click();
        });
    });

    // BOTÓN GUARDAR TEXTO
    document.querySelectorAll(".btn-save").forEach((btn, index) => {
        btn.addEventListener("click", async () => {
            const p = btn.closest('.week-card').querySelector('p');
            const { error } = await clienteSupabase.from('proyectos').upsert({ id: index + 1, descripcion: p.innerText });
            if (error) alert("Error: " + error.message);
            else alert("Guardado.");
        });
    });

    // BOTÓN MODIFICAR (Visual)
    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const p = btn.closest('.week-card').querySelector('p');
            const n = prompt("Nueva descripción:", p.innerText);
            if (n) p.innerText = n;
        });
    });
}

async function validarLogin() {
    const email = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const { data, error } = await clienteSupabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        document.getElementById("login-error").style.display = "block";
    } else {
        usuarioActual = (data.user.email === "admin@portafolio.com") ? "admin" : "user";
        actualizarUI();
        cerrarLoginModal();
    }
}

function actualizarUI() {
    const esAdmin = (usuarioActual === "admin");
    document.querySelectorAll(".admin-controls").forEach(el => el.style.display = esAdmin ? "flex" : "none");
    document.getElementById("text-auth-header").innerText = esAdmin ? "Cerrar Sesión" : "Cerrar (User)";
    document.querySelectorAll('.week-card').forEach(c => { c.style.filter = 'blur(0)'; c.style.opacity = '1'; });
}

async function registrarUsuario() {
    const email = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    const { error } = await clienteSupabase.auth.signUp({ email, password: pass });
    alert(error ? error.message : "Cuenta creada. Ya puedes ingresar.");
}

function abrirLogin() {
    if (usuarioActual !== "") { location.reload(); return; }
    document.getElementById("login-overlay").style.display = "flex";
    setTimeout(() => { document.getElementById("login-overlay").style.opacity = "1"; }, 10);
}

function cerrarLoginModal() {
    document.getElementById("login-overlay").style.opacity = "0";
    setTimeout(() => { document.getElementById("login-overlay").style.display = "none"; }, 600);
}

function abrirPreviewModal(t, u, tit) {
    document.getElementById("preview-title").innerHTML = `<i class='fa-solid fa-file-lines'></i> ${tit}`;
    document.getElementById("preview-container").innerHTML = t === "image" ? `<img src="${u}" style="max-width:100%">` : `<iframe src="${u}" width="100%" height="100%"></iframe>`;
    document.getElementById("preview-modal").style.display = "flex";
    setTimeout(() => { document.getElementById("preview-modal").style.opacity = "1"; }, 10);
}

function cerrarPreviewModal() {
    document.getElementById("preview-modal").style.opacity = "0";
    setTimeout(() => { document.getElementById("preview-modal").style.display = "none"; }, 400);
}
// (Menú móvil y otros omitidos por brevedad, mantenlos igual)
