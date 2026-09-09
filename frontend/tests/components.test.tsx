import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/design/theme';
import { Sheet, UndoToast, QuantityStepper } from '../src/components/Molecules';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { ready } from '../src/i18n';

it('keeps the same focused form node through state updates', async () => {
  await ready;
  function Probe() {
    const [value, setValue] = useState('');
    return <ThemeProvider><Sheet open title="Form" onClose={() => undefined}><Input label="Note" value={value} onChange={setValue} /></Sheet></ThemeProvider>;
  }
  render(<Probe />);
  const field = await screen.findByRole('textbox', { name: 'Note' });
  field.focus();
  fireEvent.change(field, { target: { value: 'Spinach tomorrow' } });
  await waitFor(() => expect(field).toHaveFocus());
  expect(screen.getByRole('textbox')).toBe(field);
  expect(field).toHaveValue('Spinach tomorrow');
});

it('commits once when the six-second undo window expires', async () => {
  await ready;
  vi.useFakeTimers();
  try {
    const commit = vi.fn();
    const result = render(<ThemeProvider><UndoToast message="Removed" onUndo={vi.fn()} onCommit={commit} /></ThemeProvider>);
    act(() => vi.advanceTimersByTime(5999));
    expect(commit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(12000));
    expect(commit).toHaveBeenCalledTimes(1);
    result.unmount();
  } finally { vi.useRealTimers(); }
});

it('stops a held stepper at its bound and suppresses the release click', async () => {
  await ready;
  vi.useFakeTimers();
  try {
    const change = vi.fn();
    const Probe = () => {
      const [value, setValue] = useState(10);
      return <ThemeProvider><QuantityStepper label="Servings" value={value} onChange={next => { change(next); setValue(next); }} /></ThemeProvider>;
    };
    const result = render(<Probe />);
    const plus = screen.getByRole('button', { name: 'Increase Servings' });
    fireEvent.pointerDown(plus);
    act(() => vi.advanceTimersByTime(620));
    expect(change.mock.calls.map(call => call[0])).toEqual([11, 12]);
    expect(plus).toBeDisabled();
    act(() => vi.advanceTimersByTime(3000));
    expect(change).toHaveBeenCalledTimes(2);
    fireEvent.pointerUp(plus);
    fireEvent.click(plus);
    expect(change).toHaveBeenCalledTimes(2);
    // Keyboard activation has no pointer-down to reset the hold suppression flag.
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Servings' }));
    expect(change).toHaveBeenLastCalledWith(11);
    result.unmount();
  } finally { vi.useRealTimers(); }
});

it('guards duplicate activation until an asynchronous action settles', async () => {
  let resolve!: () => void;
  const action = vi.fn(() => new Promise<void>(done => { resolve = done; }));
  render(<ThemeProvider><Button label="Save" onPress={action} /></ThemeProvider>);
  const button = screen.getByRole('button', { name: 'Save' });
  fireEvent.click(button); fireEvent.click(button);
  expect(action).toHaveBeenCalledTimes(1);
  expect(button).toHaveAttribute('aria-busy', 'true');
  await act(async () => resolve());
  expect(button).toBeEnabled();
});

it('cancels the deferred commit when undo is used within six seconds', async () => {
  await ready;
  vi.useFakeTimers();
  try {
    const commit = vi.fn(); const undo = vi.fn();
    const result = render(<ThemeProvider><UndoToast message="Removed" onUndo={undo} onCommit={commit} /></ThemeProvider>);
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    act(() => vi.advanceTimersByTime(2000));
    expect(undo).toHaveBeenCalledTimes(1); expect(commit).not.toHaveBeenCalled();
    result.unmount();
  } finally { vi.useRealTimers(); }
});
