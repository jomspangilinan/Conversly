#!/bin/bash

# Simple Cloud Storage Upload Test
# Tests just the signed URL generation without Firestore

echo "🧪 Testing Cloud Storage Signed URL Generation"
echo "=============================================="

cd /Users/Joms/elevenlabs/backend

# Test signed URL generation directly with Node
node -e "
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: 'conversly-482008',
  keyFilename: '/Users/Joms/elevenlabs/backend/service-account.json',
});

const bucket = storage.bucket('conversly-482008-videos');
const file = bucket.file('test/sample-${Date.now()}.mp4');

file.getSignedUrl({
  version: 'v4',
  action: 'write',
  expires: Date.now() + 3600000,
  contentType: 'video/mp4',
}).then(([url]) => {
  console.log('✅ Signed URL generated successfully!');
  console.log('URL:', url.substring(0, 100) + '...');
}).catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
"
