param([Parameter(Mandatory=$true)][string]$BackupFile,[Parameter(Mandatory=$true)][string]$TargetDatabaseUrl)
$ErrorActionPreference='Stop'
$resolved=[System.IO.Path]::GetFullPath($BackupFile)
if(-not (Test-Path -LiteralPath $resolved -PathType Leaf)){throw 'Backup file not found'}
& pg_restore --clean --if-exists --no-owner --dbname=$TargetDatabaseUrl $resolved
if($LASTEXITCODE -ne 0){throw 'PostgreSQL restore failed'}
