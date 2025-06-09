/**
 * Gestión de Gastos Semanales
 * 
 * Este archivo maneja la lógica para el control de gastos semanales,
 * permitiendo registrar gastos por semana y hacer un seguimiento del presupuesto.
 */

// Constantes
const SEMANAS_POR_MES = 4;
const STORAGE_KEY = 'gastosSemanales';
const CATEGORIAS_PREDETERMINADAS = [
  'Comida', 'Transporte', 'Entretenimiento', 
  'Servicios', 'Compras', 'Salud', 'Educación', 'Otros'
];

// Configuración de notificaciones
const TOAST_CONFIG = {
  position: 'bottom-end',
  timer: 5000,
  timerProgressBar: true,
  showConfirmButton: false,
  toast: true,
  customClass: {
    container: 'toast-container-custom',
    toast: 'toast-custom',
    title: 'toast-title',
    icon: 'toast-icon',
    closeButton: 'toast-close-button',
    progress: 'progress'
  }
};

// Umbrales para los colores de las barras de progreso (porcentaje del presupuesto)
const UMBRALES = {
  BAJO: 60,    // Menos del 60% gastado (verde)
  MEDIO: 90,  // Entre 60% y 90% gastado (amarillo)
  ALTO: 100   // Más del 90% gastado (rojo)
};

// Sonidos
const SONIDOS = {
  exito: new Audio('assets/sounds/success.mp3'),
  error: new Audio('assets/sounds/error.mp3'),
  notificacion: new Audio('assets/sounds/notification.mp3')
};

// Configurar volumen de los sonidos
Object.values(SONIDOS).forEach(sound => {
  sound.volume = 0.3; // Volumen al 30% para que no sea molesto
});

/**
 * Formatea un número con puntos como separadores de miles (sin decimales)
 * @param {string} value - Valor a formatear
 * @returns {string} - Valor formateado con puntos como separadores de miles
 */
