import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/design/theme';
import { Select, Input, Checkbox, Radio, Switch } from '../src/components/Input';
import { Button, IconButton } from '../src/components/Button';
import { Avatar } from '../src/components/Status';
import { ready } from '../src/i18n';

it('locks a loading native select until options are ready without losing its choice', async () => {
  await ready;
  const change = vi.fn();
  const props = { label: 'Storage', value: 'pantry', options: [{ value: 'pantry', label: 'Pantry' }], onChange: change };
  const view = render(<ThemeProvider><Select {...props} loading /></ThemeProvider>);
  const select = screen.getByRole('combobox', { name: 'Storage' });
  expect(select).toBeDisabled();
  expect(select).toHaveAttribute('aria-busy', 'true');
  expect(select).toHaveValue('pantry');
  view.rerender(<ThemeProvider><Select {...props} /></ThemeProvider>);
  expect(select).toBeEnabled();
  expect(select).not.toHaveAttribute('aria-busy');
  expect(select).toHaveValue('pantry');
});

it('preserves text and blocks the clear action while a field loads', async () => {
  await ready;
  const change = vi.fn();
  render(<ThemeProvider><Input label="Notes" value="Beans" onChange={change} loading clearable /></ThemeProvider>);
  const field = screen.getByRole('textbox', { name: 'Notes' });
  expect(field).toHaveAttribute('readonly');
  expect(field).toHaveAttribute('aria-busy', 'true');
  expect(field).toHaveValue('Beans');
  const clear = screen.getByRole('button', { name: 'Clear Notes' });
  expect(clear).toBeDisabled(); fireEvent.click(clear);
  expect(change).not.toHaveBeenCalled();
});

it.each([Checkbox, Radio, Switch])('prevents changing a choice while its action is pending', async Choice => {
  await ready;
  const change = vi.fn();
  render(<ThemeProvider><Choice label="Include beans" checked onChange={change} loading /></ThemeProvider>);
  const choice = screen.getByLabelText('Include beans');
  expect(choice).toBeChecked();
  expect(choice).toBeDisabled();
  expect(choice).toHaveAttribute('aria-busy', 'true');
});

it('keeps an icon action named and its icon dimensions stable through async loading', async () => {
  await ready;
  let resolve!: () => void;
  const action = vi.fn(() => new Promise<void>(done => { resolve = done; }));
  render(<ThemeProvider><IconButton name="Heart" label="Favorite" onPress={action} /></ThemeProvider>);
  const button = screen.getByRole('button', { name: 'Favorite' });
  const width = button.querySelector('svg')?.getAttribute('width');
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button.querySelector('svg')?.getAttribute('width')).toBe(width);
  fireEvent.click(button);
  expect(action).toHaveBeenCalledTimes(1);
  await act(async () => resolve());
  expect(button).toBeEnabled();
  expect(button).not.toHaveAttribute('aria-busy');
});

it('preserves a text action accessible name during loading', async () => {
  await ready;
  render(<ThemeProvider><Button label="Save Notes" loading /></ThemeProvider>);
  expect(screen.getByRole('button', { name: 'Save Notes' })).toHaveAttribute('aria-busy', 'true');
});

it('retries an avatar when its source changes after an image failure', () => {
  const view = render(<ThemeProvider><Avatar src="/missing-avatar.png" fallback="EP" /></ThemeProvider>);
  fireEvent.error(screen.getByRole('img', { name: 'EP' }));
  expect(screen.queryByRole('img', { name: 'EP' })).not.toBeInTheDocument();
  expect(screen.getByText('EP')).toBeInTheDocument();
  view.rerender(<ThemeProvider><Avatar src="/replacement-avatar.png" fallback="EP" /></ThemeProvider>);
  expect(screen.getByRole('img', { name: 'EP' })).toHaveAttribute('src', '/replacement-avatar.png');
});
