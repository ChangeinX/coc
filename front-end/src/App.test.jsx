import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import App from './App.jsx';

describe('Google sign-in initialization', () => {
  it('handles script loading after mount', () => {
    vi.useFakeTimers();
    render(<App />);

    const initialize = vi.fn();
    const renderButton = vi.fn();
    const prompt = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton, prompt } } };

    vi.advanceTimersByTime(150);
    expect(initialize).toHaveBeenCalled();
    expect(renderButton).toHaveBeenCalled();
    expect(prompt).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
