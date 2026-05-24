// =========================================================
// 1. CONFIGURACIÓN DE FIREBASE (SDK Modular v10+)
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ⚠️ REEMPLAZA ESTO con los datos de tu proyecto en la consola de Firebase ⚠️
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================================================
// 2. VARIABLES DE ESTADO Y ELEMENTOS DEL DOM
// =========================================================
let currentUser = null;
let inventarioLocal = [];

// Vistas
const viewAuth = document.getElementById('view-auth');
const viewDashboard = document.getElementById('view-dashboard');
const navUserMenu = document.getElementById('nav-user-menu');
const userEmailDisplay = document.getElementById('user-email-display');
const authMessage = document.getElementById('auth-message');

// Formulario de Negocio
const inputs = {
    nombre: document.getElementById('tienda-nombre'),
    vendedor: document.getElementById('tienda-vendedor'), // CAMPO NUEVO
    telefono: document.getElementById('tienda-telefono'),
    horario: document.getElementById('tienda-horario'),
    direccion: document.getElementById('tienda-direccion'),
    redes: document.getElementById('tienda-redes'),
    apikey: document.getElementById('tienda-apikey')
};

// =========================================================
// 3. LÓGICA DE AUTENTICACIÓN
// =========================================================

// Escuchar cambios de sesión
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userEmailDisplay.textContent = user.email;
        viewAuth.classList.add('hidden-view');
        viewDashboard.classList.remove('hidden-view');
        navUserMenu.classList.remove('hidden-view');
        
        // Cargar datos previos si existen
        await cargarDatosNegocio(user.uid);
    } else {
        currentUser = null;
        viewAuth.classList.remove('hidden-view');
        viewDashboard.classList.add('hidden-view');
        navUserMenu.classList.add('hidden-view');
    }
});

// Botón: Iniciar Sesión
document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    if(!email || !pass) return mostrarError("Ingresa correo y contraseña.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        mostrarError("Error al iniciar sesión: Revisa tus credenciales.");
    }
});

// Botón: Registrarse
document.getElementById('btn-register').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    if(!email || !pass) return mostrarError("Ingresa correo y contraseña para registrarte.");
    
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        mostrarError("Error al registrar: La contraseña debe tener mínimo 6 caracteres.");
    }
});

// Botón: Salir
document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
    // Limpiar formulario local al salir
    Object.values(inputs).forEach(input => input.value = '');
    inventarioLocal = [];
    renderizarInventario();
});

function mostrarError(msg) {
    authMessage.textContent = msg;
    authMessage.classList.remove('hidden-view');
    setTimeout(() => authMessage.classList.add('hidden-view'), 4000);
}

// =========================================================
// 4. LÓGICA DEL INVENTARIO (TABLA)
// =========================================================

document.getElementById('btn-add-product').addEventListener('click', () => {
    const nombreInput = document.getElementById('prod-nombre');
    const precioInput = document.getElementById('prod-precio');
    
    if(!nombreInput.value || !precioInput.value) return alert("Por favor llena el nombre y el precio del producto.");

    inventarioLocal.push({
        id: Date.now().toString(),
        articulo: nombreInput.value,
        precio: parseFloat(precioInput.value)
    });

    nombreInput.value = '';
    precioInput.value = '';
    renderizarInventario();
});

