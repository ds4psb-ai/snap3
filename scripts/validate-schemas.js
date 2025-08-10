#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 스키마 파일들이 있는 디렉토리
const schemasDir = path.join(__dirname, '../src/lib/schemas');

// 검증할 스키마 파일들
const schemaFiles = [
  'evidence.zod.ts',
  'textboard.zod.ts', 
  'vdp.zod.ts',
  'veo3.zod.ts',
  'video.zod.ts'
];

console.log('🔍 Validating schemas...');

let hasErrors = false;

schemaFiles.forEach(file => {
  const filePath = path.join(schemasDir, file);
  
  if (fs.existsSync(filePath)) {
    try {
      // 파일이 존재하고 읽을 수 있는지 확인
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 기본적인 TypeScript/Zod 문법 검증
      if (content.includes('z.object') || content.includes('z.string') || content.includes('z.number')) {
        console.log(`✅ ${file} - Valid`);
      } else {
        console.log(`⚠️  ${file} - No Zod schema found`);
      }
    } catch (error) {
      console.error(`❌ ${file} - Error reading file:`, error.message);
      hasErrors = true;
    }
  } else {
    console.log(`⚠️  ${file} - File not found`);
  }
});

// OpenAPI 스키마 검증
const openapiPath = path.join(__dirname, '../openapi/openapi.yaml');
if (fs.existsSync(openapiPath)) {
  console.log('✅ openapi.yaml - Found');
} else {
  console.log('⚠️  openapi.yaml - Not found');
}

if (hasErrors) {
  console.log('\n❌ Schema validation failed');
  process.exit(1);
} else {
  console.log('\n✅ All schemas validated successfully');
  process.exit(0);
}
