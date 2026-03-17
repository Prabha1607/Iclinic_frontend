#!/bin/bash

# -----------------------------
# CONFIGURATION
# -----------------------------
PROJECT_ID="gwx-internship-01"
REGION="us-east1"
SERVICE_NAME="iclinic-frontend"
GAR_REPO="us-east1-docker.pkg.dev/$PROJECT_ID/gwx-gar-intern-01"
IMAGE="$GAR_REPO/iclinic-frontend:latest"

GATEWAY_URL="https://iclinic-api-gateway-717740758627.us-east1.run.app"

# -----------------------------
# BUILD FRONTEND ENV
# -----------------------------
echo "Creating .env.production..."
cat <<ENVEOF > .env.production
VITE_GATEWAY_URL=$GATEWAY_URL
ENVEOF

# -----------------------------
# BUILD DOCKER IMAGE
# -----------------------------
echo "Building Docker image..."
docker build -t $IMAGE .

# -----------------------------
# PUSH IMAGE
# -----------------------------
echo "Pushing image to Artifact Registry..."
docker push $IMAGE

# -----------------------------
# DEPLOY TO CLOUD RUN
# -----------------------------
echo "Deploying $SERVICE_NAME..."

if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
  echo "Service exists, updating..."
  gcloud run services update $SERVICE_NAME \
    --image=$IMAGE \
    --region=$REGION \
    --project=$PROJECT_ID \
    --port=80 \
    --service-account gwx-cloudrun-sa-01@$PROJECT_ID.iam.gserviceaccount.com
else
  echo "Service does not exist, creating..."
  gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE \
    --region=$REGION \
    --no-allow-unauthenticated \
    --project=$PROJECT_ID \
    --platform=managed \
    --port=80 \
    --service-account gwx-cloudrun-sa-01@$PROJECT_ID.iam.gserviceaccount.com
fi

# -----------------------------
# ALLOW PUBLIC ACCESS
# -----------------------------
echo "Setting public access..."
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --member="allUsers" \
  --role="roles/run.invoker"

echo "$SERVICE_NAME deployed successfully!"
echo "Frontend URL: https://iclinic-frontend-717740758627.us-east1.run.app"