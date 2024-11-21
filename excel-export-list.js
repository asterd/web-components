class ExcelExportListWidget extends HTMLElement {
    #token;
    #authHeader;

    constructor() {
        super();

        // Creiamo lo shadow DOM
        this.attachShadow({ mode: 'open' });

        // Template HTML base
        this.shadowRoot.innerHTML = `
            <style>
                .table-container {
                    font-family: Arial, sans-serif;
                    margin: 20px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #354a5f; /* Bluette */
                    color: white;
                    text-align: left;
                    padding: 6px;
                    font-size: 12px;
                }
                td {
                    padding: 6px;
                    text-align: left;
                }
                tr:nth-child(odd) {
                    background-color: #f9f9f9;
                }
                tr:nth-child(even) {
                    background-color: #f1f1f1;
                }
                button {
                    background-color: #606060;
                    color: white;
                    border: none;
                    padding: 6px 10px; /* Altezza e larghezza ridotte */
                    font-size: 12px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                button:hover {
                    background-color: #505050;
                }
                .error {
                    color: red;
                    margin-top: 10px;
                }
                a {
                    text-decoration: none;
                    color: inherit;
                }
                a svg {
                    vertical-align: middle;
                    cursor: pointer;
                    transition: transform 0.2s;
                    max-height: 28px; /* Limita l'altezza massima */
                    width: auto; /* Mantiene le proporzioni */
                }
                .error-row {
                    border-left: 4px solid red;
                    animation: fadeIn 0.3s ease-in-out;
                }
                .completed-row {
                    border-left: 4px solid green;
                    animation: fadeIn 0.3s ease-in-out;
                }
                .status-icon {
                    margin-left: 8px;
                    font-size: 1rem;
                    vertical-align: middle;
                }
                .error-icon {
                    color: red;
                }
                .completed-icon {
                    color: green;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
            </style>
            <div class="table-container">
                <button id="refresh-button">Refresh</button>
                <div id="error-message" class="error"></div>
                <table id="data-table">
                    <thead>
                        <tr>
                            <th>PID</th>
                            <th>STATUS</th>
                            <th>ERROR_MSG</th>
                            <th>TS_START</th>
                            <th>TS_END</th>
                            <th>URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="6">No data available</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        // Aggiunge l'evento per il bottone di refresh
        this.shadowRoot
            .querySelector('#refresh-button')
            .addEventListener('click', () => this.refreshData());
    }

    setAuthToken(token) {
        if (token && typeof token === 'string') {
            this.#token = token;
            this.#authHeader = `Bearer ${token}`;
        } else {
            this.#token = null;
            this.#authHeader = null;
        }

        // Notifica che il componente è pronto
        this.dispatchEvent(new CustomEvent('auth-ready', { bubbles: true, composed: true }));

        // Effettua il rendering immediato
        if (this.user && this.program) {
            this.#fetchAndRenderData();
        }
    }

    connectedCallback() {
        // Recupera i parametri user e program
        this.user = this.getAttribute('user');
        this.program = this.getAttribute('program');

        const errorMessage = this.shadowRoot.querySelector('#error-message');
        const refreshButton = this.shadowRoot.querySelector('#refresh-button');

        if (!this.user || !this.program) {
            errorMessage.textContent = 'Missing required parameters: user or program.';
            refreshButton.disabled = true;
            return;
        }

        // Abilita il tasto Refresh e mostra il messaggio di caricamento
        refreshButton.disabled = false;
        errorMessage.textContent = 'Loading...';

        // Effettua la chiamata iniziale anche senza autenticazione
        this.#fetchAndRenderData();
    }

    refreshData() {
        const errorMessage = this.shadowRoot.querySelector('#error-message');
        errorMessage.textContent = 'Refreshing data...';
        this.#fetchAndRenderData();
    }

    async #fetchAndRenderData() {
        const url = `https://websmart.dev.brunellocucinelli.it/bc/api/utils/export/log/generic?username=${this.user}&programName=${this.program}`;
        const errorMessage = this.shadowRoot.querySelector('#error-message');
        const tbody = this.shadowRoot.querySelector('#data-table tbody');
        const thead = this.shadowRoot.querySelector('#data-table thead');

        try {
            errorMessage.textContent = 'Loading...';

            const headers = {
                'Content-Type': 'application/json',
            };

            if (this.#authHeader) {
                headers['Authorization'] = this.#authHeader;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers,
                credentials: 'include',
            });
        
            if (response.status === 401) {
                // Token scaduto o non valido: emetti un evento
                this.dispatchEvent(new CustomEvent('token-expired', {
                    bubbles: true,
                    composed: true,
                    detail: { message: 'Token expired or invalid.' }
                }));
                throw new Error('Your session has expired. Please refresh your token.');
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }

            const data = await response.json();
            const rows = data; // Supponendo che `data` sia un array di oggetti

            // Pulisce il contenuto precedente
            tbody.innerHTML = '';
            // Imposta gli header personalizzati
            thead.innerHTML = `
                <tr>
                    <th>PID</th>
                    <th>Stato</th>
                    <th>Messaggi</th>
                    <th>Inizio</th>
                    <th>Fine</th>
                    <th>File</th>
                </tr>
            `;

            // Popola la tabella con i nuovi dati
            rows.forEach(row => {
                const tr = document.createElement('tr');

                // Aggiungi classe in base allo stato
                if (row.STATUS === 'E') {
                    tr.classList.add('error-row');
                } else if (row.STATUS === 'D') {
                    tr.classList.add('completed-row');
                }

                // build error message cell
                const errorMsgCell = document.createElement('td');
                const fullErrorMsg = row.ERROR_MSG || '';
                const shortErrorMsg = fullErrorMsg.length > 25
                    ? `${fullErrorMsg.slice(0, 25)}...`
                    : fullErrorMsg;
                errorMsgCell.textContent = shortErrorMsg;
                errorMsgCell.style.cursor = 'pointer';
                errorMsgCell.title = 'Click to view full message';
                errorMsgCell.addEventListener('click', () => {
                    alert(`Full Error Message:\n\n${fullErrorMsg}`);
                });

                // build excel url cell
                const urlCell = document.createElement('td');
                if (row.FILENAME) {
                    const anchor = document.createElement('a');
                    anchor.href = row.FILENAME;
                    anchor.target = '_blank';
                    anchor.download = '';
                    anchor.title = 'Download Excel file';
                    anchor.innerHTML = `
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <title>file_type_excel2</title>
                            <path d="M28.781,4.405H18.651V2.018L2,4.588V27.115l16.651,2.868V26.445H28.781A1.162,1.162,0,0,0,30,25.349V5.5A1.162,1.162,0,0,0,28.781,4.405Zm.16,21.126H18.617L18.6,23.642h2.487v-2.2H18.581l-.012-1.3h2.518v-2.2H18.55l-.012-1.3h2.549v-2.2H18.53v-1.3h2.557v-2.2H18.53v-1.3h2.557v-2.2H18.53v-2H28.941Z" style="fill:#20744a;fill-rule:evenodd"/>
                            <rect x="22.487" y="7.439" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="10.94" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="14.441" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="17.942" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="21.443" width="4.323" height="2.2" style="fill:#20744a"/>
                            <polygon points="6.347 10.673 8.493 10.55 9.842 14.259 11.436 10.397 13.582 10.274 10.976 15.54 13.582 20.819 11.313 20.666 9.781 16.642 8.248 20.513 6.163 20.329 8.585 15.666 6.347 10.673" style="fill:#ffffff;fill-rule:evenodd"/>
                        </svg>
                    `;
                    urlCell.appendChild(anchor);
                } else {
                    urlCell.textContent = '';
                }

                tr.innerHTML = `
                    <td>${row.PID || ''}</td>
                    <td>
                        ${row.STATUS || ''}
                        ${row.STATUS === 'E' ? '<span class="status-icon error-icon" title="Error">&#9888;</span>' : ''}
                        ${row.STATUS === 'D' ? '<span class="status-icon completed-icon" title="Completed">&#10003;</span>' : ''}
                        ${row.STATUS !== 'D' && row.STATUS !== 'E' ? '<span class="status-icon pending-icon" title="Pending">&#8635;</span>' : ''}
                    </td>
                    <td></td>
                    <td>${row.TS_START || ''}</td>
                    <td>${row.TS_END || ''}</td>
                `;
                tr.replaceChild(errorMsgCell, tr.children[2]);
                tr.appendChild(urlCell);
                tbody.appendChild(tr);
            });

            if (rows.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6">No data available</td></tr>`;
            }

            errorMessage.textContent = '';
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6">No data available</td></tr>`;
            errorMessage.textContent = `Error: ${error.message}`;
        }
    }
}