function renderizarInventario() {
    const tbody = document.getElementById('inventory-list');
    const emptyMsg = document.getElementById('empty-inventory');
    
    tbody.innerHTML = '';
    
    if(inventarioLocal.length === 0) {
        emptyMsg.classList.remove('hidden-view');
        return;
    }
    
    emptyMsg.classList.add('hidden-view');

    inventarioLocal.forEach(prod => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50 transition";
        tr.innerHTML = `
            <td class="px-4 py-3 font-medium text-gray-800">${prod.articulo}</td>
            <td class="px-4 py-3 text-green-600 font-bold">$${prod.precio.toFixed(2)}</td>
            <td class="px-4 py-3 text-center">
                <button data-id="${prod.id}" class="btn-delete text-red-500 hover:text-red-700 transition">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Añadir eventos a los botones de eliminar (Solución para módulos JS)
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            inventarioLocal = inventarioLocal.filter(prod => prod.id !== id);
            renderizarInventario();
        });
    });
}

// =========================================================
// 5. MOTOR DE PROMPTS: LA PERSONALIDAD VENDEDORA
// =========================================================
function compilarPromptMaestro(datos, inventario) {
    let listaProductos = inventario.map(p => `- *${p.articulo}*: $${p.precio.toFixed(2)}`).join('\n');
    let nombreIA = datos.vendedor.trim() !== "" ? datos.vendedor : "Asesor de Ventas";

    return `
Eres ${nombreIA}, el vendedor estrella y asesor de confianza de la tienda "${datos.nombre}".
Tu objetivo principal no es solo dar información, es PERSUADIR, VENDER y asegurar que el cliente concrete un pedido o visite la tienda HOY.

### CONTEXTO DEL NEGOCIO
- Empresa: ${datos.nombre}
- Dirección física: ${datos.direccion}
- Horarios de atención: ${datos.horario}
- Contacto directo: ${datos.telefono}
- Redes: ${datos.redes}

### CATÁLOGO DE PRODUCTOS Y PRECIOS
${listaProductos}

### REGLAS DE IDENTIDAD Y VENTAS
1. TU IDENTIDAD: Eres ${nombreIA}. Si el cliente pregunta "¿Con quién hablo?", "¿Eres un bot?" o cómo te llamas, responde de forma cálida: "Soy ${nombreIA}, tu asesor de ventas en ${datos.nombre}. ¡Estoy aquí para ayudarte a elegir lo mejor!". NO digas que eres una IA de Google.
2. SIEMPRE CIERRA (ABC - Always Be Closing): Nunca termines un mensaje de forma pasiva. Termina SIEMPRE con una pregunta que incite a la acción ("¿Te separo uno?", "¿Para cuándo lo necesitas?", "¿Pasas hoy por la tienda?").
3. CONCISO Y VISUAL: Estás en WhatsApp. Usa viñetas, negritas para precios/productos y emojis (🔥, ✅, 📦). Cero párrafos largos.
4. VENTA CRUZADA (CROSS-SELL): Si el cliente pide un artículo, ofrécele sutilmente otro que lo complemente y esté en el catálogo.
5. CERO ALUCINACIONES: NUNCA ofrezcas un producto que no esté en la lista. Si piden algo agotado o inexistente, di: "Ese modelo exacto voló del inventario, pero te ofrezco [Alternativa del catálogo] que tiene una salida excelente."
6. PRECIOS FIRMES: Los precios son los publicados. Si piden descuento, explica amablemente que ya es precio promocional.
`;
}

// =========================================================
// 6. GUARDAR Y CARGAR DATOS EN FIRESTORE
// =========================================================

document.getElementById('btn-save-config').addEventListener('click', async () => {
    if (!currentUser) return;
    
    const saveMsg = document.getElementById('save-message');
    const btnSave = document.getElementById('btn-save-config');
    const textoOriginalBtn = btnSave.innerHTML;
    
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Guardando...';
    btnSave.disabled = true;

    // Recopilar datos del formulario
    const datosNegocio = {
        nombre: inputs.nombre.value,
        vendedor: inputs.vendedor.value,
        telefono: inputs.telefono.value,
        horario: inputs.horario.value,
        direccion: inputs.direccion.value,
        redes: inputs.redes.value,
        gemini_api_key: inputs.apikey.value,
        inventario: inventarioLocal,
        status_bot: true,
        actualizado: new Date().toISOString()
    };

    // Generar el prompt con las instrucciones de venta
    datosNegocio.system_prompt = compilarPromptMaestro(datosNegocio, inventarioLocal);

    try {
        // Guardar documento usando el UID del usuario registrado
        await setDoc(doc(db, "negocios", currentUser.uid), datosNegocio);
        
        btnSave.innerHTML = textoOriginalBtn;
        btnSave.disabled = false;
        
        saveMsg.classList.remove('hidden-view');
        setTimeout(() => saveMsg.classList.add('hidden-view'), 4000);
    } catch (error) {
        console.error("Error guardando datos:", error);
        alert("Ocurrió un error al guardar la configuración en la base de datos.");
        btnSave.innerHTML = textoOriginalBtn;
        btnSave.disabled = false;
    }
});

async function cargarDatosNegocio(uid) {
    try {
        const docSnap = await getDoc(doc(db, "negocios", uid));
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            inputs.nombre.value = data.nombre || '';
            inputs.vendedor.value = data.vendedor || ''; // Carga el nombre del vendedor
            inputs.telefono.value = data.telefono || '';
            inputs.horario.value = data.horario || '';
            inputs.direccion.value = data.direccion || '';
            inputs.redes.value = data.redes || '';
            inputs.apikey.value = data.gemini_api_key || '';
            
            if (data.inventario && Array.isArray(data.inventario)) {
                inventarioLocal = data.inventario;
                renderizarInventario();
            }
        }
    } catch (error) {
        console.error("Error al cargar configuración:", error);
    }
}
  
