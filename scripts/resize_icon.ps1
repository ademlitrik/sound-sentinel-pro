Add-Type -AssemblyName System.Drawing
$iconPath = Join-Path $PSScriptRoot "..\src\assets\icon.png"
$src = [System.Drawing.Image]::FromFile($iconPath)
$bmp = New-Object System.Drawing.Bitmap 512, 512
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.DrawImage($src, 0, 0, 512, 512)
$src.Dispose()
$graphics.Dispose()
$tempPath = Join-Path $PSScriptRoot "..\src\assets\icon_temp.png"
$bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Move-Item -Path $tempPath -Destination $iconPath -Force
Write-Output "Successfully updated icon.png to 512x512"
