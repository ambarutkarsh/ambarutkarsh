@echo off
REM Build script for Windows
REM Run from the data-streamliner\ directory: desktop\build.bat

echo === Data Streamliner Desktop Build ===

REM 1. Build the React frontend
echo ^>^>^> Building React frontend...
cd frontend
call npm ci
call npm run build
cd ..

REM Copy React build to backend\static
echo ^>^>^> Copying frontend build to backend\static...
if exist backend\static rmdir /s /q backend\static
xcopy /e /i frontend\dist backend\static

REM 2. Install Python dependencies
echo ^>^>^> Installing Python dependencies...
cd backend
pip install --upgrade pip
pip install -r requirements-desktop.txt
pip install pyinstaller
cd ..

REM 3. Run PyInstaller
echo ^>^>^> Running PyInstaller...
pyinstaller desktop\DataStreamliner.spec --distpath dist\desktop --workpath build\pyinstaller --clean

echo.
echo === Build complete ===
echo Output: dist\desktop\DataStreamliner.exe
