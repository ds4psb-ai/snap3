#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { z } from 'zod';
import path from 'path';
import Ajv from 'ajv';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}
import addFormats from 'ajv-formats';
import { VEO3_PROMPT_SCHEMA, VEO3_RESPONSE_SCHEMA, VEO3_JOB_SCHEMA } from '../src/lib/schemas/veo3.zod';

// Initialize AJV with JSON Schema 2020-12 support and formats
const ajv = new Ajv({
  allErrors: true,
  addUsedSchema: false
});

// Add formats support
try {
  addFormats(ajv as any); // Type compatibility workaround
} catch (error) {
  console.warn('Warning: ajv-formats setup failed, proceeding without format validation:', (error as Error).message);
}

interface ValidationResult {
  schema: string;
  valid: boolean;
  errors: string[];
  tests: { name: string; passed: boolean; error?: string }[];
}

const results: ValidationResult[] = [];

// Load OpenAPI spec
const openapiSpec = load(
  readFileSync(path.join(process.cwd(), 'openapi/openapi.yaml'), 'utf8')
) as any;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Validate OpenAPI schema using AJV with format validation
function validateOpenAPISchema(schemaName: string, testData: any): ValidationResult {
  const errors: string[] = [];
  const tests: { name: string; passed: boolean; error?: string }[] = [];
  
  const schema = openapiSpec.components?.schemas?.[schemaName];
  if (!schema) {
    return {
      schema: schemaName,
      valid: false,
      errors: [`Schema ${schemaName} not found in OpenAPI spec`],
      tests: []
    };
  }

  // Test 1: Schema compilation
  const compileTest: TestResult = {
    name: `${schemaName} schema compiles successfully`,
    passed: false,
  };
  
  try {
    const validate = ajv.compile(schema);
    compileTest.passed = true;
    
    // Test 2: Schema validation with test data
    const validationTest: TestResult = {
      name: `${schemaName} validates test data correctly`,
      passed: false,
    };
    
    try {
      const isValid = validate(testData);
      if (isValid) {
        validationTest.passed = true;
      } else {
        const errorMessage = `Validation failed: ${ajv.errorsText(validate.errors || [])}`;
        validationTest.error = errorMessage;
        errors.push(errorMessage);
      }
    } catch (e) {
      validationTest.error = `Validation error: ${e}`;
      errors.push(validationTest.error);
    }
    
    tests.push(validationTest);
    
  } catch (e) {
    compileTest.error = `Schema compilation failed: ${e}`;
    errors.push(compileTest.error);
  }
  
  tests.push(compileTest);
  
  return {
    schema: schemaName,
    valid: errors.length === 0,
    errors,
    tests,
  };
}

