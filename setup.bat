@echo off
REM Script de Configuración de HomeSync para Windows

echo ==========================================
echo    HomeSync - Script de Configuracion
echo ==========================================
echo.

REM Verificar Node.js
echo Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no esta instalado
    echo Por favor instala Node.js v16 o superior desde https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js instalado: %NODE_VERSION%

REM Verificar npm
echo Verificando npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm no esta instalado
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm instalado: %NPM_VERSION%

REM Instalar dependencias
echo.
echo Instalando dependencias...
echo (Esto puede tomar varios minutos)
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Error al instalar dependencias
    pause
    exit /b 1
)

echo [OK] Dependencias instaladas correctamente

REM Verificar archivo .env
echo.
echo Verificando configuracion de variables de entorno...
if exist ".env" (
    echo [OK] Archivo .env encontrado
    echo [ADVERTENCIA] Asegurate de haber configurado tus credenciales de Firebase
) else (
    echo [ADVERTENCIA] Archivo .env no encontrado
    echo Creando .env desde .env.example...
    
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Archivo .env creado
        echo [IMPORTANTE] Edita el archivo .env con tus credenciales de Firebase
    ) else (
        echo [ERROR] .env.example no encontrado
    )
)

REM Resumen
echo.
echo ==========================================
echo [OK] Configuracion Completada
echo ==========================================
echo.
echo Proximos pasos:
echo.
echo 1. Configura Firebase:
echo    - Ve a https://console.firebase.google.com/
echo    - Crea un proyecto o selecciona uno existente
echo    - Habilita Authentication (Email/Password)
echo    - Habilita Firestore Database
echo    - Copia las credenciales de configuracion
echo.
echo 2. Edita el archivo .env con tus credenciales:
echo    - Abre .env en tu editor
echo    - Reemplaza los valores de ejemplo con tus credenciales
echo.
echo 3. Ejecuta la aplicacion:
echo    npm start         (para abrir el menu de Expo)
echo    npm run android   (para ejecutar en Android)
echo    npm run web       (para ejecutar en navegador)
echo.
echo Documentacion completa en README.md
echo.
pause

