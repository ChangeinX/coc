import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../hooks/useCachedIcon.js', () => ({
  default: (url) => url,
}));

import ChatMessage from './ChatMessage.jsx';

const sample = { name: 'Alice', icon: 'http://ex/icon.png' };

describe('ChatMessage', () => {
  it('displays player name and icon', () => {
    render(<ChatMessage message={{ content: 'hi' }} info={sample} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByAltText('league')).toHaveAttribute('src', sample.icon);
  });
});
