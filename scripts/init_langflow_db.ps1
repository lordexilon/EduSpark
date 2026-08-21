param(
    [string]$Container = "supabase_db_eduspark-lms-local"
)

$ErrorActionPreference = "Stop"

$exists = @(docker exec $Container psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'langflow'")
if ($exists -notcontains "1") {
    docker exec $Container psql -U postgres -d postgres -c "CREATE DATABASE langflow"
    Write-Output "Base de datos LangFlow creada."
} else {
    Write-Output "La base de datos LangFlow ya existe."
}
