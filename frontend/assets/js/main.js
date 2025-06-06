// main.js - Lógica común para la navegación y utilidades
// Aquí puedes agregar funciones reutilizables para todas las páginas

// Lógica de cambio de tema claro/oscuro
const btnTema = document.getElementById('btn-tema');
const iconoTema = document.getElementById('icono-tema');

// Cargar preferencia de tema al iniciar
window.addEventListener('DOMContentLoaded', () => {
    const temaGuardado = localStorage.getItem('tema');
    if (temaGuardado === 'oscuro') {
        activarTemaOscuro();
    } else {
        activarTemaClaro();
    }
});

if (btnTema) {
    btnTema.addEventListener('click', () => {
        if (document.body.classList.contains('tema-oscuro')) {
            activarTemaClaro();
            localStorage.setItem('tema', 'claro');
        } else {
            activarTemaOscuro();
            localStorage.setItem('tema', 'oscuro');
        }
    });
}

function activarTemaOscuro() {
    document.body.classList.add('tema-oscuro');
    btnTema.classList.add('tema-oscuro');
    btnTema.classList.remove('tema-claro');
    if (iconoTema) {
        iconoTema.classList.remove('bi-moon-stars');
        iconoTema.classList.add('bi-sun');
    }
}

function activarTemaClaro() {
    document.body.classList.remove('tema-oscuro');
    btnTema.classList.remove('tema-oscuro');
    btnTema.classList.add('tema-claro');
    if (iconoTema) {
        iconoTema.classList.add('bi-moon-stars');
        iconoTema.classList.remove('bi-sun');
    }
}
