import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationBanner from './NotificationBanner.jsx';

describe('NotificationBanner', () => {
  it('does not render when Notification is undefined', () => {
    const original = global.Notification;
    delete global.Notification;
    render(<NotificationBanner />);
    expect(screen.queryByText(/enable notifications/i)).not.toBeInTheDocument();
    global.Notification = original;
  });
});
