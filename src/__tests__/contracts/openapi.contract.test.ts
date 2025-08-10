import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { VEO3_PROMPT_SCHEMA } from '../../lib/schemas/veo3.zod';
import { buildProblemJSON } from '../../lib/errors/problem';
import { ErrorCode } from '../../lib/errors/codes';
import path from 'path';

// Initialize AJV with JSON Schema 2020-12 support and formats
const ajv = new Ajv({
  strict: true,
  allErrors: true,
  validateFormats: true,
  schemaId: '$id',
  addUsedSchema: false
});

// Add formats support
try {
  addFormats(ajv);
} catch (error) {
  console.warn('Warning: ajv-formats setup failed, proceeding without format validation:', error.message);
}

describe('OpenAPI-Zod Contract Synchronization', () => {
  let openapiSpec: any;

  beforeAll(() => {
    const yamlContent = readFileSync(
      path.join(process.cwd(), 'openapi/openapi.yaml'),
      'utf8'
    );
    openapiSpec = load(yamlContent) as any;
  });

  describe('Veo3Prompt Schema Alignment', () => {
    const veo3PromptSpec = () =>
      openapiSpec.components.schemas.Veo3Prompt;

    test('should have matching required fields', () => {
      const openapiRequired = veo3PromptSpec().required;
      expect(openapiRequired).toContain('prompt');
      expect(openapiRequired).toContain('duration');
      expect(openapiRequired).toContain('aspect');
      expect(openapiRequired).toContain('resolution');
      expect(openapiRequired).toHaveLength(4);
    });

    test('duration should be const: 8 in both schemas', () => {
      const durationSpec = veo3PromptSpec().properties.duration;
      expect(durationSpec.const).toBe(8);
      expect(durationSpec.type).toBe('number');
      
      // Validate Zod schema matches
      const validData = {
        prompt: 'test',
        duration: 8,
        aspect: '16:9',
        resolution: '720p',
      };
      const invalidData = { ...validData, duration: 7 };
      
      expect(VEO3_PROMPT_SCHEMA.safeParse(validData).success).toBe(true);
      expect(VEO3_PROMPT_SCHEMA.safeParse(invalidData).success).toBe(false);
    });

    test('aspect should be const: "16:9" in both schemas', () => {
      const aspectSpec = veo3PromptSpec().properties.aspect;
      expect(aspectSpec.const).toBe('16:9');
      expect(aspectSpec.type).toBe('string');
      
      // Validate Zod schema matches
      const validData = {
        prompt: 'test',
        duration: 8,
        aspect: '16:9',
        resolution: '720p',
      };
      const invalidData = { ...validData, aspect: '9:16' };
      
      expect(VEO3_PROMPT_SCHEMA.safeParse(validData).success).toBe(true);
      expect(VEO3_PROMPT_SCHEMA.safeParse(invalidData).success).toBe(false);
    });

    test('resolution should have enum [720p, 1080p] in both schemas', () => {
      const resolutionSpec = veo3PromptSpec().properties.resolution;
      expect(resolutionSpec.enum).toEqual(['720p', '1080p']);
      expect(resolutionSpec.type).toBe('string');
      
      // Validate Zod schema matches
      const valid720p = {
        prompt: 'test',
        duration: 8,
        aspect: '16:9',
        resolution: '720p',
      };
      const valid1080p = { ...valid720p, resolution: '1080p' };
      const invalid480p = { ...valid720p, resolution: '480p' };
      
      expect(VEO3_PROMPT_SCHEMA.safeParse(valid720p).success).toBe(true);
      expect(VEO3_PROMPT_SCHEMA.safeParse(valid1080p).success).toBe(true);
      expect(VEO3_PROMPT_SCHEMA.safeParse(invalid480p).success).toBe(false);
    });

    test('parameters should be optional with correct nested structure', () => {
      const parametersSpec = veo3PromptSpec().properties.parameters;
      expect(veo3PromptSpec().required).not.toContain('parameters');
      expect(parametersSpec.type).toBe('object');
      expect(parametersSpec.properties.temperature.minimum).toBe(0);
      expect(parametersSpec.properties.temperature.maximum).toBe(1);
      expect(parametersSpec.properties.temperature.default).toBe(0.7);
      expect(parametersSpec.properties.topP.minimum).toBe(0);
      expect(parametersSpec.properties.topP.maximum).toBe(1);
      expect(parametersSpec.properties.topP.default).toBe(0.9);
      expect(parametersSpec.properties.maxTokens.minimum).toBe(1);
      expect(parametersSpec.properties.maxTokens.maximum).toBe(1000);
      expect(parametersSpec.properties.maxTokens.default).toBe(500);
    });

    test('model field should have default value', () => {
      const modelSpec = veo3PromptSpec().properties.model;
      expect(modelSpec.type).toBe('string');
      expect(modelSpec.default).toBe('veo-3');
    });
  });

  describe('Error Response Schemas', () => {
    test('InvalidDurationError should have correct structure', () => {
      const errorSchema = openapiSpec.components.schemas.InvalidDurationError;
      expect(errorSchema.required).toContain('error');
      expect(errorSchema.required).toContain('message');
      expect(errorSchema.required).toContain('fix');
      expect(errorSchema.properties.error.const).toBe('INVALID_DURATION');
      expect(errorSchema.properties.message.type).toBe('string');
      expect(errorSchema.properties.fix.type).toBe('string');
    });

    test('UnsupportedAspectRatioError should have correct structure', () => {
      const errorSchema = openapiSpec.components.schemas.UnsupportedAspectRatioError;
      expect(errorSchema.required).toContain('error');
      expect(errorSchema.required).toContain('message');
      expect(errorSchema.required).toContain('fix');
      expect(errorSchema.properties.error.const).toBe('UNSUPPORTED_AR_FOR_PREVIEW');
      expect(errorSchema.properties.message.type).toBe('string');
      expect(errorSchema.properties.fix.type).toBe('string');
    });

    test('QARuleViolationError should have correct structure', () => {
      const errorSchema = openapiSpec.components.schemas.QARuleViolationError;
      expect(errorSchema.required).toContain('error');
      expect(errorSchema.required).toContain('message');
      expect(errorSchema.required).toContain('violations');
      expect(errorSchema.required).toContain('status');
      expect(errorSchema.properties.error.const).toBe('QA_RULE_VIOLATION');
      expect(errorSchema.properties.status.const).toBe('failed');
      expect(errorSchema.properties.violations.type).toBe('array');
      expect(errorSchema.properties.violations.items.required).toContain('rule');
      expect(errorSchema.properties.violations.items.required).toContain('message');
    });
  });

  describe('Compile Endpoint Contract', () => {
    test('/compile/veo3 should reference Veo3Prompt schema', () => {
      const compileEndpoint = openapiSpec.paths['/compile/veo3'].post;
      const schemaRef = compileEndpoint.requestBody.content['application/json'].schema['$ref'];
      expect(schemaRef).toBe('#/components/schemas/Veo3Prompt');
    });

    test('/compile/veo3 response should enforce constraints', () => {
      const response200 = openapiSpec.paths['/compile/veo3'].post.responses['200'];
      const responseSchema = response200.content['application/json'].schema;
      expect(responseSchema.properties.duration.const).toBe(8);
      expect(responseSchema.properties.aspectRatio.const).toBe('16:9');
      expect(responseSchema.properties.quality.enum).toEqual(['720p', '1080p']);
      expect(responseSchema.properties.status.enum).toEqual(['compiled']);
    });

    test('/compile/veo3 error responses should match error schemas', () => {
      const responses = openapiSpec.paths['/compile/veo3'].post.responses;
      const error400 = responses['400'];
      expect(error400.description).toBe('Invalid Veo3 prompt');
      expect(error400.content['application/json'].schema.oneOf).toBeDefined();
      expect(error400.content['application/json'].schema.oneOf).toHaveLength(2);
      
      const errorRefs = error400.content['application/json'].schema.oneOf.map((s: any) => s['$ref']);
      expect(errorRefs).toContain('#/components/schemas/InvalidDurationError');
      expect(errorRefs).toContain('#/components/schemas/UnsupportedAspectRatioError');
    });
  });

  describe('Preview Endpoint Contract', () => {
    test('/preview/veo should enforce Veo3 constraints', () => {
      const previewEndpoint = openapiSpec.paths['/preview/veo'].post;
      const requestSchema = previewEndpoint.requestBody.content['application/json'].schema;
      
      expect(requestSchema.required).toContain('veo3Id');
      expect(requestSchema.required).toContain('prompt');
      expect(requestSchema.required).toContain('duration');
      expect(requestSchema.required).toContain('aspectRatio');
      expect(requestSchema.required).toContain('quality');
      
      expect(requestSchema.properties.duration.const).toBe(8);
      expect(requestSchema.properties.aspectRatio.const).toBe('16:9');
      expect(requestSchema.properties.quality.enum).toEqual(['720p', '1080p']);
    });

    test('/preview/veo should return 202 Accepted', () => {
      const response202 = openapiSpec.paths['/preview/veo'].post.responses['202'];
      expect(response202.description).toBe('Preview job accepted');
      
      const responseSchema = response202.content['application/json'].schema;
      expect(responseSchema.properties.jobId.format).toBe('uuid');
      expect(responseSchema.properties.status.enum).toEqual(['accepted']);
      expect(responseSchema.properties.pollUrl.format).toBe('uri');
    });
  });

  describe('Jobs Endpoint Contract', () => {
    test('/jobs/{id} should return Veo3Job schema', () => {
      const jobEndpoint = openapiSpec.paths['/jobs/{id}'].get;
      const response200 = jobEndpoint.responses['200'];
      const schemaRef = response200.content['application/json'].schema['$ref'];
      expect(schemaRef).toBe('#/components/schemas/Veo3Job');
    });

    test('Veo3Job schema should have correct structure', () => {
      const jobSchema = openapiSpec.components.schemas.Veo3Job;
      expect(jobSchema.required).toContain('id');
      expect(jobSchema.required).toContain('status');
      expect(jobSchema.required).toContain('progress');
      expect(jobSchema.required).toContain('prompt');
      expect(jobSchema.required).toContain('createdAt');
      expect(jobSchema.required).toContain('updatedAt');
      
      expect(jobSchema.properties.status.enum).toEqual(['pending', 'processing', 'completed', 'failed']);
      expect(jobSchema.properties.progress.minimum).toBe(0);
      expect(jobSchema.properties.progress.maximum).toBe(100);
      
      // Result constraints
      expect(jobSchema.properties.result.properties.duration.const).toBe(8);
      expect(jobSchema.properties.result.properties.aspectRatio.const).toBe('16:9');
      expect(jobSchema.properties.result.properties.quality.enum).toEqual(['720p', '1080p']);
      expect(jobSchema.properties.result.properties.fps.minimum).toBe(24);
      expect(jobSchema.properties.result.properties.fps.maximum).toBe(60);
      expect(jobSchema.properties.result.properties.bitrate.minimum).toBe(1000000);
    });
  });

  describe('QA Validation Contract', () => {
    test('/qa/validate request should have correct structure', () => {
      const qaEndpoint = openapiSpec.paths['/qa/validate'].post;
      const requestSchema = qaEndpoint.requestBody.content['application/json'].schema;
      const schemaRef = requestSchema['$ref'];
      expect(schemaRef).toBe('#/components/schemas/QAValidationRequest');
    });

    test('QAValidationRequest schema should enforce constraints', () => {
      const qaSchema = openapiSpec.components.schemas.QAValidationRequest;
      expect(qaSchema.required).toContain('previewUrl');
      expect(qaSchema.required).toContain('duration');
      expect(qaSchema.required).toContain('aspectRatio');
      expect(qaSchema.required).toContain('quality');
      expect(qaSchema.required).toContain('hooks');
      expect(qaSchema.required).toContain('safezones');
      expect(qaSchema.required).toContain('fps');
      expect(qaSchema.required).toContain('bitrate');
      
      expect(qaSchema.properties.hooks.items.required).toContain('name');
      expect(qaSchema.properties.hooks.items.required).toContain('duration');
    });
  });

  describe('Export Endpoints Contract', () => {
    test('/export/brief/{id} should return BriefExport schema', () => {
      const briefEndpoint = openapiSpec.paths['/export/brief/{id}'].get;
      const response200 = briefEndpoint.responses['200'];
      const schemaRef = response200.content['application/json'].schema['$ref'];
      expect(schemaRef).toBe('#/components/schemas/BriefExport');
    });

    test('/export/json/{id} should return JSONExport schema', () => {
      const jsonEndpoint = openapiSpec.paths['/export/json/{id}'].get;
      const response200 = jsonEndpoint.responses['200'];
      const schemaRef = response200.content['application/json'].schema['$ref'];
      expect(schemaRef).toBe('#/components/schemas/JSONExport');
    });

    test('Exports should include VDP_MIN and Evidence only', () => {
      const briefExport = openapiSpec.components.schemas.BriefExport;
      const jsonExport = openapiSpec.components.schemas.JSONExport;
      
      // BriefExport should have evidence
      expect(briefExport.required).toContain('evidence');
      expect(briefExport.properties.evidence.type).toBe('array');
      
      // JSONExport should have VDP_MIN and evidence
      expect(jsonExport.properties.data.required).toContain('vdp_min');
      expect(jsonExport.properties.data.required).toContain('evidence');
      expect(jsonExport.properties.data.required).not.toContain('vdp_full');
    });
  });

  describe('Comprehensive Schema Validation', () => {
    describe('AJV Format Validation', () => {
      test('Problem schema should compile and validate correctly', () => {
        const problemSchema = openapiSpec.components.schemas.Problem;
        expect(problemSchema).toBeDefined();
        
        // Compile schema
        const validate = ajv.compile(problemSchema);
        
        // Test valid problem data
        const validProblem = buildProblemJSON(ErrorCode.INVALID_DURATION, {
          detail: 'Duration must be exactly 8 seconds',
          instance: '/api/compile/veo3'
        });
        
        expect(validate(validProblem)).toBe(true);
        
        // Test invalid problem data (missing required field)
        const invalidProblem = { 
          type: 'not-a-valid-uri', 
          title: 'Test problem' 
          // missing status and code
        };
        
        expect(validate(invalidProblem)).toBe(false);
        expect(validate.errors).toBeDefined();
      });

      test('Veo3Prompt schema should validate with proper formats', () => {
        const veo3Schema = openapiSpec.components.schemas.Veo3Prompt;
        expect(veo3Schema).toBeDefined();
        
        const validate = ajv.compile(veo3Schema);
        
        // Valid data
        const validData = {
          prompt: 'A beautiful sunset over mountains',
          duration: 8,
          aspect: '16:9',
          resolution: '720p'
        };
        
        expect(validate(validData)).toBe(true);
        
        // Invalid data - wrong duration
        const invalidData = { ...validData, duration: 10 };
        expect(validate(invalidData)).toBe(false);
      });

      test('URI format validation should work correctly', () => {
        const problemSchema = openapiSpec.components.schemas.Problem;
        const validate = ajv.compile(problemSchema);
        
        const problemWithValidURI = {
          type: 'https://api.snap3.com/problems/test',
          title: 'Test Problem',
          status: 400,
          code: 'VALIDATION_ERROR'
        };
        
        expect(validate(problemWithValidURI)).toBe(true);
        
        const problemWithInvalidURI = {
          type: 'not-a-uri',
          title: 'Test Problem', 
          status: 400,
          code: 'VALIDATION_ERROR'
        };
        
        expect(validate(problemWithInvalidURI)).toBe(false);
      });
    });

    describe('Schema Completeness', () => {
      test('all critical schemas should exist', () => {
        const criticalSchemas = [
          'Problem',
          'Veo3Prompt', 
          'Veo3Job',
          'QAValidationRequest',
          'BriefExport',
          'JSONExport'
        ];
        
        criticalSchemas.forEach(schemaName => {
          expect(openapiSpec.components.schemas[schemaName]).toBeDefined();
        });
      });

      test('all Problem+JSON error responses should reference Problem schema', () => {
        const paths = openapiSpec.paths;
        const problemJsonRefs = [];
        
        Object.keys(paths).forEach(path => {
          Object.keys(paths[path]).forEach(method => {
            const responses = paths[path][method].responses;
            if (responses) {
              Object.keys(responses).forEach(status => {
                if (parseInt(status) >= 400) {
                  const content = responses[status].content;
                  if (content && content['application/problem+json']) {
                    const schemaRef = content['application/problem+json'].schema.$ref;
                    problemJsonRefs.push({ path, method, status, schemaRef });
                  }
                }
              });
            }
          });
        });
        
        // All error responses should reference Problem schema
        problemJsonRefs.forEach(ref => {
          expect(ref.schemaRef).toBe('#/components/schemas/Problem');
        });
        
        // Should have at least some problem+json responses
        expect(problemJsonRefs.length).toBeGreaterThan(0);
      });
    });

    describe('Error Code Alignment', () => {
      test('Problem schema error codes should match ErrorCode enum', () => {
        const problemSchema = openapiSpec.components.schemas.Problem;
        const openApiErrorCodes = problemSchema.properties.code.enum;
        
        const zodErrorCodes = Object.values(ErrorCode);
        
        // Every Zod error code should be in OpenAPI
        zodErrorCodes.forEach(code => {
          expect(openApiErrorCodes).toContain(code);
        });
        
        // Every OpenAPI error code should be valid
        openApiErrorCodes.forEach(code => {
          expect(zodErrorCodes).toContain(code);
        });
      });
    });
  });
});