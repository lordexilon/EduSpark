// Script para ejecutar frontend y worker simultáneamente
// Compatible con Windows, Linux y macOS

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando EduSpark (Frontend + Worker)...\n');

// Colores para los logs
const colors = {
    frontend: '\x1b[36m',  // Cyan
    worker: '\x1b[35m',     // Magenta
    reset: '\x1b[0m'
};

// Función para ejecutar comandos
function runCommand(name, command, args, cwd) {
    const proc = spawn(command, args, {
        cwd: cwd || process.cwd(),
        shell: true,
        stdio: 'pipe'
    });

    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log(`${colors[name]}[${name}]${colors.reset} ${line}`);
            }
        });
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.error(`${colors[name]}[${name}]${colors.reset} ${line}`);
            }
        });
    });

    proc.on('close', (code) => {
        console.log(`${colors[name]}[${name}]${colors.reset} Proceso terminado con código ${code}`);
        // Si un proceso muere, matar el otro
        process.exit(code);
    });

    return proc;
}

// Ejecutar frontend
const frontend = runCommand('frontend', 'npm', ['run', 'dev']);

// Ejecutar worker
const workerPath = path.join(process.cwd(), 'src', 'workers', 'file-processing-worker');
const worker = runCommand('worker', 'npm', ['run', 'dev'], workerPath);

// Handler para Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n🛑 Deteniendo servicios...');
    frontend.kill();
    worker.kill();
    process.exit(0);
});

console.log('✅ Servicios iniciados:');
console.log(`   ${colors.frontend}[frontend]${colors.reset} http://localhost:5173`);
console.log(`   ${colors.worker}[worker]${colors.reset} http://localhost:3001`);
console.log('\nPresiona Ctrl+C para detener\n');
