/**
 * Test to verify the NextResponse header pattern lint rule
 * This test ensures that the old pattern is caught and new pattern is enforced
 */

import { ESLint } from 'eslint';
import path from 'path';

describe('NextResponse Header Pattern Lint Rule', () => {
  let eslint: ESLint;

  beforeAll(() => {
    eslint = new ESLint({
      overrideConfigFile: path.join(process.cwd(), 'eslint.config.mjs'),
    });
  });

  it('should detect old header pattern in NextResponse.json()', async () => {
    const badCode = `
import { NextResponse } from 'next/server';

export function handler() {
  return NextResponse.json(
    { data: 'test' },
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
`;

    const results = await eslint.lintText(badCode, {
      filePath: 'test.ts',
    });

    const errors = results[0].messages.filter(
      msg => msg.ruleId === 'snap3-custom/no-nextresponse-headers-option'
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Do not use headers option');
  });

  it('should not flag correct header pattern', async () => {
    const goodCode = `
import { NextResponse } from 'next/server';

export function handler() {
  const res = NextResponse.json({ data: 'test' }, { status: 200 });
  res.headers.set('Content-Type', 'application/json');
  res.headers.set('Cache-Control', 'private, max-age=3600');
  return res;
}
`;

    const results = await eslint.lintText(goodCode, {
      filePath: 'test.ts',
    });

    const errors = results[0].messages.filter(
      msg => msg.ruleId === 'snap3-custom/no-nextresponse-headers-option'
    );

    expect(errors).toHaveLength(0);
  });

  it('should detect old pattern in new NextResponse()', async () => {
    const badCode = `
import { NextResponse } from 'next/server';

export function handler() {
  return new NextResponse(null, {
    status: 304,
    headers: {
      'ETag': 'W/"abc123"',
      'Cache-Control': 'private'
    }
  });
}
`;

    const results = await eslint.lintText(badCode, {
      filePath: 'test.ts',
    });

    const errors = results[0].messages.filter(
      msg => msg.ruleId === 'snap3-custom/no-nextresponse-headers-option'
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Do not use headers option');
  });

  it('should not flag NextResponse.json with only status option', async () => {
    const goodCode = `
import { NextResponse } from 'next/server';

export function handler() {
  return NextResponse.json({ data: 'test' }, { status: 400 });
}
`;

    const results = await eslint.lintText(goodCode, {
      filePath: 'test.ts',
    });

    const errors = results[0].messages.filter(
      msg => msg.ruleId === 'snap3-custom/no-nextresponse-headers-option'
    );

    expect(errors).toHaveLength(0);
  });
});