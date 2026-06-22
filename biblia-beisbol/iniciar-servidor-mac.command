#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "Iniciando el servidor..."
echo "Si macOS pregunta si permites conexiones de red para 'node', presiona Permitir."
echo ""
node server.js
echo ""
echo "El servidor se detuvo. Si viste 'command not found: node', instala Node.js desde https://nodejs.org"
read -p "Presiona Enter para cerrar..."
