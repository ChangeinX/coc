import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { useState } from 'react';
import MentionInput from './MentionInput.jsx';

describe('MentionInput', () => {
  const members = [
    { name: 'Alice', tag: '#AL' },
    { name: 'Bob', tag: '#BO' },
  ];

  function Wrapper() {
    const [val, setVal] = useState('@');
    return <MentionInput value={val} onChange={setVal} members={members} />;
  }

  it('completes mention with Tab', async () => {
    render(<Wrapper />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '@A' } });
    await screen.findByText('Alice');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('@Alice');
  });

  it('completes mention with space and adds trailing space', async () => {
    render(<Wrapper />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '@A' } });
    await screen.findByText('Alice');
    fireEvent.keyDown(input, { key: ' ' });
    expect(input.value).toBe('@Alice ');
  });
});
