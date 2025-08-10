/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom/extend-expect';

declare namespace NodeJS {
  interface Global {
    expect: jest.Expect;
  }
}