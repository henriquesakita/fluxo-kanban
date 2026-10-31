$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$build = $PSScriptRoot
New-Item -ItemType Directory -Force -Path $build | Out-Null

function New-RoundedPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-IconBitmap([int]$size) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $scale = $size / 512.0
  $path = New-RoundedPath 0 0 $size $size (112 * $scale)

  $rect = [System.Drawing.RectangleF]::new(0, 0, $size, $size)
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 139, 92, 255),
    [System.Drawing.Color]::FromArgb(255, 34, 211, 238),
    45.0
  )
  $blend = [System.Drawing.Drawing2D.ColorBlend]::new(3)
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb(255, 139, 92, 255),
    [System.Drawing.Color]::FromArgb(255, 79, 125, 255),
    [System.Drawing.Color]::FromArgb(255, 34, 211, 238)
  )
  $blend.Positions = @(0.0, 0.55, 1.0)
  $brush.InterpolationColors = $blend
  $g.FillPath($brush, $path)

  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $bars = @(
    @{ x = 112; y = 128; w = 64; h = 256 },
    @{ x = 224; y = 128; w = 64; h = 160 },
    @{ x = 336; y = 128; w = 64; h = 208 }
  )
  foreach ($bar in $bars) {
    $barPath = New-RoundedPath ($bar.x * $scale) ($bar.y * $scale) ($bar.w * $scale) ($bar.h * $scale) (24 * $scale)
    $g.FillPath($white, $barPath)
    $barPath.Dispose()
  }

  $white.Dispose()
  $brush.Dispose()
  $path.Dispose()
  $g.Dispose()
  return $bmp
}

$png = New-IconBitmap 512
$png.Save((Join-Path $build 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$png.Dispose()

$icoBmp = New-IconBitmap 256
$stream = [System.IO.MemoryStream]::new()
$icoBmp.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$icoBmp.Dispose()
$bytes = $stream.ToArray()
$stream.Dispose()

$fs = [System.IO.File]::Create((Join-Path $build 'icon.ico'))
$bw = [System.IO.BinaryWriter]::new($fs)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]1)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]32)
$bw.Write([UInt32]$bytes.Length)
$bw.Write([UInt32]22)
$bw.Write($bytes)
$bw.Flush()
$bw.Close()
$fs.Dispose()

Write-Output ("icon.png: {0} bytes" -f (Get-Item (Join-Path $build 'icon.png')).Length)
Write-Output ("icon.ico: {0} bytes" -f (Get-Item (Join-Path $build 'icon.ico')).Length)
