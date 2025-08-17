import { Storage } from '@google-cloud/storage';

const storage = new Storage();

export async function readJsonFromGcs(gcsUri) {
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid GCS URI: ${gcsUri}`);
  
  const [_, bucket, name] = match;
  const [buffer] = await storage.bucket(bucket).file(name).download();
  return JSON.parse(buffer.toString('utf8'));
}