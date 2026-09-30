# Banana Jam setup: a small window that only says "Downloading..."
# until the installer has finished. The setup itself runs silently.
#
# The installer starts this at the very beginning and passes its own process id.
param(
  [int]$Parent = 0
)

$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

function New-Label($text, $font, $color, $top, $height) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.Font = $font
  $label.ForeColor = $color
  $label.BackColor = [System.Drawing.Color]::Transparent
  $label.TextAlign = 'MiddleCenter'
  $label.Location = New-Object System.Drawing.Point(6, $top)
  $label.Size = New-Object System.Drawing.Size(288, $height)
  $form.Controls.Add($label)
  return $label
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Banana Jam Setup'
$form.FormBorderStyle = 'None'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(300, 60)
$form.BackColor = [System.Drawing.Color]::FromArgb(255, 255, 255)
$form.TopMost = $true
$form.ShowInTaskbar = $true
try { $form.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon([System.Diagnostics.Process]::GetProcessById($Parent).MainModule.FileName) } catch {}

$note = New-Label 'Downloading...' (New-Object System.Drawing.Font('Segoe UI', 11)) ([System.Drawing.Color]::FromArgb(70, 70, 70)) 17 26

# drag the window by clicking anywhere on it
$drag = $null
$down = { param($s, $e) if ($e.Button -eq 'Left') { $script:drag = $e.Location } }
$move = { param($s, $e) if ($script:drag) { $form.Left += $e.X - $script:drag.X; $form.Top += $e.Y - $script:drag.Y } }
$up = { $script:drag = $null }
foreach ($c in @($form, $note)) { $c.Add_MouseDown($down); $c.Add_MouseMove($move); $c.Add_MouseUp($up) }

# keep going until the setup has finished (but stay for at least 3 seconds)
$started = Get-Date
$ticks = 0
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 60
$timer.Add_Tick({
  $script:ticks++
  $note.Text = 'Downloading' + ('.' * ([int][Math]::Floor($script:ticks / 12) % 4))
  if ($script:ticks % 8 -ne 0) { return }
  $alive = $false
  if ($Parent -gt 0) { $alive = $null -ne (Get-Process -Id $Parent -ErrorAction SilentlyContinue) }
  $age = ((Get-Date) - $script:started).TotalSeconds
  if ((-not $alive -and $age -gt 3) -or $age -gt 600) { $timer.Stop(); $form.Close() }
})
$form.Add_Shown({ $form.Activate(); $timer.Start() })

[System.Windows.Forms.Application]::Run($form)
