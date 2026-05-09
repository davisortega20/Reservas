const TOTAL_MESAS = 6;

let reservas = cargaReservas();

function cargaReservas(){
    return [];
}

function guardaReservas(list){
    // Sin persistencia: solo memoria en esta sesión
}

const tableImages = [
    'MESAS-1080x675.jpg',
    'restaurant-table-2021-08-30-02-18-19-utc-scaled.jpg',
    'mesa-elegante.webp',
    'mesa-foto.jpeg',
    'mesa-captura1.png',
    'mesa-captura2.png',
    'chatgpt-image.png'
];

function idCorto(){
    return Date.now().toString(36).slice(-6);
}

function formatearFechaHora(iso){
    return new Date(iso).toLocaleString();
}

function getTableImage(i){
    const nombre = tableImages[i - 1] || 'MESAS-1080x675.jpg';
    return 'imagenes/' + nombre;
}

function getReportDates(){
    const fromValue = document.getElementById('fromDate').value;
    const toValue = document.getElementById('toDate').value;

    return {
        from: fromValue ? new Date(fromValue).setHours(0,0,0,0) : null,
        to: toValue ? new Date(toValue).setHours(23,59,59,999) : null
    };
}

function filterReservations(){
    const { from, to } = getReportDates();

    return reservas.filter(r => {
        const dateValue = new Date(r.datetime).getTime();

        if (from && dateValue < from) return false;
        if (to && dateValue > to) return false;

        return true;
    }).sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
}

function renderMesas(){
    const con = document.getElementById('tables');

    con.innerHTML = '';

    console.log('Rendering mesas...');

    for (let i = 1; i <= TOTAL_MESAS; i++){

        const card = document.createElement('div');
        card.className = 'tableCard';

        const ahora = Date.now();

        const proxima = reservas
            .filter(r =>
                r.table === i &&
                new Date(r.datetime).getTime() >= ahora &&
                r.status !== 'cancelada'
            )
            .sort((a,b) => new Date(a.datetime) - new Date(b.datetime))[0];

        const imageSrc = getTableImage(i);

        console.log('Table ' + i + ' image: ' + imageSrc);

        card.innerHTML = `
            <img 
                src="${imageSrc}" 
                alt="mesa ${i}"
                style="width: 200px; height: 150px; object-fit: cover; border-radius: 10px;"
                onerror="this.src='imagenes/MESAS-1080x675.jpg'; console.log('Error cargando imagen')"
            >

            <div class="tableName">
                Mesa ${i}
            </div>

            <div class="tableDesc">
                ${
                    proxima
                    ? 'Reservada: ' +
                      formatearFechaHora(proxima.datetime) +
                      ' - ' +
                      proxima.name
                    : 'Libre'
                }
            </div>
        `;

        con.appendChild(card);
    }

    console.log('Mesas rendered');
}

function renderReport(){

    const reportArea = document.getElementById('reportArea');
    const results = filterReservations();

    reportArea.innerHTML = '';

    if (results.length === 0) {
        reportArea.innerHTML =
            '<p>No hay reservas en el rango seleccionado.</p>';
        return;
    }

    results.forEach(r => {

        const card = document.createElement('div');

        card.className = 'reportCard';

        card.innerHTML = `
            <h4>Reserva ${r.id}</h4>

            <p><strong>Nombre:</strong> ${r.name}</p>

            <p><strong>Email:</strong> ${r.email}</p>

            <p><strong>Contacto:</strong> ${r.phone}</p>

            <p><strong>Mesa:</strong> ${r.table}</p>

            <p><strong>Fecha y hora:</strong> ${formatearFechaHora(r.datetime)}</p>

            <p><strong>Estado:</strong> ${r.status}</p>
        `;

        reportArea.appendChild(card);
    });
}

function generateCsv(reservasList){

    const header = [
        'id',
        'name',
        'email',
        'phone',
        'table',
        'datetime',
        'status'
    ];

    const rows = reservasList.map(r => [
        r.id,
        r.name,
        r.email,
        r.phone,
        r.table,
        r.datetime,
        r.status
    ].map(value =>
        `"${String(value).replace(/"/g, '""')}"`
    ).join(','));

    return [header.join(','), ...rows].join('\n');
}

