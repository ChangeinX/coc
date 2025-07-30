import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toast from './Toast.jsx';

test('renders when toast event fired', () => {
  render(<Toast />);
  act(() => {
    window.dispatchEvent(new CustomEvent('toast', { detail: 'hello' }));
  });
  expect(screen.getByText('hello')).toBeInTheDocument();
});
