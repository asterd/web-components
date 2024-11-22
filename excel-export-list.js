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
                        <svg fill="#000000" width="22px" height="22px" viewBox="-1.5 -2.5 24 24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin" class="jam jam-refresh"><path d='M17.83 4.194l.42-1.377a1 1 0 1 1 1.913.585l-1.17 3.825a1 1 0 0 1-1.248.664l-3.825-1.17a1 1 0 1 1 .585-1.912l1.672.511A7.381 7.381 0 0 0 3.185 6.584l-.26.633a1 1 0 1 1-1.85-.758l.26-.633A9.381 9.381 0 0 1 17.83 4.194zM2.308 14.807l-.327 1.311a1 1 0 1 1-1.94-.484l.967-3.88a1 1 0 0 1 1.265-.716l3.828.954a1 1 0 0 1-.484 1.941l-1.786-.445a7.384 7.384 0 0 0 13.216-1.792 1 1 0 1 1 1.906.608 9.381 9.381 0 0 1-5.38 5.831 9.386 9.386 0 0 1-11.265-3.328z' /></svg>
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
        this.retry = true;

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
                        <svg class="retry-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" title="Retry" onclick="this.dispatchEvent(new CustomEvent('retry', { detail: '${row.PID}', bubbles: true }));">
                            <path d="M8 5v2c-1.48.54-2.75 1.51-3.75 2.75L4 11.5C5.56 9.36 7.72 8 10 8c4.08 0 7.44 3.05 7.93 7h-2.08l3.64 3.64 1.41-1.41L20 15h-4c-.54-4.1-3.7-7.35-7.84-7.94L9 7H7c.47-.54.99-1.04 1.5-1.5zm3.84 10.94c-.5-.05-1.08-.09-1.59-.15-.4-.03-.76-.08-1.14-.18a4.35 4.35 0 0 1-1.06-.34c-.34-.16-.66-.33-.96-.54L8.47 15H9.5c.62.14 1.18.39 1.64.8.27.23.5.49.72.78.23.32.47.67.65 1.05.2.42.35.87.5 1.33h1.31zM19 12a7 7 0 0 0-7-7c-.73 0-1.44.11-2.12.33a7.92 7.92 0 0 0-1.54.67c.66-.84 1.51-1.51 2.49-2 .47-.23.96-.4 1.47-.54.56-.16 1.13-.27 1.72-.34A8.92 8.92 0 0 1 17.67 4H19a9 9 0 0 0-8-4 9 9 0 0 0-4 1A9 9 0 0 0 5.34 2a8.92 8.92 0 0 1 7.66 6.94A8.92 8.92 0 0 1 15 19a9 9 0 0 0 1-.16l.27.01h1a9.92 9.92 0 0 0-.24 0 7 7 0 0 0-7-7z"/>
                        </svg>
                    </td>` : `<td></td>`;

                tr.innerHTML = `
                    ${statusCell}
                    <td class="text-left"></td>
                    <td class="text-left">${row.START_TIME || ''}</td>
                    <td class="text-left">${row.ELAPSED || ''}</td>
                    <td class="center">
                        ${row.URL ? `<a href="${row.URL}" target="_blank" title="Download Excel">
                            <svg class="excel-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M0.076 0.055 0.055 0.066v0.33l0.021 0.012 0.247 -0.165V0.22zM0.083 0.371V0.092l0.209 0.139z"/><path fill-rule="evenodd" clip-rule="evenodd" d="m0.165 0.404 0.241 -0.161V0.22L0.165 0.059V0.092l0.209 0.139L0.165 0.371z"/>
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
