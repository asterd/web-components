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
                .message {
                    margin: 10px 0;
                    padding: 8px;
                    font-size: 14px;
                    color: red;
                    text-align: center;
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
                    font-size: 14px;
                    text-align: left;
                    padding: 10px;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                tbody td {
                    padding: 10px;
                    border-top: 1px solid #ddd;
                }
                tbody tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                tbody tr:hover {
                    background-color: #eaeaea;
                }
                .icon {
                    font-size: 1.2rem;
                    cursor: pointer;
                }
                .icon.error {
                    color: red;
                }
                .icon.completed {
                    color: green;
                }
                .icon.new {
                    color: blue;
                }
                .icon.pending {
                    color: orange;
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
                #refresh-container {
                    margin-top: 10px;
                    text-align: left;
                }
                .excel-icon {
                    width: 16px;
                    height: 16px;
                }
            </style>
            <div class="table-container">
                <h2 id="table-title">Elenco elaborazioni utente: <span id="user"></span> - applicazione: <span id="program"></span></h2>
                <div id="message-box" class="message" style="display: none;">Caricamento...</div>
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
                <div id="refresh-container">
                    <button id="refresh-button">Refresh</button>
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

        this.shadowRoot.style.setProperty('--table-height', this.tableHeight);

        if (!this.user || !this.program) {
            this.#showMessage('Parametri mancanti: utente o applicazione.', 'error');
            return;
        }

        this.shadowRoot.querySelector('#user').textContent = this.user;
        this.shadowRoot.querySelector('#program').textContent = this.program;

        this.#fetchAndRenderData();
    }

    refreshData() {
        this.#showMessage('Ricaricamento dati...', 'info');
        this.#fetchAndRenderData();
    }

    async #fetchAndRenderData() {
        const url = `https://websmart.dev.brunellocucinelli.it/bc/api/utils/export/log/generic?username=${this.user}&programName=${this.program}&pageSize=${this.pageSize}`;
        const tbody = this.shadowRoot.querySelector('#data-table tbody');

        try {
            this.#showMessage('Caricamento...', 'info');

            const headers = { 'Content-Type': 'application/json' };
            if (this.#authHeader) headers['Authorization'] = this.#authHeader;

            const response = await fetch(url, { method: 'GET', headers });
            if (!response.ok) throw new Error(`Errore durante il caricamento dei dati: ${response.status}`);

            const data = await response.json();
            tbody.innerHTML = '';

            data.forEach(row => {
                const tr = document.createElement('tr');

                const statusIcon = row.STATUS === 'E' ? '&#9888;' : 
                                   row.STATUS === 'D' ? '&#10003;' : 
                                   row.STATUS === 'N' ? '&#43;' : '&#8635;';
                const statusClass = row.STATUS === 'E' ? 'error' :
                                    row.STATUS === 'D' ? 'completed' :
                                    row.STATUS === 'N' ? 'new' : 'pending';

                const messageCell = document.createElement('td');
                messageCell.textContent = row.MESSAGE?.slice(0, 25) + '...';
                messageCell.style.cursor = 'pointer';
                messageCell.addEventListener('click', () => this.#showPopup(row.MESSAGE || 'No message available'));

                tr.innerHTML = `
                    <td><span class="icon ${statusClass}">${statusIcon}</span></td>
                    <td></td>
                    <td>${row.START_TIME || ''}</td>
                    <td>${row.ELAPSED || ''}</td>
                    <td>${row.URL ? `<a href="${row.URL}" target="_blank">
                        <svg class="excel-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <title>file_type_excel2</title>
                            <path d="M28.781,4.405H18.651V2.018L2,4.588V27.115l16.651,2.868V26.445H28.781A1.162,1.162,0,0,0,30,25.349V5.5A1.162,1.162,0,0,0,28.781,4.405Zm.16,21.126H18.617L18.6,23.642h2.487v-2.2H18.581l-.012-1.3h2.518v-2.2H18.55l-.012-1.3h2.549v-2.2H18.53v-1.3h2.557v-2.2H18.53v-1.3h2.557v-2.2H18.53v-2H28.941Z" style="fill:#20744a;fill-rule:evenodd"/>
                            <rect x="22.487" y="7.439" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="10.94" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="14.441" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="17.942" width="4.323" height="2.2" style="fill:#20744a"/>
                            <rect x="22.487" y="21.443" width="4.323" height="2.2" style="fill:#20744a"/>
                            <polygon points="6.347 10.673 8.493 10.55 9.842 14.259 11.436 10.397 13.582 10.274 10.976 15.54 13.582 20.819 11.313 20.666 9.781 16.642 8.248 20.513 6.163 20.329 8.585 15.666 6.347 10.673" style="fill:#ffffff;fill-rule:evenodd"/>
                        </svg>
                    </a>` : ''}</td>
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
        messageBox.style.display = 'block';
        messageBox.style.color = type === 'error' ? 'red' : '#354a5f';
    }

    #hideMessage() {
        const messageBox = this.shadowRoot.querySelector('#message-box');
        messageBox.style.display = 'none';
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