function formatearNumeroMiles(value) {
  // Eliminar todos los caracteres que no sean dígitos
  const soloNumeros = value.replace(/\D/g, '');
  
  // Formatear con puntos como separadores de miles
  return soloNumeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Maneja el evento de entrada en campos numéricos con formato de miles
 * @param {Event} e - Evento de entrada
 */
function manejarInputNumerico(e) {
  const input = e.target;
  const cursorPosition = input.selectionStart;
  const valorOriginal = input.value;
  
  // Obtener el valor sin formatear
  const valorSinFormato = valorOriginal.replace(/\./g, '');
  
  // Si el campo está vacío, no hacer nada
  if (valorSinFormato === '') return;
  
  // Formatear el número
  const valorFormateado = formatearNumeroMiles(valorSinFormato);
  
  // Actualizar el valor del input
  input.value = valorFormateado;
  
  // Ajustar la posición del cursor
  const diferencia = valorFormateado.length - valorOriginal.length;
  const nuevaPosicion = cursorPosition + diferencia;
  
  // Establecer la nueva posición del cursor
  input.setSelectionRange(nuevaPosicion, nuevaPosicion);
  
  // Guardar el valor numérico en un atributo data para su posterior procesamiento
  input.dataset.valorNumerico = valorSinFormato;
}

// Estado de la aplicación
const state = {
  presupuestoMensual: 0,
  semanas: [],
  gastos: [],
  usuario: 'usuario_actual', // En un entorno real, esto vendría de la autenticación
  categorias: [...CATEGORIAS_PREDETERMINADAS], // Categorías disponibles
  configuracion: {
    notificaciones: true,
    sonidos: true,
    tema: 'claro', // 'claro' u 'oscuro'
    moneda: 'ARS',
    primerDiaSemana: 1 // 0 para domingo, 1 para lunes
  },
  ui: {
    cargando: false,
    modoEdicion: false
  }
};

// Referencias a elementos del DOM
const elementos = {
  // Formularios
  formPresupuesto: document.getElementById('form-presupuesto'),
  formGasto: document.getElementById('form-gasto'),
  
  // Inputs
  inputPresupuesto: document.getElementById('presupuesto-mensual'),
  inputGastoId: document.getElementById('gasto-id'),
  inputSemana: document.getElementById('gasto-semana'),
  inputDescripcion: document.getElementById('gasto-descripcion'),
  inputMonto: document.getElementById('gasto-monto'),
  inputFecha: document.getElementById('gasto-fecha'),
  inputCategoria: document.getElementById('gasto-categoria'),
  
  // Contenedores
  semanasContainer: document.getElementById('semanas-container'),
  
  // Modal
  modalGasto: null,
  modalGastoTitulo: document.getElementById('modal-gasto-titulo'),
  
  // Botones
  btnReiniciar: document.getElementById('btn-reiniciar')
};

/**
 * Inicializa la aplicación
 */
function init() {
  // Inicializar componentes de Bootstrap
  if (document.getElementById('modal-gasto')) {
    elementos.modalGasto = new bootstrap.Modal(document.getElementById('modal-gasto'));
  }
  
  // Configurar eventos
  configurarEventos();
  
  // Cargar datos guardados
  cargarDatos();
  
  // Renderizar la interfaz
  renderizarSemanas();
}

/**
 * Configura los manejadores de eventos
 */
function configurarEventos() {
  // Formulario de presupuesto
  if (elementos.formPresupuesto) {
    elementos.formPresupuesto.addEventListener('submit', manejarGuardarPresupuesto);
    
    // Configurar eventos de entrada para formato numérico
    if (elementos.inputPresupuesto) {
      elementos.inputPresupuesto.addEventListener('input', manejarInputNumerico);
      // Eliminamos los manejadores de eventos antiguos que ya no son necesarios
      elementos.inputPresupuesto.removeEventListener('blur', formatearAlPerderFoco);
      elementos.inputPresupuesto.removeEventListener('focus', formatearAlObtenerFoco);
      
      // Configurar el tipo de entrada para dispositivos móviles
      elementos.inputPresupuesto.setAttribute('inputmode', 'numeric');
      elementos.inputPresupuesto.setAttribute('pattern', '[0-9.,]*');
    }
  }
  
  // Formulario de gasto
  if (elementos.formGasto) {
    elementos.formGasto.addEventListener('submit', manejarGuardarGasto);
    
    // Configurar formateo de entrada para monto de gasto
    if (elementos.inputMonto) {
      elementos.inputMonto.addEventListener('input', formatearInputNumerico);
      elementos.inputMonto.addEventListener('blur', formatearAlPerderFoco);
      elementos.inputMonto.addEventListener('focus', formatearAlObtenerFoco);
    }
  }
  
  // Botón de reiniciar
  if (elementos.btnReiniciar) {
    elementos.btnReiniciar.addEventListener('click', manejarReiniciar);
  }
  
  // Establecer fecha actual por defecto
  if (elementos.inputFecha) {
    const hoy = new Date().toISOString().split('T')[0];
    elementos.inputFecha.value = hoy;
  }
}

/**
 * Carga los datos guardados
 */
function cargarDatos() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY);
  
  if (datosGuardados) {
    try {
      const datos = JSON.parse(datosGuardados);
      state.presupuestoMensual = datos.presupuestoMensual || 0;
      state.gastos = datos.gastos || [];
      
      if (elementos.inputPresupuesto) {
        elementos.inputPresupuesto.value = state.presupuestoMensual;
      }
      
      // Inicializar semanas
      inicializarSemanas();
    } catch (error) {
      console.error('Error al cargar los datos:', error);
      mostrarMensaje('Error al cargar los datos guardados', 'danger');
    }
  } else {
    // Inicializar con valores por defecto
    inicializarSemanas();
  }
}

/**
 * Inicializa las semanas con el presupuesto dividido
 */
function inicializarSemanas() {
  state.semanas = [];
  const presupuestoSemanal = state.presupuestoMensual > 0 ? 
    Math.floor((state.presupuestoMensual / SEMANAS_POR_MES) * 100) / 100 : 0;
  
  for (let i = 1; i <= SEMANAS_POR_MES; i++) {
    const gastosSemana = state.gastos.filter(g => parseInt(g.semana) === i);
    const totalGastado = gastosSemana.reduce((sum, g) => sum + g.monto, 0);
    
    state.semanas.push({
      numero: i,
      nombre: `Semana ${i}`,
      presupuesto: presupuestoSemanal,
      gastos: gastosSemana,
      totalGastado: totalGastado,
      saldo: Math.max(0, presupuestoSemanal - totalGastado)
    });
  }
}
/**
 * Guarda los datos en el almacenamiento local
 */
