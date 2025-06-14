// index.js - Lógica específica de la página de inicio (dashboard)
// -------------------------------------------------------------
// Este archivo controla la interacción de la página principal:
// - Permite guardar el presupuesto ingresado por el usuario
// - Actualiza el resumen financiero (presupuesto, gastado, saldo)
// - Deja preparado el bloque para futura conexión con el backend

// Elementos del DOM
const formPresupuesto = document.getElementById('form-presupuesto');
const inputPresupuesto = document.getElementById('inputPresupuesto');
const totalPresupuesto = document.getElementById('total-presupuesto');
const totalGastado = document.getElementById('total-gastado');
const saldoRestante = document.getElementById('saldo-restante');

// --- Lógica de Login Modal y Cerrar Sesión ---
const loginModal = document.getElementById('loginModal');
const formLoginUsuario = document.getElementById('form-login-usuario');
const inputLoginUsuario = document.getElementById('inputLoginUsuario');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const liUsuarioNav = document.getElementById('li-usuario-nav');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const nombreUsuarioNav = document.getElementById('nombre-usuario-nav');
const nombreUsuarioText = document.getElementById('nombre-usuario-text');

let usuarioActivo = null;

window.addEventListener('DOMContentLoaded', () => {
    usuarioActivo = localStorage.getItem('usuarioActivo');
    if (!usuarioActivo) {
        mostrarLoginModal();
    } else {
        cargarDatosUsuario();
        ocultarLoginModal();
    }
    actualizarCerrarSesion();
});

function mostrarLoginModal() {
    loginModal.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => inputLoginUsuario.focus(), 200);
    // Evitar cerrar con Esc o click fuera
    window.onkeydown = (e) => { if (e.key === 'Escape') e.preventDefault(); };
    loginModal.onclick = (e) => { if (e.target === loginModal) e.stopPropagation(); };
    // Limpiar input y feedback
    inputLoginUsuario.value = '';
    inputLoginUsuario.classList.remove('is-invalid');
    loginErrorMsg.style.display = 'none';
}
function ocultarLoginModal() {
    loginModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    window.onkeydown = null;
}

// Validar solo letras y espacios
function esNombreValido(nombre) {
    return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre.trim());
}

// Validación en vivo
inputLoginUsuario.addEventListener('input', function() {
    if (!esNombreValido(this.value)) {
        this.classList.add('is-invalid');
        loginErrorMsg.style.display = 'block';
    } else {
        this.classList.remove('is-invalid');
        loginErrorMsg.style.display = 'none';
    }
});

// Evento login
if (formLoginUsuario) {
    formLoginUsuario.addEventListener('submit', function(e) {
        e.preventDefault();
        let nombre = inputLoginUsuario.value.trim();
        if (!esNombreValido(nombre)) {
            inputLoginUsuario.classList.add('is-invalid');
            loginErrorMsg.style.display = 'block';
            return;
        }
        inputLoginUsuario.classList.remove('is-invalid');
        loginErrorMsg.style.display = 'none';
        usuarioActivo = nombre;
        localStorage.setItem('usuarioActivo', usuarioActivo);
        ocultarLoginModal();
        cargarDatosUsuario();
        mostrarMensaje('¡Bienvenido, ' + usuarioActivo + '!', 'success');
        actualizarCerrarSesion();
    });
} else {
    console.warn('El formulario de login no fue encontrado en el DOM');
}

// Botón cerrar sesión
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function() {
        localStorage.removeItem('usuarioActivo');
        usuarioActivo = null;
        mostrarLoginModal();
        actualizarCerrarSesion();
    });
}

// Mostrar/ocultar botón cerrar sesión
// Mostrar/ocultar nombre de usuario y botón cerrar sesión en navbar
function actualizarCerrarSesion() {
    if (usuarioActivo && liUsuarioNav && nombreUsuarioNav && nombreUsuarioText) {
        nombreUsuarioText.textContent = usuarioActivo;
        liUsuarioNav.style.display = 'flex';
        // Tooltip dinámico en el círculo verde
        const onlineIndicador = document.getElementById('online-indicador');
        if (onlineIndicador) {
            onlineIndicador.setAttribute('title', `En línea como ${usuarioActivo}`);
            if (window.bootstrap && bootstrap.Tooltip) {
                bootstrap.Tooltip.getInstance(onlineIndicador)?.dispose();
                new bootstrap.Tooltip(onlineIndicador);
            }
        }
        // Animación fadeIn
        nombreUsuarioNav.classList.remove('fadein-usuario');
        void nombreUsuarioNav.offsetWidth; // trigger reflow
        nombreUsuarioNav.classList.add('fadein-usuario');
    } else if (liUsuarioNav) {
        liUsuarioNav.style.display = 'none';
    }
}



