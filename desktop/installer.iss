#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "dist\SpotiStorage"
#endif
#ifndef OutputDir
  #define OutputDir "dist"
#endif

[Setup]
AppId={{6F3B7C2E-8D4A-4E1B-9C55-2A7E0F1D9B34}
AppName=SpotiStorage
AppVersion={#AppVersion}
AppVerName=SpotiStorage {#AppVersion}
AppPublisher=SpotiStorage
AppPublisherURL=https://github.com/vlad-vifel/spotistorage
AppSupportURL=https://github.com/vlad-vifel/spotistorage/issues
AppUpdatesURL=https://github.com/vlad-vifel/spotistorage/releases
DefaultDirName={localappdata}\Programs\SpotiStorage
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=SpotiStorage-Setup-v{#AppVersion}
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\SpotiStorage.exe
UninstallDisplayName=SpotiStorage
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[InstallDelete]
Type: filesandordirs; Name: "{app}\_internal"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\SpotiStorage"; Filename: "{app}\SpotiStorage.exe"
Name: "{autodesktop}\SpotiStorage"; Filename: "{app}\SpotiStorage.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\SpotiStorage.exe"; Description: "{cm:LaunchProgram,SpotiStorage}"; Flags: nowait postinstall skipifsilent
