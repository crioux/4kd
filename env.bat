@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

PUSHD %~dp0
SET ROOTDIR=%CD%
POPD

set PATH=%~dp0;%~dp0\tools;%~dp0\tools\crinkler\win64;%~dp0\tools\7zip;%~dp0\tools\nasm;%~dp0\tools\ar;%PATH%

for /f "usebackq tokens=*" %%i in (`vswhere -version 16 -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
  set VSDEVCMD=%%i\Common7\Tools\vsdevcmd.bat
)

IF NOT EXIST "%VSDEVCMD%" (
    echo "Visual Studio 2019 is not installed correctly. Exiting."
    goto end
)

cmd /k "%VSDEVCMD%" -arch=x86 -host_arch=x86

ENDLOCAL