function guardarDatos() {
  try {
    localStorage.setItem(
      STORAGE_KEY, 
      JSON.stringify({
        presupuestoMensual: state.presupuestoMensual,
        gastos: state.gastos
      })
    );
    return true;
  } catch (error) {
    console.error('Error al guardar los datos:', error);
    mostrarMensaje('Error al guardar los datos', 'danger');
    return false;
  }
}

/**
 * Formatea un input numérico mientras se escribe
 */
function formatearInputNumerico(e) {
  const input = e.target;
  let valor = input.value.replace(/[^\d,]/g, ''); // Solo números y comas
  
  // Reemplazar comas múltiples por una sola
  valor = valor.replace(/,+/g, ',');
  
  // Si hay más de una coma, mantener solo la primera
  const partes = valor.split(',');
  if (partes.length > 2) {
    valor = `${partes[0]},${partes[1]}`;
  }
  
  // Limitar a 2 decimales
  if (partes.length === 2 && partes[1].length > 2) {
    valor = `${partes[0]},${partes[1].substring(0, 2)}`;
  }
  
  // Actualizar el valor del input
  input.value = valor;
  
  // Guardar el valor formateado para usarlo al perder el foco
  if (input === elementos.inputPresupuesto) {
    elementos.inputPresupuesto.dataset.valor = valor;
  } else if (input === elementos.inputMonto) {
    elementos.inputMonto.dataset.valor = valor;
  }
}

/**
 * Formatea el valor al perder el foco
 */
function formatearAlPerderFoco(e) {
  const input = e.target;
  let valor = input.value;
  
  // Si está vacío, no hacer nada
  if (!valor) return;
  
  // Reemplazar comas por puntos para el parseo
  valor = valor.replace(',', '.');
  
  // Convertir a número y formatear
  const numero = parseFloat(valor);
  if (!isNaN(numero)) {
    // Guardar el valor numérico para su procesamiento
    if (input === elementos.inputPresupuesto) {
      elementos.inputPresupuesto.dataset.valorNumerico = numero;
    } else if (input === elementos.inputMonto) {
      elementos.inputMonto.dataset.valorNumerico = numero;
    }
    
    // Formatear con separadores de miles y decimales
    input.value = numero.toLocaleString('es-AR', FORMATO_MONEDA);
  }
}

/**
 * Restaura el valor sin formato al obtener el foco
 */
function formatearAlObtenerFoco(e) {
  const input = e.target;
  const valorNumerico = input.dataset.valorNumerico;
  
  if (valorNumerico !== undefined) {
    input.value = valorNumerico.toString().replace('.', ',');
  }
}

/**
 * Convierte un string de número formateado a número
 */
function desformatearNumero(valor) {
  if (!valor) return 0;
  
  // Reemplazar puntos (separadores de miles) y comas (decimales)
  const valorLimpio = valor.toString()
    .replace(/\./g, '')  // Eliminar puntos de miles
    .replace(',', '.');   // Convertir coma decimal a punto
    
  return parseFloat(valorLimpio) || 0;
}

/**
 * Maneja el guardado del presupuesto
 */
function manejarGuardarPresupuesto(e) {
  e.preventDefault();
  
  const form = e.target;
  
  if (!form.checkValidity()) {
    e.stopPropagation();
    form.classList.add('was-validated');
    return;
  }
  
  // Obtener el valor numérico del atributo data o del input
  const valorPresupuesto = elementos.inputPresupuesto.dataset.valorNumerico 
    ? parseFloat(elementos.inputPresupuesto.dataset.valorNumerico)
    : elementos.inputPresupuesto.value 
      ? parseFloat(elementos.inputPresupuesto.value.replace(/\./g, ''))
      : 0;
  
  const nuevoPresupuesto = valorPresupuesto;
  
  if (nuevoPresupuesto <= 0) {
    mostrarMensaje('El monto debe ser mayor a cero', 'danger');
    return;
  }
  
  state.presupuestoMensual = nuevoPresupuesto;
  
  // Reinicializar semanas con el nuevo presupuesto
  inicializarSemanas();
  
  // Guardar y renderizar
  if (guardarDatos()) {
    renderizarSemanas();
    mostrarMensaje('Presupuesto actualizado correctamente');
  }
}

