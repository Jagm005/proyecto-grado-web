#!/usr/bin/env bash
# ============================================================
# deploy-ec2.sh  —  Build & deploy versión web al mismo EC2
#                   donde corre el backend Node.js/Express
#
# Uso:
#   bash deploy-ec2.sh [EC2_HOST] [EC2_USER] [RUTA_PEM]
#
# Ejemplos:
#   bash deploy-ec2.sh 18.223.120.46 ec2-user ~/.ssh/mi-llave.pem
#   bash deploy-ec2.sh 18.223.120.46 ubuntu   ~/.ssh/mi-llave.pem
# ============================================================
set -e

EC2_HOST="${1:-18.223.120.46}"
EC2_USER="${2:-ec2-user}"
PEM_KEY="${3:-~/.ssh/mi-llave.pem}"
REMOTE_DIR="/var/www/inventario"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "======================================================"
echo " Build + Deploy  →  $EC2_USER@$EC2_HOST:$REMOTE_DIR"
echo "======================================================"

# 1. Verificar dependencias locales
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js no instalado."; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "ERROR: npm no instalado."; exit 1; }
command -v ssh  >/dev/null 2>&1 || { echo "ERROR: ssh no instalado."; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "AVISO: rsync no encontrado, se usará scp."; USE_SCP=1; }

# 2. Verificar que existe el .env con VITE_BACKEND_URL vacío para producción
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo ""
  echo "AVISO: no se encontró .env — creando desde .env.example..."
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
  # Para despliegue en EC2: VITE_BACKEND_URL debe estar vacío
  sed -i 's/^VITE_BACKEND_URL=.*/VITE_BACKEND_URL=/' "$SCRIPT_DIR/.env" 2>/dev/null || true
fi

# Mostrar qué VITE_BACKEND_URL se usará
BACKEND_URL=$(grep '^VITE_BACKEND_URL=' "$SCRIPT_DIR/.env" | cut -d= -f2-)
if [ -z "$BACKEND_URL" ]; then
  echo "   ✔ VITE_BACKEND_URL vacío → Nginx proxeará /api a localhost:3000"
else
  echo "   ℹ VITE_BACKEND_URL=$BACKEND_URL"
fi

# 3. Instalar dependencias npm
echo ""
echo "▶ Instalando dependencias npm..."
cd "$SCRIPT_DIR"
npm ci --prefer-offline

# 4. Build de producción
echo ""
echo "▶ Construyendo app React (npm run build)..."
npm run build
echo "   ✔ Build generado en dist/"

# 5. Subir dist/ al EC2
echo ""
echo "▶ Subiendo dist/ al EC2..."

# Crear directorio remoto si no existe
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" \
  "sudo mkdir -p $REMOTE_DIR && sudo chown -R $EC2_USER:$EC2_USER $REMOTE_DIR"

if [ "${USE_SCP:-0}" -eq 0 ]; then
  rsync -avz --delete \
    -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" \
    "$DIST_DIR/" \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"
else
  scp -i "$PEM_KEY" -o StrictHostKeyChecking=no -r "$DIST_DIR/"* \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"
fi
echo "   ✔ Archivos subidos."

# 6. Recargar Nginx en el servidor
echo ""
echo "▶ Recargando Nginx..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" \
  "sudo nginx -t && sudo systemctl reload nginx" && \
  echo "   ✔ Nginx recargado." || \
  echo "   ⚠ No se pudo recargar Nginx. Revisa la configuración en el servidor."

echo ""
echo "======================================================"
echo " Despliegue completado."
echo " URL: http://$EC2_HOST"
echo "======================================================"

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN INICIAL EN EL EC2 (ejecutar una sola vez vía SSH):
#
#  1. Instalar Nginx:
#     sudo apt update && sudo apt install -y nginx   # Ubuntu/Debian
#     sudo yum install -y nginx                      # Amazon Linux / CentOS
#
#  2. Copiar la configuración Nginx incluida en este repo:
#     sudo cp nginx/inventario.conf /etc/nginx/conf.d/inventario.conf
#     sudo nginx -t && sudo systemctl enable nginx && sudo systemctl start nginx
#
#  3. Abrir puerto 80 en el Security Group de AWS
#     (EC2 → Security Groups → Inbound rules → Add rule → HTTP → 0.0.0.0/0)
#
#  4. (Opcional) Puerto 3000 puede cerrarse al público una vez Nginx proxee /api.
#
#  5. Para HTTPS gratuito con Let's Encrypt:
#     sudo apt install -y certbot python3-certbot-nginx
#     sudo certbot --nginx -d tudominio.com
# ──────────────────────────────────────────────────────────────────────────────
