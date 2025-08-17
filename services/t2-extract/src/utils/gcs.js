import { Storage } from '@google-cloud/storage';

/**
 * Parse GCS URI into bucket and object name components
 * @param {string} gcsUri - GCS URI in format gs://bucket/path/to/object
 * @returns {Object} Object with bucket and name properties
 */
export function parseGcsUri(gcsUri) {
  if (!gcsUri?.startsWith('gs://')) {
    throw new Error('Invalid GCS URI');
  }
  const [, , bucket, ...rest] = gcsUri.split('/');
  return { bucket, name: rest.join('/') };
}

/**
 * Save JSON object to GCS
 * @param {string} gcsUri - Target GCS URI
 * @param {Object} obj - Object to save as JSON
 * @returns {Promise<string>} The saved GCS URI
 */
export async function saveJsonToGcs(gcsUri, obj) {
  const { bucket, name } = parseGcsUri(gcsUri);
  const storage = new Storage();
  const file = storage.bucket(bucket).file(name);
  const data = Buffer.from(JSON.stringify(obj, null, 2));
  
  await file.save(data, { 
    metadata: {
      contentType: 'application/json',
      metadata: {
        timestamp: new Date().toISOString(),
        service: 't2-extract',
        version: 'v5-universal'
      }
    }
  });
  
  return `gs://${bucket}/${name}`;
}