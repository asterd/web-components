// simple-widget.js
class SimpleWidget extends HTMLElement {
    constructor() {
        super();

        // Creiamo lo shadow DOM
        const shadow = this.attachShadow({ mode: 'open' });

        // Aggiungiamo il bottone e il suo stile
        const style = document.createElement('style');
        style.textContent = `
            button {
                padding: 10px 20px;
                font-size: 16px;
                background-color: #007BFF;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            button:hover {
                background-color: #0056b3;
            }
        `;

        const button = document.createElement('button');
        button.textContent = 'Click me!';
        button.addEventListener('click', () => this.handleClick());

        shadow.appendChild(style);
        shadow.appendChild(button);
    }

    connectedCallback() {
        // Controlliamo che il parametro `name` sia presente
        if (!this.hasAttribute('name')) {
            console.warn('The "name" attribute is required for SimpleWidget.');
        }
    }

    handleClick() {
        const name = this.getAttribute('name') || 'Guest';

        const cookieName = 'SmurfID';
        const cookies = document.cookie.split('; ');
        const cookie = cookies.find((row) => row.startsWith(`${cookieName}=`));
        const cookieValue = cookie ? cookie.split('=')[1] : 'Cookie not found';

        
        alert(`Hello, ${name}! You are very ugly!`);
        alert(`Cookie SmurfID is: ${cookieValue}!`);
    }
}

// Registriamo il custom element
customElements.define('simple-widget', SimpleWidget);