// Cargar datos del usuario activo
function cargarDatosUsuario(limpiar = false) {
    if (!usuarioActivo) return;
    if (limpiar) {
        presupuesto = 0;
        gastado = 0;
        localStorage.removeItem('presupuesto_' + usuarioActivo);
        // Aquí podrías limpiar más datos asociados
    } else {
        const presupuestoGuardado = localStorage.getItem('presupuesto_' + usuarioActivo);
        presupuesto = presupuestoGuardado ? parseFloat(presupuestoGuardado) : 0;
        // Aquí podrías cargar gastos asociados en el futuro
    }
    actualizarResumen();
    inputPresupuesto.value = '';
}

// Guardar presupuesto bajo la clave del usuario activo
function guardarPresupuestoUsuario(valor) {
    if (!usuarioActivo) return;
    let presupuestoGuardado = localStorage.getItem('presupuesto_' + usuarioActivo);
    if (presupuestoGuardado) {
        presupuesto = parseFloat(presupuestoGuardado);
    }
    presupuesto += valor;
    localStorage.setItem('presupuesto_' + usuarioActivo, presupuesto);
    actualizarResumen();
}


// Variables para almacenar los datos
let presupuesto = 0;
let gastado = 0; // Este valor se actualizará con los gastos reales más adelante

// Botón para limpiar el resumen financiero
const btnLimpiarResumen = document.getElementById('btn-limpiar-resumen');
if (btnLimpiarResumen) {
    btnLimpiarResumen.addEventListener('click', limpiarResumen);
} 

// Elemento para mostrar mensajes de error o éxito
let mensaje = null; // Se creará dinámicamente si es necesario



// Evento para guardar el presupuesto ingresado
formPresupuesto.addEventListener('submit', function(e) {
    e.preventDefault();
    // Quitar puntos de miles para parsear correctamente
    const valor = parseFloat(inputPresupuesto.value.replace(/\./g, '').replace(/,/g, '.'));
    if (isNaN(valor) || valor <= 0) {
        mostrarMensaje('Ingrese un importe válido mayor a cero.', 'danger');
        return;
    }
    guardarPresupuestoUsuario(valor);
    mostrarMensaje('Presupuesto agregado correctamente.', 'success');
    inputPresupuesto.value = '';
    inputPresupuesto.focus();
});

// Función para actualizar el resumen financiero en pantalla
function actualizarResumen() {
    totalPresupuesto.textContent = formatearMoneda(presupuesto);
    totalGastado.textContent = formatearMoneda(gastado);
    saldoRestante.textContent = formatearMoneda(presupuesto - gastado);
}

// Función para limpiar el resumen financiero y localStorage SOLO del usuario activo
function limpiarResumen() {
    if (!usuarioActivo) return;
    presupuesto = 0;
    gastado = 0;
    localStorage.removeItem('presupuesto_' + usuarioActivo);
    actualizarResumen();
    mostrarMensaje('Resumen financiero limpiado.', 'warning');
}


// Función para formatear números como moneda: $10.000 (sin decimales)
function formatearMoneda(valor) {
    return valor.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Formatear con puntos de miles en tiempo real, sin símbolo de moneda ni decimales
inputPresupuesto.addEventListener('input', function(e) {
    let valor = e.target.value.replace(/\D/g, ''); // Solo números
    if (valor) {
        e.target.value = Number(valor).toLocaleString('es-AR');
    } else {
        e.target.value = '';
    }
});

// Al perder el foco, mantener el formato de miles
inputPresupuesto.addEventListener('blur', function(e) {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor) {
        e.target.value = Number(valor).toLocaleString('es-AR');
    } else {
        e.target.value = '';
    }
});
// El formateo de moneda completo se aplica al mostrar el resumen y al guardar

// Función para mostrar mensajes de error o éxito (desaparecen solos, sin botón de cierre)
function mostrarMensaje(texto, tipo = 'danger') {
    if (!mensaje) {
        mensaje = document.createElement('div');
        mensaje.className = 'mt-3';
        formPresupuesto.parentNode.appendChild(mensaje);
    }
    mensaje.innerHTML = `<div class="alert alert-${tipo} fade show" role="alert">
        ${texto}
    </div>`;
    setTimeout(() => {
        if (mensaje) mensaje.innerHTML = '';
    }, 2000);
}


// ---------------------
// BLOQUE PARA CONEXIÓN CON BACKEND (FUTURO)
// Aquí se implementará la lógica para obtener/guardar datos reales
// desde el backend usando fetch/AJAX cuando esté disponible.
/*
fetch('https://tu-backend-render.com/api/presupuesto', {
    method: 'GET',
    // ...
})
.then(response => response.json())
.then(data => {
    // Actualizar UI con datos reales
})
.catch(error => console.error('Error al conectar con backend:', error));
*/
// ---------------------
