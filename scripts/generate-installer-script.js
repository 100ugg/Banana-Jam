// Banana Jam: writes build/installer.nsh, the extra bits for the one-click Windows setup.
//
// What the setup does:
//  - closes Banana Jam if it is running (quietly, and never any other program such as Strawberry Jam)
//  - shows a small window that says "Downloading..." for the whole install
//  - runs the setup silently, so no other setup windows show
//  - installs for this user only, then starts Banana Jam
if (process.platform !== 'win32') {
  process.exit(0);
}

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const nshScriptPath = path.join(buildDir, 'installer.nsh');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const nshScriptContent = `
RequestExecutionLevel user

!macro customInstDir
  StrCpy $INSTDIR "$LOCALAPPDATA\\Programs\\bananajam"
!macroend

!macro customInit
  ; no setup windows at all: the small "Downloading" window is the only thing you see
  SetSilent silent
  InitPluginsDir

  ; close Banana Jam if it is running (only programs from Banana Jam's own folders)
  File "/oname=$PLUGINSDIR\\bj-close.ps1" "\${PROJECT_DIR}\\installer\\bj-close.ps1"
  nsExec::Exec '"$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$PLUGINSDIR\\bj-close.ps1"'
  Pop $0

  ; the small "Downloading" window for the whole setup
  File "/oname=$PLUGINSDIR\\bj-splash.ps1" "\${PROJECT_DIR}\\installer\\bj-splash.ps1"
  System::Call 'kernel32::GetCurrentProcessId() i .r0'
  ExecShell "open" "$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe" '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File "$PLUGINSDIR\\bj-splash.ps1" -Parent $0' SW_HIDE
!macroend

!macro customInstall
  ; every setup plays the "what's new" tour again: leave one small flag for the launcher and one for the game window
  Push $0
  CreateDirectory "$APPDATA\\bananajam"
  FileOpen $0 "$APPDATA\\bananajam\\bj-fresh-launcher.flag" w
  FileWrite $0 "1"
  FileClose $0
  FileOpen $0 "$APPDATA\\bananajam\\bj-fresh-game.flag" w
  FileWrite $0 "1"
  FileClose $0
  Pop $0
  ; start Banana Jam when it's installed (a silent setup won't do this by itself)
  Exec '"$INSTDIR\\\${PRODUCT_FILENAME}.exe"'
!macroend
`;

fs.writeFileSync(nshScriptPath, nshScriptContent.trim());

console.log(`Successfully generated ${nshScriptPath}`);
