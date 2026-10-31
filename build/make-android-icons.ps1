$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$res = Join-Path $PSScriptRoot '..\android\app\src\main\res' | Resolve-Path
$res = $res.Path

function New-RoundedPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = [Math]::Min($r * 2, [Math]::Min($w, $h))
  if ($d -le 0) { $d = 0.01 }
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-GradientBrush([single]$w, [single]$h) {
  $rect = [System.Drawing.RectangleF]::new(0, 0, $w, $h)
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
  return $brush
}

# Desenha as tres barras do logo (coordenadas base 512) centralizadas
function Add-LogoBars($g, [single]$canvas, [single]$contentRatio) {
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $barsW = 288.0
  $scale = ($canvas * $contentRatio) / $barsW
  $bars = @(
    @{ x = 112; y = 128; w = 64; h = 256 },
    @{ x = 224; y = 128; w = 64; h = 160 },
    @{ x = 336; y = 128; w = 64; h = 208 }
  )
  foreach ($bar in $bars) {
    $bx = (($bar.x - 256.0) * $scale) + ($canvas / 2.0)
    $by = (($bar.y - 256.0) * $scale) + ($canvas / 2.0)
    $p = New-RoundedPath $bx $by ($bar.w * $scale) ($bar.h * $scale) (24.0 * $scale)
    $g.FillPath($white, $p)
    $p.Dispose()
  }
  $white.Dispose()
}

# Icone legado (quadrado arredondado)
function New-LegacyIcon([int]$size) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $path = New-RoundedPath 0 0 $size $size ($size * 0.219)
  $brush = New-GradientBrush $size $size
  $g.FillPath($brush, $path)
  Add-LogoBars $g $size 0.56

  $brush.Dispose(); $path.Dispose(); $g.Dispose()
  return $bmp
}

# Icone redondo
function New-RoundIcon([int]$size) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $brush = New-GradientBrush $size $size
  $g.FillEllipse($brush, 0, 0, $size - 1, $size - 1)
  Add-LogoBars $g $size 0.52

  $brush.Dispose(); $g.Dispose()
  return $bmp
}

# Foreground adaptativo: canvas 108dp, conteudo na zona segura
function New-Foreground([int]$size) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  Add-LogoBars $g $size 0.46
  $g.Dispose()
  return $bmp
}

$densities = @{
  'mdpi'    = 48
  'hdpi'    = 72
  'xhdpi'   = 96
  'xxhdpi'  = 144
  'xxxhdpi' = 192
}

foreach ($entry in $densities.GetEnumerator()) {
  $dir = Join-Path $res ("mipmap-" + $entry.Key)
  $size = $entry.Value

  $legacy = New-LegacyIcon $size
  $legacy.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $legacy.Dispose()

  $round = New-RoundIcon $size
  $round.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $round.Dispose()

  $fg = New-Foreground ([int]($size * 2.25))
  $fg.Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $fg.Dispose()

  Write-Output ("mipmap-{0}: {1}px" -f $entry.Key, $size)
}

# Splash: fundo escuro com o logo centralizado
function New-Splash([int]$w, [int]$h, [string]$path) {
  $bmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 8, 9, 14))

  $size = [int]([Math]::Min($w, $h) * 0.32)
  if ($size -lt 96) { $size = 96 }
  $ox = ($w - $size) / 2.0
  $oy = ($h - $size) / 2.0

  $pathShape = New-RoundedPath $ox $oy $size $size ($size * 0.219)
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.RectangleF]::new($ox, $oy, $size, $size),
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
  $g.FillPath($brush, $pathShape)

  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $scale = ($size * 0.56) / 288.0
  $bars = @(
    @{ x = 112; y = 128; w = 64; h = 256 },
    @{ x = 224; y = 128; w = 64; h = 160 },
    @{ x = 336; y = 128; w = 64; h = 208 }
  )
  foreach ($bar in $bars) {
    $bx = (($bar.x - 256.0) * $scale) + ($ox + $size / 2.0)
    $by = (($bar.y - 256.0) * $scale) + ($oy + $size / 2.0)
    $p = New-RoundedPath $bx $by ($bar.w * $scale) ($bar.h * $scale) (24.0 * $scale)
    $g.FillPath($white, $p)
    $p.Dispose()
  }

  $white.Dispose(); $brush.Dispose(); $pathShape.Dispose(); $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$splashes = @(
  @{ d = 'drawable';           w = 480;  h = 320 },
  @{ d = 'drawable-land-mdpi';   w = 480;  h = 320 },
  @{ d = 'drawable-land-hdpi';   w = 800;  h = 480 },
  @{ d = 'drawable-land-xhdpi';  w = 1280; h = 720 },
  @{ d = 'drawable-land-xxhdpi'; w = 1600; h = 960 },
  @{ d = 'drawable-land-xxxhdpi';w = 1920; h = 1280 },
  @{ d = 'drawable-port-mdpi';   w = 320;  h = 480 },
  @{ d = 'drawable-port-hdpi';   w = 480;  h = 800 },
  @{ d = 'drawable-port-xhdpi';  w = 720;  h = 1280 },
  @{ d = 'drawable-port-xxhdpi'; w = 960;  h = 1600 },
  @{ d = 'drawable-port-xxxhdpi';w = 1280; h = 1920 }
)

foreach ($s in $splashes) {
  New-Splash $s.w $s.h (Join-Path $res ($s.d + '\splash.png'))
}

Write-Output 'Splashes gerados.'
Write-Output 'Icones Android prontos.'
