@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"

if not exist "%GIT_BASH%" set "GIT_BASH=%LocalAppData%\Programs\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"

if not exist "%GIT_BASH%" (
    echo Git Bash was not found.
    echo Install Git for Windows, then run this launcher again.
    exit /b 1
)

"%GIT_BASH%" "%PROJECT_DIR%start-all.sh"
exit /b %ERRORLEVEL%
