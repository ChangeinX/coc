import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import RiskPrioritySelect, { PRESETS } from './RiskPrioritySelect.jsx';

describe('RiskPrioritySelect', () => {
  it('calls onSelect with weights for selected preset', () => {
    const handler = vi.fn();
    render(
      <RiskPrioritySelect
        weights={PRESETS.balanced.weights}
        onSelect={handler}
      />
    );
    fireEvent.change(screen.getByLabelText('Risk Priority'), {
      target: { value: 'war' },
    });
    expect(handler).toHaveBeenCalledWith(PRESETS.war.weights);
  });
});
