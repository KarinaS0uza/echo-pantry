import { request, ApiError } from '../src/api/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../src/design/theme';
import { NavigationGuard } from '../src/drafts/NavigationGuard';
import { SignUp } from '../src/screens/SignUp';
import { SignIn } from '../src/screens/SignIn';
import { i18n, ready } from '../src/i18n';

vi.mock('../src/api/client', async importOriginal => ({ ...await importOriginal<typeof import('../src/api/client')>(), request: vi.fn() }));

// Network status is independently covered by client tests.
vi.mock('../src/app/OfflineBanner', () => ({ OfflineBanner: () => null }));

beforeEach(async () => {
  vi.mocked(request).mockRejectedValue(new ApiError(503, 'Unavailable'));
  await ready;
  await i18n.changeLanguage('en');
});

function mount(path = '/sign-up') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <NavigationGuard>
          <Routes>
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/sign-in" element={<SignIn />} />
          </Routes>
        </NavigationGuard>
      </MemoryRouter>
    </ThemeProvider>
  );
}

it('rejects an empty submission and then an invalid one before anything is accepted', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  expect(await screen.findByText('Enter Name.')).toBeVisible();
  expect(screen.getByText('Enter Email.')).toBeVisible();
  expect(screen.getByText('Enter Password.')).toBeVisible();
  expect(screen.queryByText(/aren't connected/)).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sam Cook' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  expect(await screen.findByText('Enter a valid email address.')).toBeVisible();
  expect(screen.getByText('Use at least 8 characters.')).toBeVisible();
  expect(screen.queryByText('Enter Name.')).not.toBeInTheDocument();
});

it('preserves a valid submission when the API is unavailable', async () => {
  mount();
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sam Cook' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'cook@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correcthorsebattery' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

  expect(await screen.findByText('Could not save. Your input is still here. Try again.')).toBeVisible();
  expect(screen.getByLabelText('Name')).toHaveValue('Sam Cook');
  expect(screen.getByLabelText('Email')).toHaveValue('cook@example.com');
  expect(screen.getByLabelText('Password')).toHaveValue('correcthorsebattery');
});

it('reveals and re-hides the password on request', async () => {
  mount();
  const password = screen.getByLabelText('Password');
  expect(password).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show password' }));
  expect(password).toHaveAttribute('type', 'text');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show password' }));
  expect(password).toHaveAttribute('type', 'password');
});

it('routes to sign in from the sign-up screen', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

it('localizes the form in Portuguese', async () => {
  await i18n.changeLanguage('pt-BR');
  mount();
  expect(screen.getByRole('button', { name: 'Criar conta' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByText('Preencha E-mail.')).toBeVisible();
});
