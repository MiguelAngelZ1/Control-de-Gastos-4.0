// Lógica de Gastos Fijos: alta, validación, renderizado y acciones
// Guarda los gastos por usuario en localStorage bajo la clave 'gastosFijos_<usuario>'
let idxEliminar = null;
let form, btnLimpiar, tablaBody, descripcion, monto, estado;
let editandoIndex = null;
let usuarioActivo = null;

// Función para mostrar mensajes tipo toast
function mostrarMensaje(mensaje, tipo = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo} border-0 fade show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${mensaje}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>
    `;
    toastContainer.appendChild(toast);

    // Eliminar el toast después de 3 segundos
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Función para mostrar errores (usando toast)
function mostrarError(mensaje) {
    mostrarMensaje(mensaje, 'danger');
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar elementos del DOM
    form = document.getElementById('form-gasto-fijo');
    btnLimpiar = document.getElementById('btn-limpiar-gasto');
    tablaBody = document.getElementById('tabla-gastos-fijos-body');
    descripcion = document.getElementById('gasto-descripcion');
    monto = document.getElementById('gasto-monto');
    estado = document.getElementById('gasto-estado');
    
    // Configurar evento de entrada para formatear el monto mientras se escribe
    if (monto) {
        monto.addEventListener('input', function(e) {
            // Obtener la posición actual del cursor
            const inicio = this.selectionStart;
            
            // Formatear el valor
            const valorFormateado = formatearMilesPunto.call(this, this.value);
            
            // Si el valor cambió, actualizarlo
            if (this.value !== valorFormateado) {
                this.value = valorFormateado;
                
                // Restaurar la posición del cursor después de la actualización
                setTimeout(() => {
                    // Calcular la nueva posición del cursor
                    let nuevaPosicion = 0;
                    let contador = 0;
                    const digitosAntes = this.value.substring(0, inicio).replace(/\D/g, '').length;
                    
                    for (let i = 0; i < this.value.length; i++) {
                        if (contador >= digitosAntes) break;
                        if (/\d/.test(this.value[i])) {
                            contador++;
                        }
                        nuevaPosicion = i + 1;
                    }
                    
                    this.setSelectionRange(nuevaPosicion, nuevaPosicion);
                }, 0);
            }
        });
        
        // Permitir solo números, backspace y teclas de navegación
        monto.addEventListener('keydown', function(e) {
            // Permitir: teclas de navegación, backspace, delete, tab, escape, enter
            if ([46, 8, 9, 27, 13].includes(e.keyCode) || 
                // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.keyCode === 65 && e.ctrlKey === true) || 
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true) ||
                // Permitir: inicio, fin, flechas izquierda/derecha
                (e.keyCode >= 35 && e.keyCode <= 39)) {
                return;
            }
            
            // Asegurar que sea un número
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    }

    // Obtener usuario activo
    usuarioActivo = localStorage.getItem('usuarioActivo');
    if (!usuarioActivo) {
        window.location.href = 'index.html';
        return;
    }

    /**
     * Formatea un número como moneda argentina con símbolo $, separadores de miles y sin decimales
     * @param {number|string} valor - Valor numérico a formatear
     * @param {boolean} incluirSimbolo - Si se debe incluir el símbolo de moneda
     * @returns {string} Valor formateado (ej: "1.234" o "$ 1.234")
     */
    function formatearMonto(valor, incluirSimbolo = true) {
        // Si el valor es nulo, indefinido o vacío, devolver '0' o '$ 0'
        if (valor === null || valor === undefined || valor === '') {
            return incluirSimbolo ? '$ 0' : '0';
        }
        
        // Si el valor ya es un número o un string numérico
        let numero;
        if (typeof valor === 'number') {
            numero = Math.round(valor);
        } else {
            // Eliminar todos los caracteres que no sean dígitos
            const soloDigitos = valor.toString().replace(/\D/g, '');
            numero = parseInt(soloDigitos, 10) || 0;
        }
        
        // Formatear con separadores de miles
        const valorFormateado = numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
        return incluirSimbolo ? `$ ${valorFormateado}` : valorFormateado;
    }

    /**
     * Formatea un valor numérico en tiempo real mientras se escribe
     * @this {HTMLInputElement} - El input que está siendo modificado
     * @param {string} valor - Valor actual del input
     * @returns {string} Valor formateado con separadores de miles
     */
    function formatearMilesPunto(valor) {
        if (!this) return valor;
        
        // Guardar posición del cursor
        const inicio = this.selectionStart || 0;
        const fin = this.selectionEnd || 0;
        
        // Verificar si el usuario está borrando caracteres
        const estaBorrando = valor.length < (this.value || '').length;
        
        // Eliminar todo excepto números
        const soloNumeros = valor.replace(/\D/g, '');
        
        // Si está vacío, devolver vacío
        if (!soloNumeros) return '';
        
        // Convertir a número entero
        const numero = parseInt(soloNumeros, 10);
        if (isNaN(numero)) return '';
        
        // Formatear con separadores de miles
        const valorFormateado = numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
        // Calcular nueva posición del cursor
        const digitosAntes = valor.substring(0, inicio).replace(/\D/g, '').length;
        let nuevaPosicion = 0;
        let contador = 0;
        
        // Encontrar la posición del cursor después del formateo
        for (let i = 0; i < valorFormateado.length; i++) {
            if (contador >= digitosAntes) break;
            if (/\d/.test(valorFormateado[i])) {
                contador++;
            }
            nuevaPosicion = i + 1;
        }
        
        // Asegurarse de que la posición esté dentro de los límites
        nuevaPosicion = Math.min(nuevaPosicion, valorFormateado.length);
        
        // Usar setTimeout para restaurar la posición del cursor después de la actualización
        setTimeout(() => {
            this.setSelectionRange(nuevaPosicion, nuevaPosicion);
        }, 0);
        
        return valorFormateado;
    }

    // Función para crear la celda de edición
    function crearCeldaEdicion(gasto, campo, tipo = 'text', opciones = []) {
        if (tipo === 'select') {
            return `
                <td class="editable" data-campo="${campo}">
                    <select class="form-select form-select-sm">
                        ${opciones.map(op => 
                            `<option value="${op.valor}" ${gasto[campo] === op.valor ? 'selected' : ''}>
                                ${op.texto}
                            </option>`
                        ).join('')}
                    </select>
                </td>`;
        }
        
        const valor = campo === 'monto' 
            ? formatearMontoParaEdicion(gasto[campo])
            : (gasto[campo] || '');
            
        return `
            <td class="editable" data-campo="${campo}">
                <input type="${tipo}" class="form-control form-control-sm" value="${valor}" ${campo === 'monto' ? 'data-type="number"' : ''}>
            </td>`;
    }

    // Cargar gastos guardados
    function cargarGastos(editarIndex = null) {
        try {
            const gastos = JSON.parse(localStorage.getItem('gastosFijos_' + usuarioActivo)) || [];
            if (!tablaBody) return;
            
            // Obtener referencia al mensaje de "sin gastos"
            const sinGastos = document.getElementById('sin-gastos');
            
            // Mostrar mensaje si no hay gastos
            if (gastos.length === 0) {
                tablaBody.innerHTML = '';
                if (sinGastos) {
                    const tds = sinGastos.querySelectorAll('td');
                    if (tds.length > 0) {
                        tds[0].setAttribute('colspan', '4');
                    }
                    sinGastos.classList.remove('d-none');
                }
                return;
            }
            
            if (sinGastos) sinGastos.classList.add('d-none');
            
            // Limpiar la tabla
            tablaBody.innerHTML = '';
            
            // Crear un fragmento de documento para mejor rendimiento
            const fragment = document.createDocumentFragment();
            
            // Agregar cada gasto a la tabla
            gastos.forEach((gasto, i) => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-index', i);
                
                if (i === editarIndex) {
                    // Modo edición
                    tr.innerHTML = `
                        ${crearCeldaEdicion(gasto, 'descripcion')}
                        ${crearCeldaEdicion(gasto, 'monto', 'text')}
                        ${crearCeldaEdicion(gasto, 'estado', 'select', [
                            { valor: 'Pendiente', texto: 'Pendiente' },
                            { valor: 'Pagado', texto: 'Pagado' }
                        ])}
                        <td class="text-center">
                            <button class="btn btn-success btn-sm me-2 btn-guardar" data-index="${i}" title="Guardar">
                                <i class="bi bi-check-lg"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm btn-cancelar" data-index="${i}" title="Cancelar">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </td>`;
                } else {
                    // Modo visualización
                    tr.innerHTML = `
                        <td>${gasto.descripcion || ''}</td>
                        <td class="text-end">${formatearMonto(gasto.monto)}</td>
                        <td class="text-center">
                            <span class="badge ${gasto.estado === 'Pagado' ? 'bg-success' : 'bg-warning text-dark'}">
                                <i class="bi ${gasto.estado === 'Pagado' ? 'bi-check-circle-fill' : 'bi-hourglass-split'}"></i> ${gasto.estado || 'Pendiente'}
                            </span>
                        </td>
                        <td class="text-center">
                            <button class="btn btn-outline-primary btn-sm me-2 btn-editar" data-index="${i}" title="Editar">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm btn-eliminar" 
                                    data-index="${i}" 
                                    data-bs-toggle="modal" 
                                    data-bs-target="#modalConfirmarEliminacion"
                                    title="Eliminar">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </td>`;
                }
                
                fragment.appendChild(tr);
            });
            
            tablaBody.appendChild(fragment);
            
            // Asociar eventos
            if (editarIndex !== null) {
                // Si estamos editando, enfocar el primer campo
                const primerCampo = tablaBody.querySelector(`tr[data-index="${editarIndex}"] .editable input, tr[data-index="${editarIndex}"] .editable select`);
                if (primerCampo) primerCampo.focus();
                
                // Asociar eventos de guardar y cancelar
                document.querySelectorAll('.btn-guardar').forEach(btn => {
                    btn.addEventListener('click', manejarGuardarEdicion);
                });
                
                document.querySelectorAll('.btn-cancelar').forEach(btn => {
                    btn.addEventListener('click', () => cargarGastos());
                });
            } else {
                // Si no estamos editando, asociar eventos normales
                asociarEventosEditar();
                asociarEventosEliminar();
            }
            
        } catch (error) {
            console.error('Error al cargar gastos:', error);
            mostrarError('Error al cargar los gastos. Por favor, recarga la página.');
        }
    }

    // Guardar gastos
    function guardarGastos(gastos) {
        localStorage.setItem('gastosFijos_' + usuarioActivo, JSON.stringify(gastos));
    }

    // Limpiar formulario
    function limpiarFormulario() {
        if (form) form.reset();
        if (monto) monto.value = '0';
        editandoIndex = null;
        if (descripcion) descripcion.focus();
    }

    /**
     * Formatea un monto para mostrarlo en modo edición (sin formato de moneda)
     * @param {string|number} valor - Valor a formatear
     * @returns {string} Valor sin formato de moneda
     */
    function formatearMontoParaEdicion(valor) {
        // Si el valor es nulo o indefinido, devolver cadena vacía
        if (valor === null || valor === undefined || valor === '') return '';
        
        // Si es número, redondear y convertir a string
        if (typeof valor === 'number') {
            return Math.round(valor).toString();
        }
        
        // Si es string, quitar todo excepto dígitos
        const soloNumeros = valor.toString().replace(/\D/g, '');
        
        // Si no hay dígitos, devolver cadena vacía
        if (!soloNumeros) return '';
        
        // Convertir a número entero y luego a string
        const numero = parseInt(soloNumeros, 10);
        return isNaN(numero) ? '' : numero.toString();
    }

    /**
     * Maneja el guardado de la edición de un gasto
     * @param {Event} e - Evento del botón de guardar
     */
    function manejarGuardarEdicion(e) {
        e.preventDefault();
        const btnGuardar = e.currentTarget;
        const idx = parseInt(btnGuardar.getAttribute('data-index'), 10);
        
        // Obtener la fila que se está editando
        const fila = tablaBody.querySelector(`tr[data-index="${idx}"]`);
        if (!fila) {
            mostrarError('No se pudo encontrar el gasto a editar');
            return;
        }
        
        // Recopilar los valores editados
        const datosEditados = {};
        const celdasEditables = fila.querySelectorAll('.editable');
        let hayErrores = false;
        
        // Validar cada campo editable
        for (const celda of celdasEditables) {
            const campo = celda.getAttribute('data-campo');
            const input = celda.querySelector('input, select');
            
            if (!input) continue;
            
            let valor = input.value.trim();
            
            // Validar campo de descripción
            if (campo === 'descripcion') {
                if (!valor) {
                    mostrarError('La descripción no puede estar vacía');
                    input.focus();
                    hayErrores = true;
                    break;
                }
                datosEditados[campo] = valor;
                continue;
            }
            
            // Validar campo de monto
            if (campo === 'monto') {
                // Eliminar todo excepto dígitos
                valor = valor.replace(/\D/g, '');
                
                if (!valor) {
                    mostrarError('El monto no puede estar vacío');
                    input.focus();
                    hayErrores = true;
                    break;
                }
                
                // Convertir a número entero
                const montoNum = parseInt(valor, 10);
                
                if (isNaN(montoNum) || montoNum <= 0) {
                    mostrarError('El monto debe ser un número mayor a cero');
                    input.focus();
                    hayErrores = true;
                    break;
                }
                
                // Guardar como string sin formato
                datosEditados[campo] = montoNum.toString();
                continue;
            }
            
            // Para otros campos (como estado)
            datosEditados[campo] = valor;
        }
        
        if (hayErrores) return;
        
        // Actualizar el gasto en el almacenamiento local
        try {
            const gastos = JSON.parse(localStorage.getItem('gastosFijos_' + usuarioActivo)) || [];
            if (gastos[idx]) {
                // Actualizar solo los campos editados
                gastos[idx] = { ...gastos[idx], ...datosEditados };
                localStorage.setItem('gastosFijos_' + usuarioActivo, JSON.stringify(gastos));
                
                // Mostrar mensaje de éxito
                mostrarMensaje('Gasto actualizado correctamente');
                
                // Recargar la tabla sin modo edición
                cargarGastos();
            }
        } catch (error) {
            console.error('Error al guardar los cambios:', error);
            mostrarError('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
        }
    }
    
    // Función para asociar eventos de edición
    function asociarEventosEditar() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            // Remover cualquier evento previo
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const idx = parseInt(this.getAttribute('data-index'), 10);
                // Recargar la tabla en modo edición para la fila seleccionada
                cargarGastos(idx);
            });
        });
    }
    
    // Función para asociar eventos de eliminación
    function asociarEventosEliminar() {
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            // Remover cualquier evento previo
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function(e) {
                // Prevenir el comportamiento por defecto del botón
                e.preventDefault();
                // Asignar el índice del elemento a eliminar
                idxEliminar = parseInt(this.getAttribute('data-index'), 10);
                
                // Mostrar el modal manualmente
                const modalElement = document.getElementById('modalConfirmarEliminacion');
                if (modalElement) {
                    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                    modal.show();
                }
            });
        });
    }

    /**
     * Obtiene el valor numérico de un monto formateado
     * @param {string|number} valorFormateado - Valor formateado con separadores de miles
     * @returns {number} Valor numérico
     */
    function obtenerValorNumerico(valorFormateado) {
        if (valorFormateado === null || valorFormateado === undefined || valorFormateado === '') {
            return 0;
        }
        
        // Si ya es un número, devolverlo redondeado
        if (typeof valorFormateado === 'number') {
            return Math.round(valorFormateado);
        }
        
        // Si es un string, limpiarlo y convertir a número
        const valorLimpio = valorFormateado.toString()
            .replace(/\./g, '')  // Eliminar puntos de miles
            .replace(',', '.')     // Reemplazar coma decimal por punto si existe
            .replace(/[^\d.-]/g, ''); // Mantener solo dígitos, punto y signo negativo
            
        const numero = parseFloat(valorLimpio);
        return isNaN(numero) ? 0 : Math.round(numero);
    }

    /**
     * Actualiza el valor formateado en el input de monto
     * @param {HTMLInputElement} input - Elemento input
     * @param {string} nuevoValor - Nuevo valor a establecer
     * @param {number} posicionCursor - Posición deseada del cursor
     */
    function actualizarValorFormateado(input, nuevoValor, posicionCursor = null) {
        const valorActual = input.value;
        
        // Si el valor no cambia, no hacemos nada
        if (nuevoValor === valorActual) return;
        
        // Actualizar el valor
        input.value = nuevoValor;
        
        // Si no se especifica posición, poner el cursor al final
        if (posicionCursor === null) {
            posicionCursor = nuevoValor.length;
        }
        
        // Asegurarse de que la posición esté dentro de los límites
        posicionCursor = Math.max(0, Math.min(posicionCursor, nuevoValor.length));
        
        // Mover el cursor a la posición deseada
        setTimeout(() => {
            input.setSelectionRange(posicionCursor, posicionCursor);
        }, 0);
    }

    // Evento submit del formulario
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validar formulario manualmente
            let esValido = true;
            
            // Validar descripción
            if (!descripcion.value.trim()) {
                descripcion.setCustomValidity('Ingrese una descripción');
                esValido = false;
            } else {
                descripcion.setCustomValidity('');
            }
            
            // Validar monto
            const valorMonto = obtenerValorNumerico(monto.value);
            if (isNaN(valorMonto) || valorMonto <= 0) {
                monto.setCustomValidity('Ingrese un monto válido mayor a cero');
                esValido = false;
            } else {
                monto.setCustomValidity('');
            }
            
            // Validar estado
            if (!estado.value) {
                estado.setCustomValidity('Seleccione un estado');
                esValido = false;
            } else {
                estado.setCustomValidity('');
            }
            
            // Mostrar mensajes de validación
            if (!esValido) {
                e.stopPropagation();
                form.classList.add('was-validated');
                
                // Enfocar el primer campo inválido
                const primerInvalido = form.querySelector(':invalid');
                if (primerInvalido) {
                    if (primerInvalido === monto) {
                        mostrarError('Ingrese un monto válido mayor a cero');
                    }
                    primerInvalido.focus();
                }
                return;
            }
            
            // Obtener gastos actuales
            const gastos = JSON.parse(localStorage.getItem('gastosFijos_' + usuarioActivo)) || [];
            
            // Crear objeto de gasto (guardamos como número, no como string)
            const nuevoGasto = {
                descripcion: descripcion.value.trim(),
                monto: valorMonto,  // Guardamos como número
                estado: estado.value
            };

            if (editandoIndex !== null) {
                gastos[editandoIndex] = nuevoGasto;
                mostrarMensaje('Gasto actualizado correctamente');
                editandoIndex = null;
            } else {
                gastos.push(nuevoGasto);
                mostrarMensaje('Gasto agregado correctamente');
            }

            guardarGastos(gastos);
            cargarGastos();
            limpiarFormulario();
        });
    }

    // Evento para limpiar formulario
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFormulario);
    }

    // Función para inicializar el modal de confirmación
    function inicializarModalEliminacion() {
        const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminarGasto');
        const btnCancelarEliminar = document.getElementById('btnCancelarEliminarGasto');
        const modalElement = document.getElementById('modalConfirmarEliminacion');
        
        if (!modalElement) return;
        
        // Inicializar el modal de Bootstrap
        const modal = new bootstrap.Modal(modalElement);
        
        // Configurar el botón de confirmación
        if (btnConfirmarEliminar) {
            // Remover cualquier evento previo
            const newConfirmBtn = btnConfirmarEliminar.cloneNode(true);
            btnConfirmarEliminar.parentNode.replaceChild(newConfirmBtn, btnConfirmarEliminar);
            
            newConfirmBtn.addEventListener('click', function() {
                if (idxEliminar !== null) {
                    try {
                        const gastos = JSON.parse(localStorage.getItem('gastosFijos_' + usuarioActivo)) || [];
                        if (gastos[idxEliminar]) {
                            // Eliminar el gasto del array
                            gastos.splice(idxEliminar, 1);
                            // Guardar los cambios
                            guardarGastos(gastos);
                            // Forzar la actualización de la tabla
                            cargarGastos();
                            // Mostrar mensaje de éxito
                            mostrarMensaje('Gasto eliminado correctamente');
                        } else {
                            mostrarError('No se pudo encontrar el gasto a eliminar');
                        }
                    } catch (error) {
                        console.error('Error al eliminar el gasto:', error);
                        mostrarError('Ocurrió un error al eliminar el gasto');
                    } finally {
                        idxEliminar = null;
                    }
                }
                
                // Cerrar el modal
                if (modal) {
                    modal.hide();
                }
                
                // Limpiar el fondo del modal
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                
                // Forzar un redibujado de la tabla
                if (tablaBody) {
                    tablaBody.style.display = 'none';
                    // Este pequeño retraso asegura que el navegador tenga tiempo de procesar el cambio
                    setTimeout(() => {
                        tablaBody.style.display = '';
                    }, 10);
                }
            });
        }
        
        // Configurar el botón de cancelar
        if (btnCancelarEliminar) {
            // Remover cualquier evento previo
            const newCancelBtn = btnCancelarEliminar.cloneNode(true);
            btnCancelarEliminar.parentNode.replaceChild(newCancelBtn, btnCancelarEliminar);
            
            newCancelBtn.addEventListener('click', function() {
                idxEliminar = null;
                modal.hide();
            });
        }
        
        // Manejar el evento de cierre del modal
        modalElement.addEventListener('hidden.bs.modal', function () {
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
        });
    }
    
    // Inicializar el modal al cargar la página
    inicializarModalEliminacion();

    // Función para cerrar sesión
    window.cerrarSesion = function() {
        localStorage.removeItem('usuarioActivo');
        window.location.href = 'index.html';
    };
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Cargar gastos al iniciar
    cargarGastos();
});
