import { describe, it, expect, beforeEach } from 'vitest';
import { getMessageCache, putMessageCache, removeMessageFromCache } from './db.js';

describe('removeMessageFromCache', () => {
  beforeEach(async () => {
    const record = await getMessageCache('1');
    if (record) {
      await putMessageCache({ chatId: '1', messages: [] });
    }
  });

  it('removes a message by ts', async () => {
    await putMessageCache({ chatId: '1', messages: [{ ts: 'a' }, { ts: 'b' }] });
    await removeMessageFromCache('1', 'a');
    const rec = await getMessageCache('1');
    expect(rec.messages).toEqual([{ ts: 'b' }]);
  });
});
