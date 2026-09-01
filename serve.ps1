$root = "C:\Users\charles\Desktop\memory"
$prefix = "http://127.0.0.1:5173/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "AXON at $prefix memory/index.html"
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".jpg"  = "image/jpeg"
  ".woff2"= "font/woff2"
  ".json" = "application/json"
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($path)) { $path = "memory/index.html" }
  $full = [IO.Path]::GetFullPath((Join-Path $root $path))
  if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    $ctx.Response.StatusCode = 403
    $ctx.Response.Close()
    continue
  }
  if (-not (Test-Path -LiteralPath $full)) {
    $ctx.Response.StatusCode = 404
    $ctx.Response.Close()
    continue
  }
  $bytes = [IO.File]::ReadAllBytes($full)
  $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
  $ctx.Response.ContentType = $mime[$ext]
  if (-not $ctx.Response.ContentType) { $ctx.Response.ContentType = "application/octet-stream" }
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}
