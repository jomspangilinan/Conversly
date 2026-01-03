import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: 'conversly-482008',
  keyFilename: '/Users/Joms/elevenlabs/backend/service-account.json',
});

console.log('Testing bucket access...');

// Method 1: Try to get bucket
try {
  const bucket = storage.bucket('conversly-482008-videos');
  const [exists] = await bucket.exists();
  console.log('Bucket exists:', exists);
  
  if (exists) {
    const file = bucket.file(`test/upload-${Date.now()}.txt`);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 3600000,
      contentType: 'text/plain',
    });
    console.log('✅ Upload URL generated:', url.substring(0, 100));
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Code:', error.code);
}
