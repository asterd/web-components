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
                    background-color: #f4f4f4;
                }
                button {
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    font-size: 14px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                button:hover {
                    background-color: #0056b3;
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
                }
            </style>
            <div class="table-container">
                <button id="refresh-button" disabled>Refresh</button>
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

        // Assegna il bottone di refresh
        this.shadowRoot
            .querySelector('#refresh-button')
            .addEventListener('click', () => this.refreshData());
    }

    setAuthToken(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token provided');
        }
        this.#token = token;
        this.#authHeader = `Bearer ${token}`;

        // Abilita il rendering solo dopo l'autenticazione
        const refreshButton = this.shadowRoot.querySelector('#refresh-button');
        refreshButton.disabled = false;

        // Notifica che il componente è pronto
        this.dispatchEvent(new CustomEvent('auth-ready', { bubbles: true, composed: true }));

        // Esegue il primo rendering solo se user e program sono definiti
        if (this.user && this.program) {
            this.#fetchAndRenderData();
        }
    }

    connectedCallback() {
        // Recupera i parametri user e program
        this.user = this.getAttribute('user');
        this.program = this.getAttribute('program');

        // Verifica che i parametri essenziali siano presenti
        const errorMessage = this.shadowRoot.querySelector('#error-message');
        if (!this.user || !this.program) {
            errorMessage.textContent = 'Missing required parameters: user or program.';
            return;
        }

        errorMessage.textContent = 'Waiting for authentication...';
    }

    refreshData() {
      this.#fetchAndRenderData();
    }

    async #fetchAndRenderData() {
        const url = `https://websmart.dev.brunellocucinelli.it/bc/api/utils/export/log/generic?username=${this.user}&programName=${this.program}`;
        const errorMessage = this.shadowRoot.querySelector('#error-message');
        const tbody = this.shadowRoot.querySelector('#data-table tbody');

        try {
            errorMessage.textContent = 'Loading...';

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    // 'Authorization': this.#authHeader,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }

            const data = await response.json();
            const rows = data; // Supponendo che `data` sia un array di oggetti

            // Pulisce il contenuto precedente
            tbody.innerHTML = '';

            // Popola la tabella con i nuovi dati
            /*
            rows.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.PID || ''}</td>
                    <td>${row.STATUS || ''}</td>
                    <td>${row.ERROR_MSG || ''}</td>
                    <td>${row.TS_START || ''}</td>
                    <td>${row.TS_END || ''}</td>
                    <td>${row.FILENAME || ''}</td>
                `;
                tbody.appendChild(tr);
            });
            */

            rows.forEach(row => {
                const tr = document.createElement('tr');
            
                // Crea una cella per l'URL
                const urlCell = document.createElement('td');
            
                if (row.FILENAME) {
                    // Crea un'ancora con l'icona
                    const anchor = document.createElement('a');
                    anchor.href = row.FILENAME;
                    anchor.target = '_blank'; // Per aprire il file in una nuova scheda
                    anchor.download = ''; // Suggerisce il download al clic
                    anchor.title = 'Download Excel file';
            
                    // Icona SVG di esempio (puoi sostituire con un'immagine)
                    anchor.innerHTML = `
                        <svg width="800px" height="800px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <title>file_type_excel2</title><path d="M28.781,4.405H18.651V2.018L2,4.588V27.115l16.651,2.868V26.445H28.781A1.162,1.162,0,0,0,30,25.349V5.5A1.162,1.162,0,0,0,28.781,4.405Zm.16,21.126H18.617L18.6,23.642h2.487v-2.2H18.581l-.012-1.3h2.518v-2.2H18.55l-.012-1.3h2.549v-2.2H18.53v-1.3h2.557v-2.2H18.53v-1.3h2.557v-2.2H18.53v-2H28.941Z" style="fill:#20744a;fill-rule:evenodd"/><rect x="22.487" y="7.439" width="4.323" height="2.2" style="fill:#20744a"/><rect x="22.487" y="10.94" width="4.323" height="2.2" style="fill:#20744a"/><rect x="22.487" y="14.441" width="4.323" height="2.2" style="fill:#20744a"/><rect x="22.487" y="17.942" width="4.323" height="2.2" style="fill:#20744a"/><rect x="22.487" y="21.443" width="4.323" height="2.2" style="fill:#20744a"/><polygon points="6.347 10.673 8.493 10.55 9.842 14.259 11.436 10.397 13.582 10.274 10.976 15.54 13.582 20.819 11.313 20.666 9.781 16.642 8.248 20.513 6.163 20.329 8.585 15.666 6.347 10.673" style="fill:#ffffff;fill-rule:evenodd"/>
                        </svg>
                    `;
            
                    urlCell.appendChild(anchor);
                } else {
                    urlCell.textContent = ''; // Nessun URL
                }
            
                // Costruisci la riga
                tr.innerHTML = `
                    <td>${row.PID || ''}</td>
                    <td>${row.STATUS || ''}</td>
                    <td>${row.ERROR_MSG || ''}</td>
                    <td>${row.TS_START || ''}</td>
                    <td>${row.TS_END || ''}</td>
                `;
                tr.appendChild(urlCell);
            
                tbody.appendChild(tr);
            });

            // Gestisce il caso di nessuna riga
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
*/
