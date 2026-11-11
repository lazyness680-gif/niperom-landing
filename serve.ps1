$ErrorActionPreference = 'Stop'

$port = 8765
$root = (Get-Item $PSScriptRoot).FullName.TrimEnd('\')
$url = "http://127.0.0.1:$port/"

function Write-Response {
  param(
    [System.IO.Stream]$Stream,
    [string]$Status,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$HeadOnly
  )

  $header = "HTTP/1.1 $Status`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

function Get-ContentType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.js'   { return 'application/javascript; charset=utf-8' }
    '.mjs'  { return 'application/javascript; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.xml'  { return 'application/xml; charset=utf-8' }
    '.txt'  { return 'text/plain; charset=utf-8' }
    '.svg'  { return 'image/svg+xml' }
    '.png'  { return 'image/png' }
    '.jpg'  { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.webp' { return 'image/webp' }
    '.gif'  { return 'image/gif' }
    '.ico'  { return 'image/x-icon' }
    '.woff' { return 'font/woff' }
    '.woff2' { return 'font/woff2' }
    '.ttf'  { return 'font/ttf' }
    default { return 'application/octet-stream' }
  }
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
try {
  $listener.Start()
} catch {
  Write-Host "Port $port is already in use. Opening $url"
  Start-Process $url
  exit 0
}

Write-Host "Serving $root"
Write-Host "Open $url"
Write-Host "Press Ctrl+C to stop the server."
Start-Process $url

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    $reader = $null
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

      $parts = $requestLine -split ' '
      if ($parts.Length -lt 2) {
        Write-Response $stream '400 Bad Request' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Bad request')) $false
        continue
      }

      $method = $parts[0].ToUpperInvariant()
      $rawPath = $parts[1]
      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line -eq '') { break }
      }

      $pathOnly = ($rawPath -split '\?')[0]
      $decoded = [System.Uri]::UnescapeDataString($pathOnly).Replace('\', '/')
      if ($decoded -eq '' -or $decoded -eq '/') {
        $decoded = '/index.html'
      } elseif ($decoded.EndsWith('/')) {
        $decoded = $decoded + 'index.html'
      }

      $full = [System.IO.Path]::GetFullPath((Join-Path $root $decoded.TrimStart('/')))
      if (-not $full.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Response $stream '403 Forbidden' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Forbidden')) ($method -eq 'HEAD')
        continue
      }

      if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        Write-Response $stream '404 Not Found' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Not found')) ($method -eq 'HEAD')
        continue
      }

      $body = [System.IO.File]::ReadAllBytes($full)
      Write-Response $stream '200 OK' (Get-ContentType $full) $body ($method -eq 'HEAD')
    } catch {
      Write-Host "Request error: $($_.Exception.Message)"
    } finally {
      if ($reader) { $reader.Dispose() }
      if ($stream) { $stream.Dispose() }
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
