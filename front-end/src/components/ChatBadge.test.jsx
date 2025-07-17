import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatBadge from './ChatBadge.jsx';

describe('ChatBadge component', () => {
  it('renders label', () => {
    render(<ChatBadge />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });
});
