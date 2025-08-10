import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import noNextResponseHeadersOption from './eslint-rules/no-nextresponse-headers-option.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      'snap3-custom': {
        rules: {
          'no-nextresponse-headers-option': noNextResponseHeadersOption,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'snap3-custom/no-nextresponse-headers-option': 'error',
    },
  },
];

export default eslintConfig;