// Validate Veo3 constraints
function validateVeo3Constraints(): ValidationResult {
  const errors: string[] = [];
  const tests: { name: string; passed: boolean; error?: string }[] = [];
  const veo3Spec = openapiSpec.components.schemas.Veo3Prompt;

  // Test 1: Duration constraint
  const durationTest = {
    name: 'Duration must be const: 8',
    passed: veo3Spec.properties.duration.const === 8,
    error: veo3Spec.properties.duration.const !== 8 
      ? `Expected const: 8, got: ${veo3Spec.properties.duration.const}` 
      : undefined
  };
  tests.push(durationTest);
  if (!durationTest.passed && durationTest.error) errors.push(durationTest.error);

  // Test 2: Aspect ratio constraint
  const aspectRatioTest = {
    name: 'Aspect must be const: "16:9"',
    passed: veo3Spec.properties.aspect?.const === '16:9',
    error: veo3Spec.properties.aspect?.const !== '16:9'
      ? `Expected const: '16:9', got: ${veo3Spec.properties.aspect?.const}`
      : undefined
  };
  tests.push(aspectRatioTest);
  if (!aspectRatioTest.passed && aspectRatioTest.error) errors.push(aspectRatioTest.error);

  // Test 3: Resolution enum (changed from quality)
  const expectedResolutions = ['720p', '1080p'];
  const actualResolutions = veo3Spec.properties.resolution?.enum;
  const resolutionTest = {
    name: 'Resolution must be enum: ["720p", "1080p"]',
    passed: JSON.stringify(actualResolutions) === JSON.stringify(expectedResolutions),
    error: JSON.stringify(actualResolutions) !== JSON.stringify(expectedResolutions)
      ? `Expected: ${JSON.stringify(expectedResolutions)}, got: ${JSON.stringify(actualResolutions)}`
      : undefined
  };
  tests.push(resolutionTest);
  if (!resolutionTest.passed && resolutionTest.error) errors.push(resolutionTest.error);

  // Test 4: Required fields
  const requiredFields = ['prompt', 'duration', 'aspect', 'resolution'];
  const actualRequired = veo3Spec.required || [];
  const requiredTest = {
    name: 'Required fields check',
    passed: requiredFields.every(field => actualRequired.includes(field)),
    error: !requiredFields.every(field => actualRequired.includes(field))
      ? `Missing required fields. Expected: ${requiredFields}, got: ${actualRequired}`
      : undefined
  };
  tests.push(requiredTest);
  if (!requiredTest.passed && requiredTest.error) errors.push(requiredTest.error);

  // Test 5: Zod schema validation with valid data
  const zodValidTest: TestResult = {
    name: 'Zod schema accepts valid data',
    passed: false,
  };
  try {
    const testData = {
      prompt: 'Test prompt for validation',
      duration: 8,
      aspect: '16:9',
      resolution: '720p',
      shots: [],
    };
    VEO3_PROMPT_SCHEMA.parse(testData);
    zodValidTest.passed = true;
  } catch (e) {
    zodValidTest.error = `Zod validation failed: ${e}`;
    errors.push(zodValidTest.error);
  }
  tests.push(zodValidTest);

  // Test 6: Zod schema rejects invalid duration
  const zodInvalidDurationTest: TestResult = {
    name: 'Zod schema rejects invalid duration',
    passed: false,
  };
  try {
    const testData = {
      prompt: 'test',
      duration: 10, // Invalid
      aspect: '16:9',
      resolution: '720p',
    };
    VEO3_PROMPT_SCHEMA.parse(testData);
    zodInvalidDurationTest.error = 'Schema should have rejected duration: 10';
    errors.push(zodInvalidDurationTest.error);
  } catch (e) {
    zodInvalidDurationTest.passed = true;
  }
  tests.push(zodInvalidDurationTest);

  // Test 7: Zod schema rejects invalid aspect ratio
  const zodInvalidARTest: TestResult = {
    name: 'Zod schema rejects invalid aspect ratio',
    passed: false,
  };
  try {
    const testData = {
      prompt: 'test',
      duration: 8,
      aspect: '9:16', // Invalid
      resolution: '720p',
    };
    VEO3_PROMPT_SCHEMA.parse(testData);
    zodInvalidARTest.error = 'Schema should have rejected aspect: 9:16';
    errors.push(zodInvalidARTest.error);
  } catch (e) {
    zodInvalidARTest.passed = true;
  }
  tests.push(zodInvalidARTest);

  // Test 8: Zod schema rejects invalid quality
  const zodInvalidQualityTest: TestResult = {
    name: 'Zod schema rejects invalid quality',
    passed: false,
  };
  try {
    const testData = {
      prompt: 'test',
      duration: 8,
      aspect: '16:9',
      resolution: '480p', // Invalid
    };
    VEO3_PROMPT_SCHEMA.parse(testData);
    zodInvalidQualityTest.error = 'Schema should have rejected resolution: 480p';
    errors.push(zodInvalidQualityTest.error);
  } catch (e) {
    zodInvalidQualityTest.passed = true;
  }
  tests.push(zodInvalidQualityTest);

  return {
    schema: 'Veo3Prompt',
    valid: errors.length === 0,
    errors,
    tests,
  };
}

