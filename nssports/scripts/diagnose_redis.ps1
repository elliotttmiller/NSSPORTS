$ErrorActionPreference='Stop'
function Import-EnvFile { param([string]$Path)
  if (-not (Test-Path $Path)) { Write-Error "File not found: $Path"; exit 2 }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    if ($line -match '^\s*([^=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      if (((($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'" ) -and $value.EndsWith("'"))))) { $value = $value.Substring(1,$value.Length-2) }
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

Import-EnvFile .\nssports\.env.local
Write-Output ""; Write-Output "----- ENV VARS -----"; Write-Output "REDIS_HOST = '$env:REDIS_HOST'"; Write-Output "REDIS_PORT = '$env:REDIS_PORT'"; Write-Output "REDIS_USERNAME = '$env:REDIS_USERNAME'"; Write-Output "REDIS_TLS  = '$env:REDIS_TLS'"; Write-Output ""
$redisHost = if ($env:REDIS_HOST -and $env:REDIS_HOST.Trim() -ne '') { $env:REDIS_HOST } else { '127.0.0.1' }
$redisPort = try { [int]$env:REDIS_PORT } catch { 0 }
if ($redisPort -lt 1) { $redisPort = 6379 }
Write-Output "----- TEST TCP -----"; Write-Output "Testing TCP $redisHost`:$redisPort"; Test-NetConnection -ComputerName $redisHost -Port $redisPort | Format-List
if ($redisHost -ne '127.0.0.1' -and $redisHost -ne 'localhost') { Write-Output ""; Write-Output "----- DNS RESOLVE -----"; Resolve-DnsName $redisHost -ErrorAction SilentlyContinue | Select-Object -First 10 }
Write-Output ""; Write-Output "----- NODE IORERIS PING -----";
# Run node from the nssports directory so local node_modules (ioredis) resolve correctly.
Push-Location .\nssports
try {
  node -e "const Redis=require('ioredis'); const host=process.env.REDIS_HOST||'127.0.0.1'; const port=parseInt(process.env.REDIS_PORT||'6379'); const tls=process.env.REDIS_TLS==='true'?{}:undefined; const r=new Redis({host,port,password:process.env.REDIS_PASSWORD||undefined,tls}); r.ping().then(x=>{console.log('PING ->',x); r.disconnect();}).catch(e=>{console.error('PING ERROR ->',e); r.disconnect(); process.exit(1);})"
} finally {
  Pop-Location
}
