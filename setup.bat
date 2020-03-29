@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
REM #############################################

@echo --==/ 4kd setup /==--

PUSHD %~dp0
SET ROOTDIR=%CD%
POPD

IF NOT EXIST "%VSDEVCMD%" (
  echo "You must run this inside the 'env.bat' shell"
  goto end
)

echo ** Finding cargo.exe
FOR %%X IN (cargo.exe) DO (SET CARGO_FOUND=%%~$PATH:X)
IF NOT DEFINED CARGO_FOUND (
   echo "Cargo.exe is required but it's not installed. Install Rust and ensure it is in your path. Aborting."
   goto end
)
echo    =^> !CARGO_FOUND!

echo ** Finding python.exe
FOR %%X IN (python.exe) DO (SET PYTHON_FOUND=%%~$PATH:X)
IF NOT DEFINED PYTHON_FOUND (
    echo PYTHON is required it's not installed. Install Python 2.7 or higher. Aborting.
    goto end
)
python -c "import platform; print platform.system()" | findstr /V /C:"Windows" >nul && (
  echo It looks like you aren't using the standard Windows version of Python.
  goto end
)
python -c "import sys; print sys.version_info.major==2 and sys.version_info.minor>=7" | findstr /C:"False" >nul && (
  echo It looks like you aren't using Python 2.7 or greater
  goto end
)
python -c "import sys; print(sys.maxsize > 2**32)" | findstr /V /C:"False" >nul && (
  echo It looks like you aren't using the 32-bit version of Python.
  goto end
)
echo    =^> !PYTHON_FOUND!

echo ** Finding bash.exe
FOR %%X IN (bash.exe) DO (SET BASH_FOUND=%%~$PATH:X)
IF NOT DEFINED BASH_FOUND (
   echo "bash.exe is required but it's not installed. Install Git For Windows and ensure it's Unix tools are in your path. Aborting."
   goto end
)
echo    =^> !BASH_FOUND!

REM #############################################

echo Building Oidos...

rustup default stable
rustup target add x86_64-pc-windows-msvc
rustup target add i686-pc-windows-msvc

pip install py2exe_py2

pushd %ROOTDIR%\Oidos
start /i /b /wait cmd /c bash ./makedist.sh
popd

echo Done!

REM #############################################

echo Configuring demo...

echo tools: ^

  glew: "%ROOTDIR:\=\\%\\tools\\glew"^

  shader-minifier: "%ROOTDIR:\=\\%\\tools\\shader_minifier.exe"^

  oidos: "%ROOTDIR:\=\\%\\Oidos\\dist\\Oidos"^

  glslangValidator: "%ROOTDIR:\=\\%\\tools\\glslangValidator.exe"^

> %ROOTDIR%\src\demo\config.local.yml

echo Done!

:end
ENDLOCAL