/**
 * Abre el modal para agregar/editar un gasto
 * @param {number} semana - Número de semana (1-4)
 * @param {string} [gastoId] - ID del gasto a editar (opcional)
 */
function abrirModalGasto(semana, gastoId = null) {
  if (state.presupuestoMensual <= 0) {
    mostrarMensaje('Primero configura un presupuesto mensual', 'warning');
    return;
  }
  
  // Configurar el formulario
  elementos.formGasto.reset();
  elementos.inputSemana.value = semana;
  
  if (gastoId) {
    // Modo edición
    const gasto = state.gastos.find(g => g.id === gastoId);
    if (gasto) {
      elementos.modalGastoTitulo.textContent = 'Editar Gasto';
      elementos.inputGastoId.value = gasto.id;
      elementos.inputDescripcion.value = gasto.descripcion;
      elementos.inputMonto.value = gasto.monto;
      elementos.inputFecha.value = gasto.fecha;
      elementos.inputCategoria.value = gasto.categoria || '';
    }
  } else {
    // Modo nuevo
    elementos.modalGastoTitulo.textContent = 'Nuevo Gasto';
    elementos.inputGastoId.value = '';
    
    // Establecer fecha actual si no hay valor
    if (!elementos.inputFecha.value) {
      const hoy = new Date().toISOString().split('T')[0];
      elementos.inputFecha.value = hoy;
    }
  }
  
  // Mostrar el modal
  if (elementos.modalGasto) {
    elementos.modalGasto.show();
  }
  
  // Enfocar el primer campo
  setTimeout(() => {
    if (elementos.inputDescripcion) {
      elementos.inputDescripcion.focus();
    }
  }, 500);
}

/**
 * Maneja el guardado de un gasto
 * @param {Event} e - Evento del formulario
 */
async function manejarGuardarGasto(e) {
  e.preventDefault();
  
  const form = e.target;
  const btnGuardar = form.querySelector('button[type="submit"]');
  const btnGuardarOriginal = btnGuardar.innerHTML;
  
  try {
    // Mostrar estado de carga
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
    
    // Validar formulario
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    
    // Obtener y validar datos del formulario
    const monto = desformatearNumero(elementos.inputMonto.value);
    const descripcion = elementos.inputDescripcion.value.trim();
    const categoria = elementos.inputCategoria.value;
    const fecha = elementos.inputFecha.value;
    const semana = parseInt(elementos.inputSemana.value);
    const esEdicion = !!elementos.inputGastoId.value;
    
    // Validaciones adicionales
    if (isNaN(monto) || monto <= 0) {
      mostrarMensaje('El monto debe ser mayor a cero', 'error');
      elementos.inputMonto.focus();
      return;
    }
    
    if (descripcion.length < 3) {
      mostrarMensaje('La descripción debe tener al menos 3 caracteres', 'error');
      elementos.inputDescripcion.focus();
      return;
    }
    
    // Crear objeto de gasto
    const gasto = {
      id: elementos.inputGastoId.value || `gasto_${Date.now()}`,
      descripcion: descripcion,
      monto: monto,
      fecha: fecha,
      categoria: categoria,
      semana: semana,
      fechaRegistro: new Date().toISOString()
    };
    
    // Verificar si es una edición o un nuevo gasto
    const indiceExistente = state.gastos.findIndex(g => g.id === gasto.id);
    
    // Verificar si el gasto excede el presupuesto de la semana
    const semanaGasto = state.semanas.find(s => s.numero === semana);
    if (semanaGasto) {
      const gastoActual = esEdicion ? state.gastos.find(g => g.id === gasto.id) : null;
      const montoActual = gastoActual ? gastoActual.monto : 0;
      const nuevoTotal = semanaGasto.totalGastado - montoActual + monto;
      
      if (nuevoTotal > semanaGasto.presupuesto) {
        const excedente = nuevoTotal - semanaGasto.presupuesto;
        const confirmar = await mostrarConfirmacion(
          `Este gasto excederá el presupuesto de la semana por ${formatearMoneda(excedente)}. ¿Desea continuar?`,
          'Presupuesto excedido'
        );
        
        if (!confirmar) {
          return;
        }
      }
    }
    
    // Actualizar o agregar el gasto
    if (indiceExistente !== -1) {
      state.gastos[indiceExistente] = gasto;
    } else {
      state.gastos.push(gasto);
    }
    
    // Actualizar semanas y guardar
    state.cambiosSinGuardar = true;
    inicializarSemanas();
    
    const guardado = await guardarDatos();
    
    if (guardado) {
      // Cerrar el modal
      if (elementos.modalGasto) {
        elementos.modalGasto.hide();
      }
      
      // Mostrar notificación de éxito
      mostrarMensaje(
        `Gasto ${esEdicion ? 'actualizado' : 'agregado'} correctamente`,
        'success',
        '¡Listo!',
        true
      );
      
      // Reproducir sonido de éxito
      reproducirSonido('exito');
      
      // Actualizar la interfaz
      await renderizarSemanas();
      
      // Desplazarse a la tarjeta de la semana
      setTimeout(() => {
        const tarjetaSemana = document.querySelector(`[data-semana="${semana}"]`);
        if (tarjetaSemana) {
          tarjetaSemana.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          tarjetaSemana.classList.add('highlight');
          setTimeout(() => tarjetaSemana.classList.remove('highlight'), 2000);
        }
      }, 300);
    }
    
  } catch (error) {
    console.error('Error al guardar el gasto:', error);
    mostrarMensaje(
      'Ocurrió un error al guardar el gasto. Por favor, inténtalo de nuevo.',
      'error',
      'Error'
    );
  } finally {
    // Restaurar el botón
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = btnGuardarOriginal;
    }
  }
}