// Validate Error schemas
function validateErrorSchemas(): ValidationResult {
  const errors: string[] = [];
  const tests: { name: string; passed: boolean; error?: string }[] = [];

  // Test InvalidDurationError
  const invalidDurationError = openapiSpec.components.schemas.InvalidDurationError;
  const invalidDurationTest = {
    name: 'InvalidDurationError has correct structure',
    passed: invalidDurationError?.properties?.error?.const === 'INVALID_DURATION',
    error: !invalidDurationError?.properties?.error?.const 
      ? 'InvalidDurationError missing or incorrect'
      : undefined
  };
  tests.push(invalidDurationTest);
  if (!invalidDurationTest.passed && invalidDurationTest.error) errors.push(invalidDurationTest.error);

  // Test UnsupportedAspectRatioError
  const unsupportedARError = openapiSpec.components.schemas.UnsupportedAspectRatioError;
  const unsupportedARTest = {
    name: 'UnsupportedAspectRatioError has correct structure',
    passed: unsupportedARError?.properties?.error?.const === 'UNSUPPORTED_AR_FOR_PREVIEW',
    error: !unsupportedARError?.properties?.error?.const
      ? 'UnsupportedAspectRatioError missing or incorrect'
      : undefined
  };
  tests.push(unsupportedARTest);
  if (!unsupportedARTest.passed && unsupportedARTest.error) errors.push(unsupportedARTest.error);

  // Test QARuleViolationError
  const qaRuleError = openapiSpec.components.schemas.QARuleViolationError;
  const qaRuleTest = {
    name: 'QARuleViolationError has correct structure',
    passed: qaRuleError?.properties?.error?.const === 'QA_RULE_VIOLATION',
    error: !qaRuleError?.properties?.error?.const
      ? 'QARuleViolationError missing or incorrect'
      : undefined
  };
  tests.push(qaRuleTest);
  if (!qaRuleTest.passed && qaRuleTest.error) errors.push(qaRuleTest.error);

  return {
    schema: 'Error Schemas',
    valid: errors.length === 0,
    errors,
    tests,
  };
}

// Run validations
console.log(`${colors.cyan}${colors.bold}🔍 Validating Schema Contracts...${colors.reset}\n`);

results.push(validateVeo3Constraints());
results.push(validateErrorSchemas());

// Print detailed results
console.log(`${colors.bold}📊 Validation Results:${colors.reset}`);
console.log('═'.repeat(60));

results.forEach(result => {
  const statusIcon = result.valid ? `${colors.green}✅` : `${colors.red}❌`;
  const statusText = result.valid ? `${colors.green}VALID` : `${colors.red}INVALID`;
  
  console.log(`\n${statusIcon} ${colors.bold}${result.schema}:${colors.reset} ${statusText}${colors.reset}`);
  
  // Print individual tests
  if (result.tests && result.tests.length > 0) {
    result.tests.forEach(test => {
      const testIcon = test.passed ? `${colors.green}✓` : `${colors.red}✗`;
      console.log(`  ${testIcon} ${test.name}${colors.reset}`);
      if (!test.passed && test.error) {
        console.log(`    ${colors.yellow}└─ ${test.error}${colors.reset}`);
      }
    });
  }
  
  // Print errors summary if any
  if (!result.valid && result.errors.length > 0) {
    console.log(`\n  ${colors.red}Errors:${colors.reset}`);
    result.errors.forEach(error => {
      console.log(`    ${colors.red}• ${error}${colors.reset}`);
    });
  }
});

console.log('\n' + '═'.repeat(60));

// Summary
const allValid = results.every(r => r.valid);
const totalTests = results.reduce((sum, r) => sum + (r.tests?.length || 0), 0);
const passedTests = results.reduce((sum, r) => sum + (r.tests?.filter(t => t.passed).length || 0), 0);

console.log(`\n${colors.bold}Summary:${colors.reset}`);
console.log(`  Total schemas validated: ${results.length}`);
console.log(`  Total tests run: ${totalTests}`);
console.log(`  Tests passed: ${colors.green}${passedTests}${colors.reset}`);
console.log(`  Tests failed: ${colors.red}${totalTests - passedTests}${colors.reset}`);

if (allValid) {
  console.log(`\n${colors.green}${colors.bold}✅ All schema contracts are valid!${colors.reset}`);
} else {
  console.log(`\n${colors.red}${colors.bold}❌ Schema validation failed!${colors.reset}`);
  console.log(`${colors.yellow}Please fix the errors above before proceeding.${colors.reset}`);
}

process.exit(allValid ? 0 : 1);