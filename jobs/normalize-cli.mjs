#!/usr/bin/env node
// normalize-cli.mjs - Simple CLI for URL normalization testing

import { normalizeSocialUrl } from './url-normalizer.js';

async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error('Usage: node normalize-cli.mjs <URL>');
    console.error('Example: node normalize-cli.mjs "https://youtu.be/55e6ScXfiZc"');
    process.exit(1);
  }

  try {
    const result = await normalizeSocialUrl(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();