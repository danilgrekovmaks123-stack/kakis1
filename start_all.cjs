const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const VITE_PORT = 3000;
const BOT_SCRIPT = 'bot.cjs';
const ENV_FILE = '.env';
const TUNNEL_LOG = 'tunnel_log.txt';

// --- Helper: Kill existing processes ---
function killProcesses() {
    console.log('Stopping existing processes...');
    try {
        // Kill cloudflared
        execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' });
    } catch (e) {}

    try {
        // Kill other node processes, but not this one
        const currentPid = process.pid;
        const stdout = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH').toString();
        const lines = stdout.trim().split('\r\n');
        
        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const pid = parseInt(parts[1].replace(/"/g, ''));
                if (pid !== currentPid && !isNaN(pid)) {
                    try {
                        process.stdout.write(`Killing node.exe PID ${pid}... `);
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                        console.log('Done.');
                    } catch (e) {
                        console.log('Failed (might be already gone).');
                    }
                }
            }
        });
    } catch (e) {
        // tasklist might fail if no node processes found (returns info message to stderr/stdout depending on version)
    }
}

// --- Helper: Update .env file ---
function updateEnv(url) {
    console.log(`Updating ${ENV_FILE} with new URL: ${url}`);
    let envContent = '';
    try {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');
    } catch (e) {
        console.log('.env file not found, creating new one.');
    }

    const urlRegex = /CASINO_URL=.*/;
    if (urlRegex.test(envContent)) {
        envContent = envContent.replace(urlRegex, `CASINO_URL=${url}`);
    } else {
        envContent += `\nCASINO_URL=${url}`;
    }
    fs.writeFileSync(ENV_FILE, envContent);
}

// --- Main Logic ---
async function start() {
    killProcesses();

    console.log('Starting Vite server...');
    const vite = spawn('npm.cmd', ['run', 'dev', '--', '--port', String(VITE_PORT)], {
        stdio: 'inherit',
        shell: true
    });

    console.log('Starting Cloudflare Tunnel...');
    // We use a file to capture output because piping directly can be tricky with some CLIs
    const tunnelLogStream = fs.createWriteStream(TUNNEL_LOG);
    const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${VITE_PORT}`], {
        shell: true
    });

    tunnel.stdout.pipe(tunnelLogStream);
    tunnel.stderr.pipe(tunnelLogStream);

    console.log('Waiting for Tunnel URL...');
    
    let tunnelUrl = null;
    const checkInterval = setInterval(() => {
        try {
            if (!fs.existsSync(TUNNEL_LOG)) return;
            const content = fs.readFileSync(TUNNEL_LOG, 'utf8');
            const match = content.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
            if (match) {
                tunnelUrl = match[0];
                clearInterval(checkInterval);
                console.log(`Tunnel URL found: ${tunnelUrl}`);
                
                updateEnv(tunnelUrl);
                
                console.log('Starting Bot...');
                const bot = spawn('node', [BOT_SCRIPT], {
                    stdio: 'inherit',
                    shell: true
                });

                bot.on('close', (code) => {
                    console.log(`Bot process exited with code ${code}`);
                    process.exit(code);
                });
            }
        } catch (e) {
            // Ignore read errors (file busy etc)
        }
    }, 1000);

    // Handle script exit
    process.on('SIGINT', () => {
        console.log('Stopping all processes...');
        killProcesses();
        process.exit();
    });
}

start();