/**
 * Elimina un gasto con confirmación y retroalimentación visual
 * @param {string} gastoId - ID del gasto a eliminar
 * @returns {Promise<boolean>} - True si el gasto fue eliminado, false si fue cancelado
 */
async function eliminarGasto(gastoId) {
  try {
    // Buscar el gasto para mostrar información en la confirmación
    const gasto = state.gastos.find(g => g.id === gastoId);
    if (!gasto) {
      mostrarMensaje('No se encontró el gasto especificado', 'error');
      return false;
    }
    
    // Mostrar confirmación con detalles del gasto
    const confirmar = await Swal.fire({
      title: '¿Eliminar gasto?',
      html: `
        <p>¿Estás seguro de eliminar este gasto?</p>
        <div class="text-start bg-light p-3 rounded mt-2">
          <p class="mb-1"><strong>Descripción:</strong> ${gasto.descripcion}</p>
          <p class="mb-0"><strong>Monto:</strong> ${formatearMoneda(gasto.monto)}</p>
          ${gasto.categoria ? `<p class="mb-0"><strong>Categoría:</strong> ${gasto.categoria}</p>` : ''}
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
    
    if (!confirmar.isConfirmed) {
      return false;
    }
    
    // Eliminar el gasto
    const indice = state.gastos.findIndex(g => g.id === gastoId);
    
    if (indice !== -1) {
      // Guardar una copia del gasto eliminado (por si se deshace)
      const gastoEliminado = { ...state.gastos[indice] };
      const semanaGasto = gastoEliminado.semana;
      
      // Eliminar el gasto
      state.gastos.splice(indice, 1);
      
      // Marcar cambios pendientes de guardar
      state.cambiosSinGuardar = true;
      
      // Actualizar semanas
      inicializarSemanas();
      
      // Guardar cambios
      const guardado = await guardarDatos();
      
      if (guardado) {
        // Mostrar notificación con opción de deshacer
        const resultado = await Swal.fire({
          title: 'Gasto eliminado',
          text: 'El gasto ha sido eliminado correctamente.',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Aceptar',
          cancelButtonText: 'Deshacer',
          reverseButtons: true
        });
        
        // Si el usuario hace clic en Deshacer
        if (resultado.dismiss === Swal.DismissReason.cancel) {
          // Volver a agregar el gasto
          state.gastos.push(gastoEliminado);
          state.cambiosSinGuardar = true;
          
          // Guardar cambios
          await guardarDatos();
          
          // Actualizar la interfaz
          await renderizarSemanas();
          
          // Mostrar mensaje de confirmación
          mostrarMensaje('Acción deshecha correctamente', 'success');
          return false;
        }
        
        // Actualizar la interfaz
        await renderizarSemanas();
        
        // Reproducir sonido de éxito
        reproducirSonido('exito');
        
        // Desplazarse a la tarjeta de la semana
        setTimeout(() => {
          const tarjetaSemana = document.querySelector(`[data-semana="${semanaGasto}"]`);
          if (tarjetaSemana) {
            tarjetaSemana.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 300);
        
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    mostrarMensaje(
      'Ocurrió un error al eliminar el gasto. Por favor, inténtalo de nuevo.',
      'error',
      'Error'
    );
    return false;
  }
}

/**
 * Maneja el reinicio de la aplicación con confirmación visual
 */
function manejarReiniciar() {
  // Mostrar diálogo de confirmación personalizado
  const confirmarReinicio = () => {
    const modalHTML = `
      <div class="modal fade" id="confirmarReinicioModal" tabindex="-1" aria-labelledby="confirmarReinicioLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title" id="confirmarReinicioLabel">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Confirmar reinicio
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-exclamation-octagon-fill text-danger fs-1 me-3"></i>
                <div>
                  <h5>¿Estás seguro de reiniciar todos los datos?</h5>
                  <p class="mb-0 text-muted">Esta acción eliminará todos los gastos y configuraciones. No podrás recuperar esta información.</p>
                </div>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="confirmCheck">
                <label class="form-check-label" for="confirmCheck">
                  Entiendo que esta acción no se puede deshacer
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle me-1"></i> Cancelar
              </button>
              <button type="button" id="confirmarReinicioBtn" class="btn btn-danger" disabled>
                <i class="bi bi-arrow-repeat me-1"></i> Sí, reiniciar todo
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar el modal al cuerpo del documento
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar el modal
    const modalElement = document.getElementById('confirmarReinicioModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Habilitar/deshabilitar botón de confirmación
    const confirmCheck = modalElement.querySelector('#confirmCheck');
    const confirmButton = modalElement.querySelector('#confirmarReinicioBtn');
    
    if (confirmCheck && confirmButton) {
      confirmCheck.addEventListener('change', (e) => {
        confirmButton.disabled = !e.target.checked;
      });
      
      // Manejar la confirmación
      confirmButton.addEventListener('click', () => {
        // Cerrar el modal
        modal.hide();
        
        // Mostrar indicador de carga
        const loadingToast = mostrarMensaje(
          '<div class="text-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Reiniciando datos...</div>',
          'info'
        );
        
        // Realizar el reinicio después de un pequeño retraso
        setTimeout(() => {
          // Restablecer estado
          state.presupuestoMensual = 0;
          state.gastos = [];
          
          // Limpiar formularios
          if (elementos.formPresupuesto) {
            elementos.formPresupuesto.reset();
            elementos.formPresupuesto.classList.remove('was-validated');
          }
          
          if (elementos.formGasto) {
            elementos.formGasto.reset();
            elementos.formGasto.classList.remove('was-validated');
          }
          
          // Limpiar almacenamiento local
          localStorage.removeItem(STORAGE_KEY);
          
          // Actualizar la UI
          actualizarUI();
          
          // Cerrar el toast de carga
          if (loadingToast && typeof loadingToast.dismiss === 'function') {
            loadingToast.dismiss();
          }
          
          // Mostrar mensaje de éxito
          mostrarMensaje(
            '<div class="d-flex align-items-center">' +
            '<i class="bi bi-check-circle-fill text-success me-2"></i>' +
            '<div><strong>¡Datos reiniciados!</strong><br>Se han eliminado todos los gastos y configuraciones.</div>' +
            '</div>',
            'success'
          );
          
          // Eliminar el modal del DOM después de la animación
          setTimeout(() => {
            if (modalElement && modalElement.parentNode) {
              modalElement.parentNode.removeChild(modalElement);
            }
          }, 500);
          
        }, 1000);
      });
      
      // Limpiar el modal cuando se cierre
      modalElement.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => {
          if (modalElement && modalElement.parentNode) {
            modalElement.parentNode.removeChild(modalElement);
          }
        }, 500);
      });
    }
  };
  
  // Llamar a la función de confirmación
  confirmarReinicio();
}

