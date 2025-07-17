import useGoogleIdToken from './useGoogleIdToken.js';

describe('useGoogleIdToken hook', () => {
  it('exports a function', () => {
    expect(typeof useGoogleIdToken).toBe('function');
  });
});
