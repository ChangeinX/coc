import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../hooks/useCachedIcon.js', () => ({
  default: (url) => url,
}));

import ChatMessage from './ChatMessage.jsx';

const sample = { name: 'Alice', icon: 'http://ex/icon.png' };

describe('ChatMessage', () => {
  it('displays player name and icon without showing the tag', () => {
    render(
      <ChatMessage
        message={{ content: 'hi', userId: '#A1B2C' }}
        info={sample}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByAltText('league')).toHaveAttribute('src', sample.icon);
    expect(screen.queryByText('#A1B2C')).not.toBeInTheDocument();
  });
});