// Registriamo il custom element
customElements.define('excel-export-list', ExcelExportListWidget);


/*
// 1. Utilizzo dichiarativo con inizializzazione successiva
<authenticated-component 
    id="myComponent"
    api-url="https://api.example.com">
</authenticated-component>
<script>
    const component = document.getElementById('myComponent');
    // Imposta il token quando lo hai disponibile
    component.setAuthToken(token);
    
    // Ascolta gli eventi
    component.addEventListener('auth-ready', () => {
        console.log('Component ready to make authenticated calls');
    });
    
    component.addEventListener('api-error', (event) => {
        console.error('API error:', event.detail.error);
    });
</script>

// 2. Dichiarativo con configurazione
<authenticated-component id="myApi" api-url="https://api.example.com">
</authenticated-component>
// Nel tuo codice
const api = document.getElementById('myApi');
// Opzione A: Token diretto se già lo hai
api.setAuthToken(existingToken);


// 3. Gestione token scaduto
const exportListWidget = document.querySelector('excel-export-list');

exportListWidget.addEventListener('token-expired', async (event) => {
    console.log(event.detail.message); // Log dell'errore
    
    // Logica per rinnovare il token
    const newToken = await refreshAuthToken();

    // Aggiorna il token nel componente
    exportListWidget.setAuthToken(newToken);

    // Ricarica i dati
    exportListWidget.refreshData();
});

async function refreshAuthToken() {
    // Logica per ottenere un nuovo token
    const response = await fetch('URL_DI_REFRESH', { method: 'POST' });
    const data = await response.json();
    return data.token;
}
*/





