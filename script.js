(function() {
    // DOM Elements
    const displayEl = document.getElementById('display');
    const historyEl = document.getElementById('history');
    const recentHistoryEl = document.getElementById('recentHistory');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const themeSwitch = document.getElementById('themeSwitch');
    const themeLabel = document.getElementById('themeLabel');
    
    // State
    let currentExpr = '0';
    let historyStr = '';
    let isConnected = false;
    let isProcessing = false;

    // ----- Theme Management -----
    function initTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('calculatorTheme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        themeSwitch.checked = savedTheme === 'dark';
        themeLabel.textContent = savedTheme === 'dark' ? 'Dark' : 'Light';
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('calculatorTheme', newTheme);
        themeLabel.textContent = newTheme === 'dark' ? 'Dark' : 'Light';
        
        // Optional: Send theme preference to Python backend
        if (isConnected) {
            fetch('/set-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: newTheme })
            }).catch(() => {}); // Silently fail if backend doesn't support
        }
    }

    themeSwitch.addEventListener('change', toggleTheme);

    // ----- Connection Management -----
    async function checkConnection() {
        try {
            const response = await fetch('/history');
            if (response.ok) {
                setConnected(true);
                loadHistory();
            } else {
                setConnected(false);
            }
        } catch (error) {
            setConnected(false);
        }
    }

    function setConnected(connected) {
        isConnected = connected;
        if (connected) {
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = 'Connected to Python';
        } else {
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = 'Disconnected - Using local eval';
        }
    }

    // ----- History Management -----
    async function loadHistory() {
        try {
            const response = await fetch('/history');
            const data = await response.json();
            updateHistoryDisplay(data.history);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    function updateHistoryDisplay(history) {
        if (!recentHistoryEl) return;
        
        if (!history || history.length === 0) {
            recentHistoryEl.innerHTML = '<div class="history-item">No calculations yet</div>';
            return;
        }

        recentHistoryEl.innerHTML = history.slice(-5).reverse().map(entry => `
            <div class="history-item">
                <span class="history-expr">${entry.expression}</span>
                <span class="history-result">= ${entry.result}</span>
            </div>
        `).join('');
    }

    // Clear history
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
            try {
                await fetch('/clear-history', { method: 'POST' });
                loadHistory();
            } catch (error) {
                console.error('Failed to clear history:', error);
            }
        });
    }

    // ----- Calculator Functions -----
    function refresh() {
        displayEl.value = currentExpr.slice(0, 32);
        historyEl.innerText = historyStr;
    }

    function append(val) {
        if (currentExpr === '0' && val !== '.') {
            currentExpr = val;
        } else {
            currentExpr += val;
        }
        if (historyStr.startsWith('=')) historyStr = '';
        refresh();
    }

    async function evaluate() {
        if (!currentExpr.trim() || isProcessing) return;

        if ('+-*/÷×−^'.includes(currentExpr.slice(-1))) {
            historyStr = 'incomplete expression';
            refresh();
            return;
        }

        isProcessing = true;
        document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);

        try {
            if (isConnected) {
                const response = await fetch('/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expression: currentExpr })
                });

                const data = await response.json();

                if (response.ok) {
                    historyStr = currentExpr + ' =';
                    currentExpr = data.result.toString();
                    if (data.history) {
                        updateHistoryDisplay(data.history);
                    }
                } else {
                    historyStr = data.error || 'Error';
                }
            } else {
                // Fallback evaluation
                try {
                    const result = Function('"use strict";return (' + currentExpr + ')')();
                    historyStr = currentExpr + ' =';
                    currentExpr = result.toString();
                } catch (jsError) {
                    historyStr = 'Error (local)';
                }
            }
        } catch (error) {
            historyStr = 'Connection error';
            setConnected(false);
        } finally {
            isProcessing = false;
            document.querySelectorAll('.btn').forEach(btn => btn.disabled = false);
            refresh();
        }
    }

    function applyFunction(cmd) {
        if (historyStr.startsWith('=')) historyStr = '';

        const fnMap = {
            'sin': 'sin(', 'cos': 'cos(', 'tan': 'tan(',
            'asin': 'asin(', 'acos': 'acos(', 'atan': 'atan(',
            'log': 'log(', 'ln': 'ln(', 'sqrt': 'sqrt(', 'cbrt': 'cbrt(',
            '^': '^', '(': '(', ')': ')', '%': '%', '!': '!', 'π': 'π'
        };
        
        let token = fnMap[cmd] || cmd;

        if (token === 'π') {
            append('π');
        } else if (token === '!' || token === '%' || token === '^') {
            currentExpr += token;
            refresh();
        } else {
            if (currentExpr === '0' && token !== ')') {
                currentExpr = token;
            } else {
                currentExpr += token;
            }
            refresh();
        }
    }

    function control(cmd) {
        if (cmd === 'C') {
            currentExpr = '0';
            historyStr = '';
        } else if (cmd === '⌫') {
            if (currentExpr.length > 1) {
                currentExpr = currentExpr.slice(0, -1);
            } else {
                currentExpr = '0';
            }
            if (historyStr.startsWith('=')) historyStr = '';
        }
        refresh();
    }

    // ----- Event Listeners -----
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isProcessing) return;

            const val = btn.getAttribute('data-value');
            if (!val) return;

            if (!isNaN(val) || val === '.') {
                append(val);
            }
            else if (val === '=') {
                await evaluate();
            }
            else if (val === 'C' || val === '⌫') {
                control(val);
            }
            else if (['sin','cos','tan','asin','acos','atan','log','ln','sqrt','cbrt','^','!','%','π','(',')'].includes(val)) {
                applyFunction(val);
            }
            else {
                let op = val;
                if (val === '÷') op = '/';
                else if (val === '×') op = '*';
                else if (val === '−') op = '-';

                const last = currentExpr.slice(-1);
                if ('+-*/^'.includes(last) || last === '−' || last === '÷' || last === '×') {
                    currentExpr = currentExpr.slice(0, -1) + op;
                } else {
                    currentExpr += op;
                }
                if (historyStr.startsWith('=')) historyStr = '';
                refresh();
            }
        });
    });

    // Keyboard support
    document.addEventListener('keydown', async (e) => {
        if (isProcessing) return;

        const k = e.key;
        if (k >= '0' && k <= '9') append(k);
        else if (k === '.') append('.');
        else if (k === '+') append('+');
        else if (k === '-') append('-');
        else if (k === '*') append('*');
        else if (k === '/') { e.preventDefault(); append('/'); }
        else if (k === '(') applyFunction('(');
        else if (k === ')') applyFunction(')');
        else if (k === '^') applyFunction('^');
        else if (k === '!') applyFunction('!');
        else if (k === '%') applyFunction('%');
        else if (k === 'p' || k === 'π') applyFunction('π');
        else if (k === 'Enter' || k === '=') {
            e.preventDefault();
            await evaluate();
        }
        else if (k === 'Escape') control('C');
        else if (k === 'Backspace') {
            e.preventDefault();
            control('⌫');
        }
    });

    // Initialize
    initTheme();
    checkConnection();
    setInterval(checkConnection, 30000);
    refresh();
})();