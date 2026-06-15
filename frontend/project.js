// OBLIGAMOS A QUE APUNTE AL BACKEND DE VERCEL SIEMPRE
const API_URL = 'https://proyecto-final-nexus-production.up.railway.app/api/buses';

const formBus = document.getElementById('form-bus');
const tablaBuses = document.getElementById('tabla-buses');
const faqPanel = document.getElementById('faq-panel');
const btnSupportToggle = document.getElementById('btn-support-toggle');

let editando = false;
let idBusAEditar = null;

// Ejecución segura al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    obtenerBuses();
    if (btnSupportToggle) {
        configurarSoporte();
    }
});

function cambiarPanel(nombrePanel) {
    const paneles = document.querySelectorAll('.panel-content');
    const botones = document.querySelectorAll('.tab-btn');
    
    if(paneles.length > 0) paneles.forEach(panel => panel.classList.remove('active'));
    if(botones.length > 0) botones.forEach(btn => btn.classList.remove('active'));

    const panelActivo = document.getElementById(`panel-${nombrePanel}`);
    const btnActivo = document.getElementById(`btn-nav-${nombrePanel}`);

    if (panelActivo) panelActivo.classList.add('active');
    if (btnActivo) btnActivo.classList.add('active');
}

// 1. OBTENER LOS BUSES (GET)
async function obtenerBuses() {
    if (!tablaBuses) return; 
    
    try {
        // CORREGIDO: Ahora usa la API_URL dinámica en vez de localhost fijo
        const respuesta = await fetch(API_URL, {
    method: 'GET',
    headers: {
        'Bypass-Tunnel-Reminder': 'true', // 👈 ESTA LÍNEA ROMPE EL BLOQUEO DE UNA
        'Content-Type': 'application/json'
    }
}); 
        if (!respuesta.ok) throw new Error('Error en la respuesta del servidor');
        
        const buses = await respuesta.json();
        tablaBuses.innerHTML = '';

        buses.forEach(bus => {
            let claseBadge = 'badge-regular';
            if (bus.estado_cliente === 'Nuevo') claseBadge = 'badge-nuevo';
            if (bus.estado_cliente === 'Fijo') claseBadge = 'badge-fijo';

            const horaLimpia = bus.hora_salida ? bus.hora_salida.substring(0, 5) : '--:--';

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${bus.id}</td>
                <td><strong>${bus.placa}</strong></td>
                <td>${bus.linea}</td>
                <td>${bus.capacidad} puestos</td>
                <td>${horaLimpia}</td>
                <td>#${bus.num_boleto || 0}</td>
                <td><span class="badge ${claseBadge}">${bus.estado_cliente || 'Regular'}</span></td>
                <td>${bus.tlf_pasajero || 'Sin registrar'}</td>
                <td>
                    <div class="btn-action-container">
                        <button class="btn-edit" onclick="prepararEdicion(
                        ${bus.id}, 
                       '${bus.placa}', 
                       '${bus.linea}',
                        ${bus.capacidad},
                       '${horaLimpia}',
                        ${bus.num_boleto}, 
                       '${bus.estado_cliente}',
                       '${bus.tlf_pasajero}')">Editar</button>
                        <button class="btn-delete" onclick="eliminarBus(${bus.id})">Eliminar</button>
                    </div>
                </td>
            `;
            tablaBuses.appendChild(fila);
        });
    } catch (error) {
        console.error('Error al obtener autobuses de la BD:', error.message);
    }
}

// 2. GUARDAR O MODIFICAR (POST / PUT)
if (formBus) {
    formBus.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        try {
            const placa = document.getElementById('placa').value.toUpperCase();
            const linea = document.getElementById('linea').value;
            const capacidad = parseInt(document.getElementById('capacidad').value);
            const hora_salida = document.getElementById('hora_salida').value;
            const num_boleto = parseInt(document.getElementById('num_boleto').value) || 0;
            const estado_cliente = document.getElementById('estado_cliente').value;
            const tlf_pasajero = document.getElementById('tlf_pasajero').value;

            const datosBus = { placa, linea, capacidad, hora_salida, num_boleto, estado_cliente, tlf_pasajero };

            let respuesta;
            
            if (editando) {
                respuesta = await fetch(`${API_URL}/${idBusAEditar}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosBus)
                });
                editando = false;
                idBusAEditar = null;
                document.querySelector('.btn').innerText = 'Guardar y Ver Registros';
                document.getElementById('titulo-formulario').innerText = 'Registrar Nueva Unidad';
            } else {
                respuesta = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosBus)
                });
            }

            if (respuesta && respuesta.ok) {
                formBus.reset();       
                await obtenerBuses();  
                cambiarPanel('unidades'); 
            } else {
                const errorBackend = await respuesta.json();
                // CORREGIDO: Texto de alerta adaptado a la arquitectura PostgreSQL actual
                alert('Error de base de datos PostgreSQL: ' + (errorBackend.error || 'Fallo desconocido'));
            }
        } catch (error) {
            console.error('Error crítico al intentar enviar el formulario:', error.message);
            alert('No se pudo establecer conexión con el servidor API Nexus.');
        }
    });
}

// 3. ELIMINAR UN AUTOBÚS (DELETE)
async function eliminarBus(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta unidad de transporte?')) {
        try {
            const respuesta = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (respuesta.ok) obtenerBuses(); 
        } catch (error) {
            console.error('Error al eliminar autobús:', error.message);
        }
    }
}

// 4. PREPARAR EDICIÓN
function prepararEdicion(id, placa, linea, capacidad, hora_salida, num_boleto, estado_cliente, tlf_pasajero) {
    try {
        document.getElementById('placa').value = placa;
        document.getElementById('linea').value = linea;
        document.getElementById('capacidad').value = capacidad;
        document.getElementById('hora_salida').value = hora_salida;
        document.getElementById('num_boleto').value = num_boleto;
        document.getElementById('estado_cliente').value = estado_cliente;
        document.getElementById('tlf_pasajero').value = tlf_pasajero;

        editando = true;
        idBusAEditar = id;
        
        document.querySelector('.btn').innerText = 'Actualizar Registro';
        document.getElementById('titulo-formulario').innerText = 'Modificando Unidad #' + id;
        cambiarPanel('registro');
    } catch (err) {
        console.error('Error al repoblar el formulario para editar:', err.message);
    }
}

function configurarSoporte() {
    btnSupportToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        faqPanel.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (faqPanel && !faqPanel.classList.contains('hidden') && !faqPanel.contains(e.target) && e.target !== btnSupportToggle) {
            faqPanel.classList.add('hidden');
        }
    });
}