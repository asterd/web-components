// simple-widget.js
class SimpleWidget extends HTMLElement {
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

        // Assegna il bottone di refresh
        this.shadowRoot
            .querySelector('#refresh-button')
            .addEventListener('click', () => this.fetchAndRenderData());
    }

    connectedCallback() {
        // Recupera i parametri user e program
        this.user = this.getAttribute('user');
        this.program = this.getAttribute('program');

        if (!this.user || !this.program) {
            this.shadowRoot.querySelector('#error-message').textContent =
                'Missing required parameters: user and program.';
            return;
        }

        // Chiama l'API e renderizza la tabella
        this.fetchAndRenderData();
    }

    async fetchAndRenderData() {
        const url = `https://websmart.dev.brunellocucinelli.it/bc/api/utils/export/log/generic?username=${this.user}&programName=${this.program}`;
        const errorMessage = this.shadowRoot.querySelector('#error-message');
        const tbody = this.shadowRoot.querySelector('#data-table tbody');

        try {
            errorMessage.textContent = 'Loading...';
            const response = await await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();
            const rows = data; // Supponendo che `data` sia un array di oggetti

            // Pulisce il contenuto precedente
            tbody.innerHTML = '';

            // Popola la tabella con i nuovi dati
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
customElements.define('simple-widget', SimpleWidget);
