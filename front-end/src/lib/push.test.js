import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array, arrayBufferToBase64 } from './push.js';

describe('push utils', () => {
  it('converts base64 to Uint8Array and back', () => {
    const b64 = 'AQID';
    const arr = urlBase64ToUint8Array(b64);
    expect(arr).toEqual(new Uint8Array([1, 2, 3]));
    const back = arrayBufferToBase64(arr);
    expect(back).toBe('AQID');
  });
});
