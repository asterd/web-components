class ExcelExportListWidget extends HTMLElement {
    #token;
    #authHeader;
    #baseUrl;

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `
            <style>
                .table-container {
                    font-family: 'Roboto', sans-serif;
                    margin: 20px 0;
                    color: #222222;
                }
                h2 {
                    font-size: 14px;
                    font-weight: bold;
                    color: #354a5f;
                    margin-bottom: 10px;
                }
                .scrollable-table-container {
                    max-height: var(--table-height, 400px);
                    overflow-y: auto;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                thead {
                    background-color: #ffffff;
                    border-bottom: 2px solid #ddd;
                    position: sticky;
                    top: 0;
                    z-index: 2;
                }
                thead th {
                    font-size: 12px;
                    text-align: left;
                    padding: 8px;
                    text-transform: capitalize;
                }
                tbody td {
                    padding: 10px;
                    border-top: 1px solid #ccc;
                }
                tbody td.text-left {
                    text-align: left;
                }
                tbody td.center {
                    text-align: center;
                }
                tbody tr {
                    background-color: #ffffff;
                }
                tbody tr:hover {
                    background-color: #f9f9f9;
                }
                .row-border.status-e {
                    border-left: 4px solid red;
                }
                .row-border.status-d {
                    border-left: 4px solid green;
                }
                .status-icon {
                    font-size: 1.2rem;
                    cursor: pointer;
                }
                .status-icon.error {
                    color: red;
                }
                .status-icon.completed {
                    color: green;
                }
                .status-icon.new {
                    color: blue;
                }
                .status-icon.pending {
                    color: orange;
                }
                .excel-icon {
                    width: 22px;
                    height: 22px;
                    cursor: pointer;
                }
                .retry-icon {
                    width: 22px;
                    height: 22px;
                    cursor: pointer;
                    fill: #20744A;
                }
                .retry-icon:hover {
                    fill: #185c36;
                }
                .actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 10px;
                }
                .actions button {
                    background: none;
                    border: none;
                    cursor: pointer;
                }
                .actions button svg {
                    width: 24px;
                    height: 24px;
                    fill: #606060;
                }
                .actions button:hover svg {
                    fill: #505050;
                }
                .actions .message {
                    font-size: 14px;
                    color: red;
                }
                .popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: white;
                    padding: 20px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    border-radius: 8px;
                    min-width: 300px;
                }
                .popup button {
                    margin-top: 10px;
                    background-color: #354a5f;
                    color: white;
                    border: none;
                    padding: 10px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .popup button:hover {
                    background-color: #2a3e4e;
                }
            </style>
            <div class="table-container">
                <h2 id="table-title">Elenco elaborazioni utente: <span id="user"></span> - applicazione: <span id="program"></span></h2>
                <div class="scrollable-table-container">
                    <table id="data-table">
                        <thead>
                            <tr>
                                <th>status</th>
                                <th>message</th>
                                <th>start time</th>
                                <th>elapsed</th>
                                <th>download</th>
                                <th class="retry-column" style="display: none;">retry</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="6">No data available</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="actions">
                    <button id="refresh-button" title="Refresh">
                        <svg fill="#000000" viewBox="-1.5 -2.5 24 24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin" class="jam jam-refresh"><path d='M17.83 4.194l.42-1.377a1 1 0 1 1 1.913.585l-1.17 3.825a1 1 0 0 1-1.248.664l-3.825-1.17a1 1 0 1 1 .585-1.912l1.672.511A7.381 7.381 0 0 0 3.185 6.584l-.26.633a1 1 0 1 1-1.85-.758l.26-.633A9.381 9.381 0 0 1 17.83 4.194zM2.308 14.807l-.327 1.311a1 1 0 1 1-1.94-.484l.967-3.88a1 1 0 0 1 1.265-.716l3.828.954a1 1 0 0 1-.484 1.941l-1.786-.445a7.384 7.384 0 0 0 13.216-1.792 1 1 0 1 1 1.906.608 9.381 9.381 0 0 1-5.38 5.831 9.386 9.386 0 0 1-11.265-3.328z' /></svg>
                    </button>
                    <span id="message-box" class="message"></span>
                </div>
            </div>
        `;

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

        if (this.user && this.program) {
            this.#fetchAndRenderData();
        }
    }

    connectedCallback() {
        this.user = this.getAttribute('user');
        this.program = this.getAttribute('program');
        this.retry = this.getAttribute('retry') === 'true';
        this.env = this.getAttribute('env') || 'dev';
        this.pageSize = Math.min(parseInt(this.getAttribute('pageSize') || 10, 10), 30);
        this.tableHeight = this.getAttribute('tableHeight') || '400px';

        // Configura il baseUrl in base all'env
        switch (this.env) {
            case 'qa':
                this.#baseUrl = 'https://websmart-qa.dev.brunellocucinelli.it/bc';
                break;
            case 'prod':
                this.#baseUrl = 'https://websmart.brunellocucinelli.it/bc';
                break;
            default:
                this.#baseUrl = 'https://websmart.dev.brunellocucinelli.it/bc';
        }

        if (parseInt(this.pageSize) > 30) {
            this.pageSize = 30;
            this.#showMessage('Il numero massimo di righe per pagina è 30. Valore impostato automaticamente.', 'error');
        }

        if (this.tableHeight) {
            this.style.setProperty('--table-height', this.tableHeight);
        }

        const userElement = this.shadowRoot.querySelector('#user');
        const programElement = this.shadowRoot.querySelector('#program');

        if (!this.user || !this.program) {
            userElement.textContent = 'N/A';
            programElement.textContent = 'N/A';
            this.#showMessage('Parametri mancanti: utente o applicazione.', 'error');
            return;
        }

        userElement.textContent = this.user;
        programElement.textContent = this.program;

        // Abilita la colonna retry se necessario
        if (this.retry) {
            this.shadowRoot.querySelector('.retry-column').style.display = 'table-cell';
        }

        // Caricamento automatico all'avvio
        this.#fetchAndRenderData();
    }

    refreshData() {
        this.#showMessage('Ricaricamento in corso...', 'info');
        this.#fetchAndRenderData();
    }

    async #fetchAndRenderData() {
        const url = `${this.#baseUrl}/api/utils/export/log/generic?username=${this.user}&programName=${this.program}&pageSize=${this.pageSize}`;
        const tbody = this.shadowRoot.querySelector('#data-table tbody');

        try {
            this.#showMessage('Caricamento in corso...', 'info');

            const headers = { 'Content-Type': 'application/json' };
            if (this.#authHeader) headers['Authorization'] = this.#authHeader;

            const response = await fetch(url, { method: 'GET', headers });
            if (!response.ok) throw new Error(`Errore durante il caricamento: ${response.status}`);

            const data = await response.json();
            tbody.innerHTML = '';

            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.className = row.STATUS === 'E' ? 'row-border status-e' : row.STATUS === 'D' ? 'row-border status-d' : '';

                const statusIcon = row.STATUS === 'E' ? '&#9888;' :
                                   row.STATUS === 'D' ? '&#10003;' :
                                   row.STATUS === 'N' ? '&#43;' : '&#8635;';
                const statusClass = row.STATUS === 'E' ? 'error' :
                                    row.STATUS === 'D' ? 'completed' :
                                    row.STATUS === 'N' ? 'new' : 'pending';

                const statusCell = `
                    <td class="center">
                        <span class="status-icon ${statusClass}" title="PID: ${row.PID}" onclick="navigator.clipboard.writeText('${row.PID}'); alert('PID copiato: ${row.PID}');">
                            ${statusIcon}
                        </span>
                    </td>
                `;

                const messageCell = document.createElement('td');
                messageCell.textContent = row.MESSAGE?.slice(0, 25) + '...';
                messageCell.style.cursor = 'pointer';
                messageCell.className = 'text-left';
                messageCell.addEventListener('click', () => this.#showPopup(row.MESSAGE || 'No message available'));

                const retryCell = this.retry && (row.STATUS === 'E' || row.STATUS === 'N') ? `
                    <td class="center">
                        <svg class="retry-icon" xmlns="http://www.w3.org/2000/svg" viewBox="-0.11 -0.083 0.66 0.66" title="Retry" onclick="this.dispatchEvent(new CustomEvent('retry', { detail: '${row.PID}', bubbles: true }));" preserveAspectRatio="xMinYMin" class="jam jam-play">
                              <path d="M0.38 0.262a0.027 0.027 0 0 0 -0.009 -0.037L0.098 0.059a0.028 0.028 0 0 0 -0.015 -0.004c-0.015 0 -0.028 0.012 -0.028 0.027V0.413c0 0.005 0.001 0.01 0.004 0.014 0.008 0.013 0.025 0.017 0.038 0.009l0.273 -0.166c0.004 -0.002 0.007 -0.005 0.009 -0.009zm0.021 0.055 -0.273 0.166c-0.039 0.024 -0.091 0.012 -0.115 -0.026A0.08 0.08 0 0 1 0 0.413V0.082C0 0.037 0.037 0 0.084 0c0.016 0 0.031 0.004 0.044 0.012l0.273 0.166c0.039 0.024 0.051 0.074 0.027 0.112 -0.007 0.011 -0.016 0.02 -0.027 0.026"/>
                        </svg>
                    </td>` : `<td></td>`;

                tr.innerHTML = `
                    ${statusCell}
                    <td class="text-left"></td>
                    <td class="text-left">${row.START_TIME || ''}</td>
                    <td class="text-left">${row.ELAPSED || ''}</td>
                    <td class="center">
                        ${row.URL ? `<a href="${row.URL}" target="_blank" title="Download Excel">
                            <svg class="excel-icon" width="22px" height="22px" viewBox="-0.11 0 1.76 1.76" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0.141 0A0.14 0.14 0 0 0 0.001 0.14v1.481a0.14 0.14 0 0 0 0.14 0.14h1.259a0.14 0.14 0 0 0 0.14 -0.14V0.559L1.019 0z" fill-rule="evenodd" clip-rule="evenodd" fill="#45B058"/><path d="M0.534 1.483a0.018 0.018 0 0 1 -0.015 -0.007l-0.103 -0.137 -0.103 0.137a0.018 0.018 0 0 1 -0.015 0.007 0.02 0.02 0 0 1 -0.02 -0.02c0 -0.004 0.001 -0.008 0.004 -0.012l0.107 -0.141 -0.1 -0.133a0.02 0.02 0 0 1 -0.004 -0.011c0 -0.009 0.008 -0.02 0.02 -0.02 0.006 0 0.012 0.003 0.016 0.008l0.095 0.127 0.095 -0.128a0.018 0.018 0 0 1 0.015 -0.007c0.01 0 0.02 0.008 0.02 0.02a0.019 0.019 0 0 1 -0.003 0.011l-0.1 0.132 0.107 0.142a0.019 0.019 0 0 1 0.003 0.011c0 0.011 -0.009 0.02 -0.02 0.02m0.275 -0.003h-0.15a0.03 0.03 0 0 1 -0.03 -0.03V1.166c0 -0.011 0.009 -0.02 0.021 -0.02 0.011 0 0.02 0.009 0.02 0.02V1.443h0.139c0.01 0 0.018 0.008 0.018 0.018 0 0.011 -0.008 0.019 -0.018 0.019m0.192 0.006c-0.049 0 -0.088 -0.016 -0.116 -0.041a0.02 0.02 0 0 1 -0.006 -0.015c0 -0.01 0.007 -0.021 0.019 -0.021 0.004 0 0.008 0.001 0.012 0.004 0.023 0.02 0.054 0.036 0.093 0.036 0.059 0 0.078 -0.032 0.078 -0.057 0 -0.085 -0.196 -0.038 -0.196 -0.156 0 -0.054 0.049 -0.092 0.113 -0.092 0.043 0 0.079 0.013 0.106 0.035a0.02 0.02 0 0 1 0.007 0.015c0 0.01 -0.008 0.02 -0.019 0.02a0.019 0.019 0 0 1 -0.012 -0.004c-0.024 -0.02 -0.054 -0.029 -0.085 -0.029 -0.04 0 -0.068 0.021 -0.068 0.052 0 0.074 0.196 0.032 0.196 0.155 0 0.048 -0.033 0.097 -0.122 0.097" fill="#ffffff"/><path d="M1.539 0.56v0.028H1.187s-0.174 -0.035 -0.168 -0.184c0 0 0.006 0.157 0.165 0.157z" fill-rule="evenodd" clip-rule="evenodd" fill="#349C42"/><path d="M1.019 0v0.4c0 0.046 0.03 0.159 0.168 0.159h0.352z" opacity=".5" fill-rule="evenodd" clip-rule="evenodd" fill="#ffffff"/>
                            </svg>
                        </a>` : ''}
                    </td>
                    ${retryCell}
                `;
                tr.replaceChild(messageCell, tr.children[1]);
                tbody.appendChild(tr);
            });

            if (!data.length) tbody.innerHTML = `<tr><td colspan="6">No data available</td></tr>`;
            this.#hideMessage();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6">No data available</td></tr>`;
            this.#showMessage(error.message, 'error');
        }
    }

    #showMessage(message, type) {
        const messageBox = this.shadowRoot.querySelector('#message-box');
        messageBox.textContent = message;
        messageBox.style.color = type === 'error' ? 'red' : 'black';
    }

    #hideMessage() {
        const messageBox = this.shadowRoot.querySelector('#message-box');
        messageBox.textContent = '';
    }

    #showPopup(message) {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.innerHTML = `
            <p>${message}</p>
            <button id="copy-button">Copia</button>
            <button id="close-button">Chiudi</button>
        `;
        this.shadowRoot.appendChild(popup);

        popup.querySelector('#copy-button').addEventListener('click', () => {
            navigator.clipboard.writeText(message);
            alert('Messaggio copiato!');
        });

        popup.querySelector('#close-button').addEventListener('click', () => {
            this.shadowRoot.removeChild(popup);
        });
    }
}

customElements.define('excel-export-list', ExcelExportListWidget);
