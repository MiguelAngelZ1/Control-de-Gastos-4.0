// index.js - Lógica específica de la página de inicio (dashboard)
// -------------------------------------------------------------
// Este archivo controla la interacción de la página principal:
// - Permite guardar el presupuesto ingresado por el usuario
// - Actualiza el resumen financiero (presupuesto, gastado, saldo)
// - Deja preparado el bloque para futura conexión con el backend

// Elementos del DOM
// index.js - Lógica específica de la página de inicio (dashboard)

const formPresupuesto = document.getElementById('form-presupuesto');
const inputPresupuesto = document.getElementById('inputPresupuesto');
const totalPresupuesto = document.getElementById('total-presupuesto');
const totalGastado = document.getElementById('total-gastado');
const saldoRestante = document.getElementById('saldo-restante');

const loginModal = document.getElementById('loginModal');
const formLoginUsuario = document.getElementById('form-login-usuario');
const inputLoginUsuario = document.getElementById('inputLoginUsuario');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const liUsuarioNav = document.getElementById('li-usuario-nav');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const nombreUsuarioNav = document.getElementById('nombre-usuario-nav');
const nombreUsuarioText = document.getElementById('nombre-usuario-text');
const onlineIndicador = document.getElementById('online-indicador');

let usuarioActivo = null;
let mensaje = null;

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

    window.onkeydown = (e) => { if (e.key === 'Escape') e.preventDefault(); };
    loginModal.onclick = (e) => { if (e.target === loginModal) e.stopPropagation(); };

    inputLoginUsuario.value = '';
    inputLoginUsuario.classList.remove('is-invalid');
    loginErrorMsg.style.display = 'none';
}

function ocultarLoginModal() {
    loginModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    window.onkeydown = null;
}

function esNombreValido(nombre) {
    return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre.trim());
}

inputLoginUsuario.addEventListener('input', function () {
    if (!esNombreValido(this.value)) {
        this.classList.add('is-invalid');
        loginErrorMsg.style.display = 'block';
    } else {
        this.classList.remove('is-invalid');
        loginErrorMsg.style.display = 'none';
    }
});

formLoginUsuario.addEventListener('submit', function (e) {
    e.preventDefault();
    let nombre = inputLoginUsuario.value.trim();
    if (!esNombreValido(nombre)) {
        inputLoginUsuario.classList.add('is-invalid');
        loginErrorMsg.style.display = 'block';
        return;
    }

    usuarioActivo = nombre;
    localStorage.setItem('usuarioActivo', usuarioActivo);
    ocultarLoginModal();
    cargarDatosUsuario();
    mostrarMensaje('¡Bienvenido, ' + usuarioActivo + '!', 'success');
    actualizarCerrarSesion();
});

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function () {
        localStorage.removeItem('usuarioActivo');
        usuarioActivo = null;
        mostrarLoginModal();
        actualizarCerrarSesion();
    });
}

function actualizarCerrarSesion() {
    if (usuarioActivo && liUsuarioNav && nombreUsuarioNav && nombreUsuarioText) {
        nombreUsuarioText.textContent = usuarioActivo;
        liUsuarioNav.style.display = 'flex';

        if (onlineIndicador) {
            onlineIndicador.setAttribute('title', `En línea como ${usuarioActivo}`);
            if (window.bootstrap && bootstrap.Tooltip) {
                bootstrap.Tooltip.getInstance(onlineIndicador)?.dispose();
                new bootstrap.Tooltip(onlineIndicador);
            }
        }
    } else {
        liUsuarioNav.style.display = 'none';
    }
}

function limpiarResumen() {
    if (!usuarioActivo) return;
    presupuesto = 0;
    gastado = 0;
    localStorage.removeItem('presupuesto_' + usuarioActivo);
    actualizarResumen();
    mostrarMensaje('Resumen financiero limpiado.', 'warning');
}

function formatearMoneda(valor) {
    return valor.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

inputPresupuesto.addEventListener('input', function (e) {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor) {
        e.target.value = Number(valor).toLocaleString('es-AR');
    } else {
        e.target.value = '';
    }
});

inputPresupuesto.addEventListener('blur', function (e) {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor) {
        e.target.value = Number(valor).toLocaleString('es-AR');
    } else {
        e.target.value = '';
    }
});

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
