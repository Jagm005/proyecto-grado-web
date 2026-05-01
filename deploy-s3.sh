#!/usr/bin/env bash
# ============================================================
# NOTA: El despliegue es en EC2 (mismo servidor que el backend).
#       Usar deploy-ec2.sh en su lugar.
#       Este archivo se mantiene solo como referencia de S3/CloudFront.
# ============================================================
# deploy-s3.sh  —  Build & deploy versión web a AWS S3 (NO USAR)
# Uso:  bash deploy-s3.sh [nombre-del-bucket] [id-distribucion-cloudfront]
# ============================================================
set -e

BUCKET="${1:-gestion-inventario-web}"
DISTRIBUTION_ID="${2:-}"   # Opcional: ID de distribución CloudFront

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================"
echo " Build + Deploy  →  s3://$BUCKET"
echo "======================================================"

# 1. Verificar dependencias
command -v aws   >/dev/null 2>&1 || { echo "ERROR: AWS CLI no instalado. Ver https://aws.amazon.com/cli/"; exit 1; }
command -v node  >/dev/null 2>&1 || { echo "ERROR: Node.js no instalado."; exit 1; }
command -v npm   >/dev/null 2>&1 || { echo "ERROR: npm no instalado."; exit 1; }

# 2. Verificar credenciales AWS
aws sts get-caller-identity >/dev/null 2>&1 || {
  echo "ERROR: Credenciales AWS no configuradas. Ejecuta 'aws configure'."
  exit 1
}

# 3. Instalar dependencias
echo ""
echo "▶ Instalando dependencias npm..."
cd "$SCRIPT_DIR"
npm ci --prefer-offline

# 4. Build de producción
echo ""
echo "▶ Construyendo la app (npm run build)..."
npm run build

# 5. Subir a S3
echo ""
echo "▶ Sincronizando con s3://$BUCKET ..."
aws s3 sync dist/ "s3://$BUCKET" \
  --delete \
  --cache-control "no-cache" \
  --exclude "assets/*"

# Archivos hashed → cache largo
aws s3 sync dist/assets/ "s3://$BUCKET/assets/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable"

echo "   ✔ Archivos subidos."

# 6. Invalidar caché CloudFront (opcional)
if [ -n "$DISTRIBUTION_ID" ]; then
  echo ""
  echo "▶ Invalidando CloudFront ($DISTRIBUTION_ID)..."
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' --output text
  echo "   ✔ Invalidación creada."
fi

echo ""
echo "======================================================"
echo " Despliegue completado."
if [ -n "$DISTRIBUTION_ID" ]; then
  echo " URL: https://$(aws cloudfront get-distribution \
    --id "$DISTRIBUTION_ID" \
    --query 'Distribution.DomainName' --output text 2>/dev/null || echo '<dominio-cloudfront>')"
else
  echo " URL: http://$BUCKET.s3-website-us-east-1.amazonaws.com"
fi
echo "======================================================"

# ──────────────────────────────────────────────────────────────────────────────
# INSTRUCCIONES INICIALES (solo la primera vez):
#
# 1. Crear bucket S3 con alojamiento estático:
#    aws s3 mb s3://NOMBRE-BUCKET --region us-east-1
#    aws s3 website s3://NOMBRE-BUCKET --index-document index.html --error-document index.html
#
# 2. Política pública de lectura (sustituir NOMBRE-BUCKET):
#    aws s3api put-bucket-policy --bucket NOMBRE-BUCKET --policy '{
#      "Version":"2012-10-17",
#      "Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow",
#        "Principal":"*","Action":"s3:GetObject",
#        "Resource":"arn:aws:s3:::NOMBRE-BUCKET/*"}]}'
#
# 3. [Opcional] Crear distribución CloudFront apuntando al bucket S3.
#    Configurar "Default root object" = index.html
#    Agregar Custom Error Response: 404 → /index.html (para React Router)
#
# 4. Copiar .env.example → .env y rellenar variables:
#    VITE_BACKEND_URL=http://18.223.120.46:3000
#    VITE_GOOGLE_CLIENT_ID=...
#
# 5. Ejecutar este script:
#    bash deploy-s3.sh NOMBRE-BUCKET [CLOUDFRONT-DISTRIBUTION-ID]
# ──────────────────────────────────────────────────────────────────────────────
