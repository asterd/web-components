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
                    background-color: #354a5f;
                    color: white;
                    padding: 6px;
                    font-size: 12px;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                td {
                    padding: 6px;
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
                    padding: 6px 10px;
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
                    max-height: 22px; /* Icona Excel */
                    width: auto;
                }
                .status-icon {
                    font-size: 1.3rem;
                    vertical-align: middle;
                    cursor: pointer;
                }
                .error-icon {
                    color: red;
                }
                .completed-icon {
                    color: green;
                }
                .new-icon {
                    color: blue;
                }
                .pending-icon {
                    color: orange;
                }
                .error-row {
                    border-left: 4px solid red; /* Bordo a sinistra */
                }
                .completed-row {
                    border-left: 4px solid green; /* Bordo a sinistra */
                }
                td.center-icon {
                    text-align: center;
                    vertical-align: middle;
                }
                .scrollable-table-container {
                    max-height: 400px;
                    overflow-y: auto;
                }
                #refresh-container {
                    margin-top: 10px;
                    text-align: left;
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
                                <th>URL</th>
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
                <div id="error-message" class="error"></div>
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

        this.dispatchEvent(new CustomEvent('auth-ready', { bubbles: true, composed: true }));

        if (this.user && this.program) {
            this.#fetchAndRenderData();
        }
    }

    connectedCallback() {
        this.user = this.getAttribute('user');
        this.program = this.getAttribute('program');
        this.pageSize = this.getAttribute('pageSize') || 10;

        const errorMessage = this.shadowRoot.querySelector('#error-message');
        const refreshButton = this.shadowRoot.querySelector('#refresh-button');

        if (!this.user || !this.program) {
            errorMessage.textContent = 'Missing required parameters: user or program.';
            refreshButton.disabled = true;
            return;
        }

        // Imposta il titolo
        this.shadowRoot.querySelector('#user').textContent = this.user;
        this.shadowRoot.querySelector('#program').textContent = this.program;

        refreshButton.disabled = false;
        errorMessage.textContent = 'Loading...';
        this.#fetchAndRenderData();
    }

    refreshData() {
        const errorMessage = this.shadowRoot.querySelector('#error-message');
        errorMessage.textContent = 'Refreshing data...';
        this.#fetchAndRenderData();
    }

    async #fetchAndRenderData() {
        const url = `https://websmart.dev.brunellocucinelli.it/bc/api/utils/export/log/generic?username=${this.user}&programName=${this.program}&pageSize=${this.pageSize}`;
        const errorMessage = this.shadowRoot.querySelector('#error-message');
        const tbody = this.shadowRoot.querySelector('#data-table tbody');

        try {
            errorMessage.textContent = 'Loading...';

            const headers = { 'Content-Type': 'application/json' };
            if (this.#authHeader) headers['Authorization'] = this.#authHeader;

            const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
            if (response.status === 401) {
                this.dispatchEvent(new CustomEvent('token-expired', { bubbles: true, composed: true, detail: { message: 'Token expired or invalid.' } }));
                throw new Error('Your session has expired. Please refresh your token.');
            }

            if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);

            const data = await response.json();
            tbody.innerHTML = '';

            data.forEach(row => {
                const tr = document.createElement('tr');

                if (row.STATUS === 'E') {
                    tr.classList.add('error-row');
                } else if (row.STATUS === 'D') {
                    tr.classList.add('completed-row');
                }

                const statusIcon = row.STATUS === 'E' ? '&#9888;' : 
                                   row.STATUS === 'D' ? '&#10003;' : 
                                   row.STATUS === 'N' ? '&#43;' : '&#8635;';
                const statusClass = row.STATUS === 'E' ? 'error-icon' :
                                    row.STATUS === 'D' ? 'completed-icon' :
                                    row.STATUS === 'N' ? 'new-icon' : 'pending-icon';

                const statusCell = `
                    <td class="center-icon">
                        <span class="status-icon ${statusClass}" title="PID: ${row.PID}" onclick="navigator.clipboard.writeText('${row.PID}'); alert('PID Copied!');">
                            ${statusIcon}
                        </span>
                    </td>
                `;

                const fullErrorMsg = row.MESSAGE || '';
                const shortErrorMsg = fullErrorMsg.length > 25
                    ? `${fullErrorMsg.slice(0, 25)}...`
                    : fullErrorMsg;

                const messageCell = document.createElement('td');
                messageCell.textContent = shortErrorMsg;
                messageCell.style.cursor = 'pointer';
                messageCell.title = 'Click to view full message';
                messageCell.addEventListener('click', () => {
                    alert(`Full Message: ${fullErrorMsg}`);
                });

                tr.innerHTML = `
                    ${statusCell}
                    <td></td>
                    <td>${row.START_TIME || ''}</td>
                    <td>${row.ELAPSED || ''}</td>
                    <td class="center-icon">
                        ${row.URL ? `
                            <a href="${row.URL}" target="_blank" title="Download Excel file">
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
                            </a>` : ''
                        }
                    </td>
                `;
                tr.replaceChild(messageCell, tr.children[1]);
                tbody.appendChild(tr);
            });

            if (data.length === 0) tbody.innerHTML = `<tr><td colspan="5">No data available</td></tr>`;
            errorMessage.textContent = '';
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="5">No data available</td></tr>`;
            errorMessage.textContent = `Error: ${error.message}`;
        }
    }
}

customElements.define('excel-export-list', ExcelExportListWidget);

