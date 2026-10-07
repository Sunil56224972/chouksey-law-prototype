# Extracts the photographs from the framed Vidyarambh event posters
# (1600x1600 social posters published on cecbilaspur.ac.in) into clean web images.
# Usage: powershell -ExecutionPolicy Bypass -File tools/crop-photos.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'assets/img/law/originals'
$out = Join-Path $root 'assets/img/law'

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L

function Save-Crop([string]$file, [int]$x, [int]$y, [int]$w, [int]$h, [string]$name) {
  $img = [System.Drawing.Image]::FromFile($file)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $dest = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $from = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $g.DrawImage($img, $dest, $from, [System.Drawing.GraphicsUnit]::Pixel)
  $bmp.Save((Join-Path $out $name), $codec, $params)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

# Posters with two side-by-side photos vs. one ornament-framed photo.
$double = 2, 3, 4, 5, 6, 7
foreach ($n in 1..18) {
  $id = '{0:D2}' -f $n
  $file = Join-Path $src "vidyarambh-$id.jpg"
  if ($double -contains $n) {
    Save-Crop $file 70 475 700 905 "v$id-a.jpg"
    Save-Crop $file 835 475 700 905 "v$id-b.jpg"
  } else {
    # Band clear of the ornamental corners.
    Save-Crop $file 250 560 1100 760 "v$id.jpg"
  }
}