/**
 * Actualiza la interfaz de usuario con los datos más recientes
 */
function actualizarUI() {
  actualizarSemanasUI();
  actualizarResumenUI();
  guardarEnLocalStorage();
  
  // Inicializar tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Inicializar popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl, {
      trigger: 'focus',
      html: true
    });
  });
}

/**
 * Renderiza las semanas en la interfaz
 */
function renderizarSemanas() {
  if (!elementos.semanasContainer) return;
  
  let html = '';
  
  state.semanas.forEach(semana => {
    const porcentajeGastado = semana.presupuesto > 0 ? 
      Math.min(100, Math.round((semana.totalGastado / semana.presupuesto) * 100)) : 0;
    
    // Determinar el color de la barra de progreso
    let barraClase = 'bg-success';
    if (porcentajeGastado > 80) {
      barraClase = 'bg-danger';
    } else if (porcentajeGastado > 50) {
      barraClase = 'bg-warning';
    }
    
    // Crear HTML de la semana
    html += `
      <div class="col-12 col-md-6 col-lg-3 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">${semana.nombre}</h5>
            <span class="badge bg-light text-dark">
              ${formatearMoneda(semana.saldo)} restantes
            </span>
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <span>Presupuesto:</span>
              <strong>${formatearMoneda(semana.presupuesto)}</strong>
            </div>
            <div class="d-flex justify-content-between mb-3">
              <span>Gastado:</span>
              <strong class="${semana.totalGastado > semana.presupuesto ? 'text-danger' : 'text-success'}">
                ${formatearMoneda(semana.totalGastado)}
              </strong>
            </div>
            
            <div class="progress mb-2" style="height: 10px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated ${barraClase}" 
                   role="progressbar" 
                   style="width: ${porcentajeGastado}%"
                   aria-valuenow="${porcentajeGastado}" 
                   aria-valuemin="0" 
                   aria-valuemax="100">
              </div>
            </div>
            <div class="d-flex justify-content-between mb-3">
              <small>0%</small>
              <small>${porcentajeGastado}%</small>
              <small>100%</small>
            </div>
            
            <div class="d-grid gap-2">
              <button class="btn btn-sm btn-outline-primary" 
                      onclick="abrirModalGasto(${semana.numero})">
                <i class="bi bi-plus-circle me-1"></i> Agregar Gasto
              </button>
            </div>
            
            ${semana.gastos.length > 0 ? `
              <hr class="my-3">
              <h6 class="mb-2">Gastos:</h6>
              <div class="list-group list-group-flush">
                ${semana.gastos.map(gasto => `
                  <div class="list-group-item list-group-item-action p-2">
                    <div class="d-flex justify-content-between align-items-center">
                      <div class="me-2">
                        <div class="fw-bold">${gasto.descripcion}</div>
                        <small class="text-muted">
                          ${gasto.categoria ? `${gasto.categoria} • ` : ''}${formatearFecha(gasto.fecha)}
                        </small>
                      </div>
                      <div class="text-end">
                        <div class="fw-bold">${formatearMoneda(gasto.monto)}</div>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-sm btn-outline-secondary" 
                                  onclick="event.stopPropagation(); abrirModalGasto(${gasto.semana}, '${gasto.id}');">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-danger" 
                                  onclick="event.stopPropagation(); eliminarGasto('${gasto.id}');">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  elementos.semanasContainer.innerHTML = html;
}

/**
 * Formatea un número como moneda
 * @param {number} monto - Monto a formatear
 * @returns {string} Monto formateado
 */
function formatearMoneda(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(monto);
}

/**
 * Formatea una fecha en formato YYYY-MM-DD a DD/MM/YYYY
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
function formatearFecha(fecha) {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * Obtiene la clase CSS para el color de la barra de progreso según el porcentaje
 */
function obtenerClaseProgreso(porcentaje) {
  if (porcentaje <= 50) return 'bg-success';
  if (porcentaje <= 80) return 'bg-warning';
  return 'bg-danger';
}

/**
 * Obtiene el ícono para el botón de acción según el porcentaje
 */
function obtenerIconoProgreso(porcentaje) {
  if (porcentaje <= 50) return 'emoji-smile';
  if (porcentaje <= 80) return 'emoji-neutral';
  return 'emoji-frown';
}

/**
 * Obtiene un mensaje motivacional según el porcentaje gastado
 */
function obtenerMensajeMotivacional(porcentaje, restante) {
  if (porcentaje === 0) {
    return '¡Comienza a registrar tus gastos esta semana!';
  }
  if (porcentaje < 30) {
    return `¡Excelente! Te quedan ${formatearMoneda(restante)} para gastar.`;
  }
  if (porcentaje < 60) {
    return `Vas bien, te quedan ${formatearMoneda(restante)} para esta semana.`;
  }
  if (porcentaje < 80) {
    return `Cuidado, has gastado el ${Math.round(porcentaje)}% de tu presupuesto.`;
  }
  if (porcentaje < 100) {
    return `¡Atención! Solo te quedan ${formatearMoneda(restante)}.`;
  }
  return '¡Has alcanzado tu presupuesto semanal!';
}

/**
 * Muestra un mensaje al usuario
 * @param {string} mensaje - El mensaje a mostrar
 * @param {string} tipo - El tipo de mensaje (success, error, warning, info)
 */
function mostrarMensaje(mensaje, tipo = 'info') {
  const toastContainer = document.getElementById('toast-container');
  
  // Crear toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo} show`;
  toast.role = 'alert';
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.id = `toast-${Date.now()}`;
  
  // Icono según el tipo
  let icono = 'info-circle';
  let titulo = 'Información';
  
  switch(tipo) {
    case 'success':
      icono = 'check-circle';
      titulo = '¡Éxito!';
      break;
    case 'error':
    case 'danger':
      icono = 'exclamation-triangle';
      titulo = 'Error';
      break;
    case 'warning':
      icono = 'exclamation-circle';
      titulo = 'Advertencia';
      break;
  }
  
  // Plantilla del toast
  toast.innerHTML = `
    <div class="toast-header">
      <i class="bi bi-${icono} me-2"></i>
      <strong class="me-auto">${titulo}</strong>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>
    <div class="toast-body">
      ${mensaje}
    </div>
  `;
  
  // Agregar al contenedor
  toastContainer.appendChild(toast);
  
  // Inicializar tooltips
  const tooltipTriggerList = [].slice.call(toast.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Eliminar después de 5 segundos
  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };
  
  const timer = setTimeout(removeToast, 5000);
  
  // Cerrar al hacer clic en el botón
  const closeButton = toast.querySelector('.btn-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      clearTimeout(timer);
      removeToast();
    });
  }
  
  // Cerrar al hacer clic fuera del toast
  toast.addEventListener('click', (e) => {
    if (e.target === toast) {
      clearTimeout(timer);
      removeToast();
    }
  });
  
  return {
    dismiss: () => {
      clearTimeout(timer);
      removeToast();
    }
  };
}

// Configurar eventos globales
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar la aplicación
  init();
  
  // Configurar eventos de teclado para accesibilidad
  document.addEventListener('keydown', (e) => {
    // Cerrar modales con Escape
    if (e.key === 'Escape') {
      const modalesAbiertos = document.querySelectorAll('.modal.show');
      if (modalesAbiertos.length > 0) {
        const modal = bootstrap.Modal.getInstance(modalesAbiertos[0]);
        if (modal) modal.hide();
      }
    }
  });
  
  // Mejorar accesibilidad de los tooltips
  document.body.addEventListener('focus', (e) => {
    const target = e.target;
    if (target.matches('[data-bs-toggle="tooltip"]')) {
      const tooltip = bootstrap.Tooltip.getInstance(target);
      if (tooltip) tooltip.show();
    }
  }, true);
  
  document.body.addEventListener('blur', (e) => {
    const target = e.target;
    if (target.matches('[data-bs-toggle="tooltip"]')) {
      const tooltip = bootstrap.Tooltip.getInstance(target);
      if (tooltip) tooltip.hide();
    }
  }, true);
});

// Manejar cambios en la conexión a internet
window.addEventListener('online', () => {
  mostrarMensaje('¡Conexión restablecida!', 'success');
  // Sincronizar datos si es necesario
  sincronizarDatos();
});

window.addEventListener('offline', () => {
  mostrarMensaje('Sin conexión a internet. Los cambios se guardarán localmente.', 'warning');
});

// Manejar el evento antes de que la página se cierre
window.addEventListener('beforeunload', (e) => {
  if (state.cambiosSinGuardar) {
    // Cancelar el evento para mostrar el diálogo de confirmación
    e.preventDefault();
    // Mensaje estándar (la mayoría de los navegadores ya no lo muestran)
    e.returnValue = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?';
    return e.returnValue;
  }
});
