import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Tabs from './Tabs.jsx';

describe('Tabs component', () => {
  it('renders and handles clicks', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <Tabs
        tabs={[{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]}
        active="a"
        onChange={onChange}
      />
    );
    fireEvent.click(getByText('B'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
