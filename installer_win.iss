; Optional Windows installer (after building dist\manifest_gui.exe)
#define MyAppName \"Manifest GUI\"
#define MyAppExeName \"manifest_gui.exe\"
#define MyAppVersion \"1.0.0\"
#define MyAppPublisher \"freepixels\"
#define MyAppURL \"https://github.com/freepixels526/freepixels526.github.io\"

[Setup]
AppId={{E5B7A309-3E55-4A22-9A13-03E2F0BBF123}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=dist
OutputBaseFilename=Manifest-GUI-Setup
Compression=lzma
SolidCompression=yes
SetupIconFile=icon.ico
WizardStyle=modern

[Files]
Source: \"dist\\{#MyAppExeName}\"; DestDir: \"{app}\"; Flags: ignoreversion

[Icons]
Name: \"{group}\\{#MyAppName}\"; Filename: \"{app}\\{#MyAppExeName}\"
Name: \"{commondesktop}\\{#MyAppName}\"; Filename: \"{app}\\{#MyAppExeName}\"; Tasks: desktopicon

[Tasks]
Name: \"desktopicon\"; Description: \"Create a &desktop icon\"; GroupDescription: \"Additional icons:\"; Flags: unchecked

[Run]
Filename: \"{app}\\{#MyAppExeName}\"; Description: \"Launch {#MyAppName}\"; Flags: nowait postinstall skipifsilent
