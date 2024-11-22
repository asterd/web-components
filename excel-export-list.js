class ExcelExportListWidget extends HTMLElement {
    #token;
    #authHeader;

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `
            <style>
                .table-container {
                    font-family: 'Roboto', sans-serif;
                    margin: 20px 0;
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
                thead th {
                    background-color: #f5f5f5;
                    font-size: 12px; /* Titoli tabella più piccoli */
                    text-align: left;
                    padding: 8px;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                    border-bottom: 2px solid #ddd;
                }
                tbody td {
                    padding: 10px;
                    text-align: center; /* Centra le icone */
                    border-top: 1px solid #ddd;
                }
                tbody td.text-left {
                    text-align: left; /* Colonne testuali allineate a sinistra */
                }
                tbody tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                tbody tr:hover {
                    background-color: #eaeaea;
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
                .row-border.status-e {
                    border-left: 4px solid red;
                }
                .row-border.status-d {
                    border-left: 4px solid green;
                }
                .actions {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                }
                .actions button {
                    background-color: #606060;
                    color: white;
                    border: none;
                    padding: 6px 10px;
                    font-size: 12px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .actions button:hover {
                    background-color: #505050;
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
                                <th>STATUS</th>
                                <th>MESSAGE</th>
                                <th>START TIME</th>
                                <th>ELAPSED</th>
                                <th>DOWNLOAD</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="5">No data available</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="actions">
                    <button id="refresh-button">Refresh</button>
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
        this.pageSize = this.getAttribute('pageSize') || 10;
        this.tableHeight = this.getAttribute('tableHeight') || '400px';

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

        // Caricamento automatico all'avvio
        this.#fetchAndRenderData();
    }

    refreshData() {
        this.#showMessage('Ricaricamento in corso...', 'info');
        this.#fetchAndRenderData();
    }

    async #fetchAndRenderData() {
        const url = `https://websmart.dev.brunellocucinelli.it/bc/api/utils/export/log/generic?username=${this.user}&programName=${this.program}&pageSize=${this.pageSize}`;
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

                // Icona di stato con supporto al copia PID
                const statusIcon = row.STATUS === 'E' ? '&#9888;' :
                                   row.STATUS === 'D' ? '&#10003;' :
                                   row.STATUS === 'N' ? '&#43;' : '&#8635;';
                const statusClass = row.STATUS === 'E' ? 'error' :
                                    row.STATUS === 'D' ? 'completed' :
                                    row.STATUS === 'N' ? 'new' : 'pending';

                const statusCell = `
                    <td>
                        <span class="status-icon ${statusClass}" title="PID: ${row.PID}" onclick="navigator.clipboard.writeText('${row.PID}'); alert('PID copiato: ${row.PID}');">
                            ${statusIcon}
                        </span>
                    </td>
                `;

                const messageCell = document.createElement('td');
                messageCell.textContent = row.MESSAGE?.slice(0, 25) + '...';
                messageCell.style.cursor = 'pointer';
                messageCell.addEventListener('click', () => this.#showPopup(row.MESSAGE || 'No message available'));

                tr.innerHTML = `
                    ${statusCell}
                    <td class="text-left"></td>
                    <td>${row.START_TIME || ''}</td>
                    <td>${row.ELAPSED || ''}</td>
                    <td>
                        ${row.URL ? `<a href="${row.URL}" target="_blank" title="Download Excel">
                            <svg class="excel-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path fill="#20744A" d="M19 2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.9 15h-2.2l-1.4-2.1-1.4 2.1H7.7l2.3-3.5-2.2-3.5h2.2l1.4 2.1 1.4-2.1h2.2l-2.3 3.5 2.3 3.5z"></path>
                            </svg>
                        </a>` : ''}
                    </td>
                `;
                tr.replaceChild(messageCell, tr.children[1]);
                tbody.appendChild(tr);
            });

            if (!data.length) tbody.innerHTML = `<tr><td colspan="5">No data available</td></tr>`;
            this.#hideMessage();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="5">No data available</td></tr>`;
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
