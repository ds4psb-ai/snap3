import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Problem Details Contract Tests', () => {
  let openApiSpec: any;

  beforeAll(() => {
    const specPath = path.join(process.cwd(), 'openapi', 'openapi.yaml');
    const specContent = fs.readFileSync(specPath, 'utf8');
    openApiSpec = yaml.load(specContent);
  });

  describe('OpenAPI Problem schema references', () => {
    const targetPaths = ['/ingest', '/snap3/turbo', '/export/brief/{id}', '/export/json/{id}'];

    targetPaths.forEach(pathKey => {
      describe(`${pathKey}`, () => {
        it('should reference Problem schema for all 4xx/5xx responses', () => {
          const pathSpec = openApiSpec.paths[pathKey];
          expect(pathSpec).toBeDefined();

          // Check each method in the path
          Object.entries(pathSpec).forEach(([method, methodSpec]: [string, any]) => {
            if (!methodSpec.responses) return;

            // Check all error responses
            Object.entries(methodSpec.responses).forEach(([statusCode, response]: [string, any]) => {
              const status = parseInt(statusCode);
              if (status >= 400 && status < 600) {
                // Should have content-type application/problem+json
                expect(response.content).toBeDefined();
                expect(response.content['application/problem+json']).toBeDefined();
                
                // Should reference Problem schema
                const schema = response.content['application/problem+json'].schema;
                expect(schema.$ref).toBe('#/components/schemas/Problem');
              }
            });
          });
        });
      });
    });
  });

  describe('Problem schema structure', () => {
    it('should define Problem schema with required RFC 9457 fields', () => {
      expect(openApiSpec.components).toBeDefined();
      expect(openApiSpec.components.schemas).toBeDefined();
      expect(openApiSpec.components.schemas.Problem).toBeDefined();

      const problemSchema = openApiSpec.components.schemas.Problem;
      
      // Check required fields
      expect(problemSchema.required).toContain('type');
      expect(problemSchema.required).toContain('title');
      expect(problemSchema.required).toContain('status');
      expect(problemSchema.required).toContain('code');
      
      // Check properties exist
      expect(problemSchema.properties.type).toBeDefined();
      expect(problemSchema.properties.title).toBeDefined();
      expect(problemSchema.properties.status).toBeDefined();
      expect(problemSchema.properties.code).toBeDefined();
      expect(problemSchema.properties.detail).toBeDefined();
      expect(problemSchema.properties.instance).toBeDefined();
      expect(problemSchema.properties.timestamp).toBeDefined();
      expect(problemSchema.properties.traceId).toBeDefined();
      expect(problemSchema.properties.violations).toBeDefined();
      expect(problemSchema.properties.retryAfter).toBeDefined();
      expect(problemSchema.properties.fix).toBeDefined();
    });

    it('should define correct types for Problem fields', () => {
      const problemSchema = openApiSpec.components.schemas.Problem;
      
      expect(problemSchema.properties.type.type).toBe('string');
      expect(problemSchema.properties.type.format).toBe('uri');
      expect(problemSchema.properties.title.type).toBe('string');
      expect(problemSchema.properties.status.type).toBe('integer');
      expect(problemSchema.properties.code.type).toBe('string');
      expect(problemSchema.properties.violations.type).toBe('array');
    });
  });

  describe('Response headers', () => {
    it('should specify Content-Type header for Problem responses', () => {
      const targetPaths = ['/ingest', '/snap3/turbo', '/export/brief/{id}', '/export/json/{id}'];
      
      targetPaths.forEach(pathKey => {
        const pathSpec = openApiSpec.paths[pathKey];
        
        Object.entries(pathSpec).forEach(([method, methodSpec]: [string, any]) => {
          if (!methodSpec.responses) return;
          
          Object.entries(methodSpec.responses).forEach(([statusCode, response]: [string, any]) => {
            const status = parseInt(statusCode);
            if (status >= 400 && status < 600) {
              // Should document Content-Type header
              if (response.headers) {
                expect(response.headers['Content-Type']).toBeDefined();
                expect(response.headers['Content-Type'].schema.default).toBe('application/problem+json');
              }
              
              // For 429 responses, should have Retry-After
              if (status === 429) {
                expect(response.headers).toBeDefined();
                expect(response.headers['Retry-After']).toBeDefined();
              }
            }
          });
        });
      });
    });
  });
});