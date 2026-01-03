#!/bin/bash
# GCP Setup Automation Script for Conversly
# Run this script to set up your Google Cloud infrastructure

set -e  # Exit on any error

PROJECT_ID="conversly-482008"
REGION="us-central1"
BUCKET_NAME="${PROJECT_ID}-videos"
SERVICE_ACCOUNT_NAME="conversly-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🚀 Setting up Conversly on Google Cloud Platform"
echo "=================================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# 1. Set active project
echo "📌 Setting active project..."
gcloud config set project $PROJECT_ID

# 2. Enable required APIs
echo "🔌 Enabling required APIs..."
gcloud services enable \
  aiplatform.googleapis.com \
  storage-api.googleapis.com \
  storage-component.googleapis.com \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com

echo "✅ APIs enabled successfully!"

# 3. Create service account
echo "👤 Creating service account..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --display-name="Conversly Service Account" \
  --description="Service account for Conversly backend" \
  2>/dev/null || echo "Service account already exists"

# 4. Grant necessary roles
echo "🔐 Granting IAM roles..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.admin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/datastore.user" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.admin" \
  --condition=None

echo "✅ IAM roles granted!"

# 5. Create and download service account key
echo "🔑 Creating service account key..."
if [ -f "service-account.json" ]; then
  echo "⚠️  service-account.json already exists. Skipping key creation."
else
  gcloud iam service-accounts keys create service-account.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL
  echo "✅ Service account key saved to service-account.json"
fi

# 6. Create Cloud Storage bucket
echo "🪣 Creating Cloud Storage bucket..."
gsutil mb -c STANDARD -l $REGION gs://$BUCKET_NAME 2>/dev/null || echo "Bucket already exists"

# 7. Set bucket CORS policy
echo "🌐 Setting CORS policy..."
cat > cors.json <<EOF
[
  {
    "origin": ["http://localhost:5173", "http://localhost:3000", "https://*.firebaseapp.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://$BUCKET_NAME
rm cors.json
echo "✅ CORS policy applied!"

# 8. Initialize Firestore (if not already done)
echo "📊 Checking Firestore..."
echo "Note: You may need to initialize Firestore manually at:"
echo "https://console.firebase.google.com/project/$PROJECT_ID/firestore"

# 9. Update .env file
echo "📝 Updating .env file..."
if [ -f ".env" ]; then
  # Update existing .env
  sed -i.bak "s|GCP_PROJECT_ID=.*|GCP_PROJECT_ID=$PROJECT_ID|g" .env
  sed -i.bak "s|GCS_BUCKET_NAME=.*|GCS_BUCKET_NAME=$BUCKET_NAME|g" .env
  sed -i.bak "s|FIREBASE_PROJECT_ID=.*|FIREBASE_PROJECT_ID=$PROJECT_ID|g" .env
  sed -i.bak "s|FIREBASE_CLIENT_EMAIL=.*|FIREBASE_CLIENT_EMAIL=$SERVICE_ACCOUNT_EMAIL|g" .env
  rm .env.bak
  echo "✅ .env file updated!"
else
  echo "⚠️  .env file not found. Please copy from .env.example"
fi

echo ""
echo "✅ GCP Setup Complete!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Get Gemini API Key: https://aistudio.google.com/app/apikey"
echo "2. Get ElevenLabs API Key: https://elevenlabs.io/app/settings/api-keys"
echo "3. Update backend/.env with API keys"
echo "4. Initialize Firebase: https://console.firebase.google.com/project/$PROJECT_ID"
echo ""
echo "📄 Your credentials:"
echo "   Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "   Key File: service-account.json (DO NOT COMMIT!)"
echo "   Storage Bucket: gs://$BUCKET_NAME"
echo ""
