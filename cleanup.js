#!/usr/bin/env node

/**
 * 🧹 SCRIPT DE LIMPIEZA DE PROYECTO
 * Limpia archivos generados automáticamente y libera espacio
 * Seguro: NO toca código fuente ni configuración
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Carpetas y archivos a eliminar
const TARGETS = {
    folders: ['node_modules', 'dist', 'build', '.cache', '.vite', '.turbo'],
    files: ['*.log', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*']
};

/**
 * Obtener tamaño de directorio recursivamente
 */
function getDirSize(dirPath) {
    let size = 0;
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (error) {
        // Ignorar errores de permisos
    }
    return size;
}

/**
 * Formatear bytes a formato legible
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Eliminar directorio recursivamente
 */
function removeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        return true;
    }
    return false;
}

/**
 * Buscar carpetas objetivo
 */
function findTargetFolders(baseDir) {
    const found = [];

    for (const folderName of TARGETS.folders) {
        const folderPath = path.join(baseDir, folderName);
        if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
            const size = getDirSize(folderPath);
            found.push({ path: folderPath, name: folderName, size });
        }
    }

    return found;
}

/**
 * Buscar archivos de log
 */
function findLogFiles(baseDir) {
    const found = [];

    try {
        const files = fs.readdirSync(baseDir);
        for (const file of files) {
            if (file.endsWith('.log') || file.includes('debug.log')) {
                const filePath = path.join(baseDir, file);
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    found.push({ path: filePath, name: file, size: stats.size });
                }
            }
        }
    } catch (error) {
        // Ignorar errores
    }

    return found;
}

/**
 * Script principal
 */
async function main() {
    console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  🧹 LIMPIEZA DE PROYECTO - TeikonPOS                 ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

    const projectDir = process.cwd();
    console.log(`${colors.blue}📂 Directorio:${colors.reset} ${projectDir}\n`);

    // PASO 1: ESCANEAR
    console.log(`${colors.yellow}🔍 PASO 1: Escaneando archivos generados...${colors.reset}\n`);

    const foldersToDelete = findTargetFolders(projectDir);
    const logsToDelete = findLogFiles(projectDir);

    let totalSize = 0;

    // Reportar carpetas
    if (foldersToDelete.length > 0) {
        console.log(`${colors.green}Carpetas encontradas:${colors.reset}`);
        foldersToDelete.forEach(item => {
            console.log(`  📁 ${item.name.padEnd(20)} → ${formatBytes(item.size)}`);
            totalSize += item.size;
        });
        console.log();
    }

    // Reportar logs
    if (logsToDelete.length > 0) {
        console.log(`${colors.green}Archivos de log encontrados:${colors.reset}`);
        logsToDelete.forEach(item => {
            console.log(`  📄 ${item.name.padEnd(20)} → ${formatBytes(item.size)}`);
            totalSize += item.size;
        });
        console.log();
    }

    if (foldersToDelete.length === 0 && logsToDelete.length === 0) {
        console.log(`${colors.green}✅ Proyecto ya está limpio. No hay nada que eliminar.${colors.reset}`);
        return;
    }

    console.log(`${colors.cyan}💾 Espacio total a liberar: ${formatBytes(totalSize)}${colors.reset}\n`);

    // PASO 2: LIMPIAR
    console.log(`${colors.yellow}🗑️  PASO 2: Eliminando archivos...${colors.reset}\n`);

    let deletedCount = 0;

    // Eliminar carpetas
    for (const item of foldersToDelete) {
        try {
            console.log(`  Eliminando ${item.name}...`);
            removeDir(item.path);
            deletedCount++;
            console.log(`  ${colors.green}✓${colors.reset} ${item.name} eliminado`);
        } catch (error) {
            console.log(`  ${colors.red}✗${colors.reset} Error al eliminar ${item.name}: ${error.message}`);
        }
    }

    // Eliminar logs
    for (const item of logsToDelete) {
        try {
            fs.unlinkSync(item.path);
            deletedCount++;
            console.log(`  ${colors.green}✓${colors.reset} ${item.name} eliminado`);
        } catch (error) {
            console.log(`  ${colors.red}✗${colors.reset} Error al eliminar ${item.name}`);
        }
    }

    console.log(`\n${colors.green}✅ Limpieza completada: ${deletedCount} elementos eliminados${colors.reset}\n`);

    // PASO 3: REGENERAR
    if (foldersToDelete.some(f => f.name === 'node_modules')) {
        console.log(`${colors.yellow}📦 PASO 3: Reinstalando dependencias...${colors.reset}\n`);

        try {
            console.log(`  Ejecutando: npm install\n`);
            execSync('npm install', { stdio: 'inherit', cwd: projectDir });
            console.log(`\n${colors.green}✅ Dependencias reinstaladas correctamente${colors.reset}`);
        } catch (error) {
            console.log(`\n${colors.red}✗ Error al reinstalar dependencias${colors.reset}`);
            console.log(`  Ejecuta manualmente: npm install`);
        }
    }

    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  ✨ PROYECTO LIMPIO Y LISTO                          ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);
}

// Ejecutar
main().catch(error => {
    console.error(`${colors.red}Error fatal:${colors.reset}`, error);
    process.exit(1);
});