function setCsvPreview(text){

    const csvText = document.getElementById('csvText');

    csvText.textContent = text;
}

function updateSummary(){

    const summaryTotal = document.getElementById('summaryTotal');
    const summaryTables = document.getElementById('summaryTables');
    const summaryActive = document.getElementById('summaryActive');

    const activeReservations =
        reservas.filter(r => r.status !== 'cancelada');

    const uniqueTables =
        [...new Set(activeReservations.map(r => r.table))];

    summaryTotal.textContent = reservas.length;
    summaryTables.textContent = uniqueTables.length;
    summaryActive.textContent = activeReservations.length;
}

function downloadCsv(text){

    const blob = new Blob(
        [text],
        { type: 'text/csv;charset=utf-8;' }
    );

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    link.download = 'reserva_report.csv';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
}

function initEvents(){

    const form = document.getElementById('formReservation');

    const btnShowReport =
        document.getElementById('btnShowReport');

    const btnPreviewCsv =
        document.getElementById('btnPreviewCsv');

    const btnExportCsv =
        document.getElementById('btnExportCsv');

    const btnDownloadCsv =
        document.getElementById('btnDownloadCsv');

    const btnClosePreview =
        document.getElementById('btnClosePreview');

    form.addEventListener('submit', function(e){

        e.preventDefault();

        const formData = new FormData(this);

        const tableNumber =
            parseInt(formData.get('mesa'), 10);

        const datetime =
            formData.get('fechahora');

        if (
            Number.isNaN(tableNumber) ||
            tableNumber < 1 ||
            tableNumber > TOTAL_MESAS
        ){
            alert(
                'Ingrese un número de mesa válido entre 1 y ' +
                TOTAL_MESAS +
                '.'
            );
            return;
        }

        if (
            !datetime ||
            new Date(datetime).getTime() < Date.now()
        ){
            alert('Ingrese una fecha y hora futura.');
            return;
        }

        const hasConflict = reservas.some(r =>
            r.table === tableNumber &&
            r.datetime === datetime &&
            r.status !== 'cancelada'
        );

        if (hasConflict){
            alert(
                'Esa mesa ya está reservada para la misma fecha y hora.'
            );
            return;
        }

        const reserva = {
            id: idCorto(),
            name: formData.get('nombre'),
            email: formData.get('email'),
            phone: formData.get('contacto'),
            table: tableNumber,
            datetime: datetime,
            status: 'activa'
        };

        reservas.push(reserva);

        guardaReservas(reservas);

        renderMesas();

        updateSummary();

        setCsvPreview(
            'No hay datos para mostrar todavía.'
        );

        this.reset();
    });

    btnShowReport.addEventListener('click', function(){
        renderReport();
    });

    btnPreviewCsv.addEventListener('click', function(){

        const filtered = filterReservations();

        const csv =
            filtered.length > 0
            ? generateCsv(filtered)
            : 'No hay datos para mostrar todavía.';

        setCsvPreview(csv);
    });

    btnExportCsv.addEventListener('click', function(){

        const filtered = filterReservations();

        if (filtered.length === 0){
            alert(
                'No hay reservas para exportar en el rango seleccionado.'
            );
            return;
        }

        downloadCsv(generateCsv(filtered));
    });

    btnDownloadCsv.addEventListener('click', function(){

        const csvText =
            document.getElementById('csvText').textContent;

        if (
            !csvText ||
            csvText.includes('No hay datos para mostrar')
        ){
            alert(
                'Primero presione CSV Preview para generar el contenido.'
            );
            return;
        }

        downloadCsv(csvText);
    });

    btnClosePreview.addEventListener('click', function(){

        setCsvPreview(
            'No hay datos para mostrar todavía.'
        );
    });
}

renderMesas();
updateSummary();
initEvents();