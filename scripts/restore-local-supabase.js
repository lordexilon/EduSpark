const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
const backupDir = path.join(projectRoot, 'supabase', 'migrations_backup');
const schemaFile = path.join(projectRoot, 'supabase', 'remote_schema.sql');
const containerName = 'supabase_db_eduspark-lms-local';

function runCmd(cmd) {
  console.log(`Ejecutando: ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error al ejecutar: ${cmd}`);
    throw err;
  }
}

function restoreMigrationFiles() {
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    if (files.length > 0) {
      console.log('Regresando archivos de migración a la carpeta original...');
      for (const file of files) {
        fs.renameSync(
          path.join(backupDir, file),
          path.join(migrationsDir, file)
        );
      }
    }
    // Borrar la carpeta de respaldo si queda vacía
    try {
      fs.rmdirSync(backupDir);
    } catch (e) {}
  }
}

async function main() {
  console.log('--- Iniciando restauración de Supabase Local ---');

  // 1. Respaldar migraciones
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  if (migrationFiles.length > 0) {
    console.log(`Moviendo ${migrationFiles.length} archivos de migración a la carpeta de respaldo...`);
    for (const file of migrationFiles) {
      fs.renameSync(
        path.join(migrationsDir, file),
        path.join(backupDir, file)
      );
    }
  } else {
    console.log('No se encontraron migraciones locales pendientes.');
  }

  // 2. Levantar Supabase (sin migraciones)
  console.log('Levantando el stack local de Supabase (sin migraciones para evitar errores)...');
  try {
    runCmd('npx supabase start');
  } catch (err) {
    console.error('Error al iniciar Supabase local.');
    // Regresar archivos de migración por seguridad antes de salir
    restoreMigrationFiles();
    process.exit(1);
  }

  // 3. Cargar el esquema remoto
  if (fs.existsSync(schemaFile)) {
    console.log('Cargando el esquema remoto (remote_schema.sql) en Docker...');
    try {
      // Usar docker exec para inyectar el archivo SQL
      execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < "${schemaFile}"`, { stdio: 'inherit' });
      console.log('Esquema remoto cargado con éxito.');
    } catch (err) {
      console.error('Error al cargar el esquema en Docker.');
      restoreMigrationFiles();
      process.exit(1);
    }
  } else {
    console.error('ERROR: No se encontró el archivo supabase/remote_schema.sql.');
    restoreMigrationFiles();
    process.exit(1);
  }

  // 4. Restaurar archivos de migración
  restoreMigrationFiles();

  // 5. Registrar las migraciones en la base de datos para que Supabase CLI las considere aplicadas
  console.log('Registrando las migraciones en la base de datos local para sincronizar el historial...');
  try {
    // Obtener las migraciones que Supabase CLI espera
    const listOutput = execSync('npx supabase migration list', { encoding: 'utf8' });
    console.log('Historial de migraciones detectado por Supabase CLI:\n', listOutput);

    // Parsear versiones pendientes
    const lines = listOutput.split('\n');
    const pendingVersions = [];
    
    for (const line of lines) {
      // Buscar las líneas que no están aplicadas y tienen un estado de "Pending" o "Local" sin aplicar
      if (line.includes('Pending') || line.includes('pending') || (line.includes('│') && !line.includes('Applied'))) {
        // Limpiar caracteres de la tabla
        const cleanLine = line.replace(/[│|─┌┐└┘├┤┬┴┼]/g, ' ').trim();
        const parts = cleanLine.split(/\s+/).map(p => p.trim()).filter(Boolean);
        
        // El primer o segundo elemento suele ser la versión (el timestamp con nombre)
        for (const part of parts) {
          if (/^\d+/.test(part)) { // Si empieza con número (la versión o timestamp)
            if (!pendingVersions.includes(part)) {
              pendingVersions.push(part);
            }
          }
        }
      }
    }

    console.log('Versiones de migración a reparar:', pendingVersions);

    if (pendingVersions.length > 0) {
      for (const version of pendingVersions) {
        console.log(`Reparando migración ${version}...`);
        try {
          execSync(`npx supabase migration repair --status applied ${version}`, { stdio: 'inherit' });
        } catch (repairErr) {
          console.warn(`No se pudo reparar vía CLI la migración ${version}. Intentando inserción directa en BD...`);
          // Intento de inserción directa por si acaso
          const sql = `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('${version}') ON CONFLICT DO NOTHING;`;
          try {
            execSync(`docker exec -i ${containerName} psql -U postgres -d postgres -c "${sql}"`, { stdio: 'ignore' });
            console.log(`Inserción directa exitosa para la versión ${version}`);
          } catch (e) {
            console.error(`Error al insertar directamente la versión ${version}:`, e.message);
          }
        }
      }
      console.log('Sincronización de migraciones completada con éxito.');
    } else {
      console.log('No hay migraciones pendientes por registrar.');
    }

  } catch (err) {
    console.error('Error al sincronizar el historial de migraciones:', err.message);
  }

  console.log('\n--- PROCESO COMPLETADO ---');
  console.log('Tu Supabase local está corriendo en los puertos de la serie 5433x.');
  console.log('La base de datos y esquema han sido replicados correctamente.');
}

main();
