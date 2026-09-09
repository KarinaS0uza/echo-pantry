import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../src/design/theme';
import { NavigationGuard } from '../src/drafts/NavigationGuard';
import { SignIn } from '../src/screens/SignIn';
import { signIn, signOut } from '../src/api/session';
import { ApiError } from '../src/api/client';
import { i18n, ready } from '../src/i18n';

vi.mock('../src/api/session', () => ({ signIn: vi.fn(), useSession: () => null, signOut: vi.fn() }));

// Network status is independently covered by client tests.
vi.mock('../src/app/OfflineBanner', () => ({ OfflineBanner: () => null }));

beforeEach(async () => {
  vi.mocked(signIn).mockReset();
  await ready;
  await i18n.changeLanguage('en');
});

function mount(path = '/sign-in') {
  return render(
    <QueryClientProvider client={new QueryClient()}><ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <NavigationGuard>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/pantry" element={<h1>Pantry</h1>} />
            <Route path="/sign-up" element={<h1>Create Account</h1>} />
          </Routes>
        </NavigationGuard>
      </MemoryRouter>
    </ThemeProvider></QueryClientProvider>
  );
}

it('shows an email field, a password field, and a way to sign up', () => {
  mount();
  expect(screen.getByLabelText('Email')).toBeVisible();
  expect(screen.getByLabelText('Password')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Explore the Interface' })).not.toBeInTheDocument();
});

it('rejects an empty submission and then an invalid email before anything is accepted', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByText('Enter Email.')).toBeVisible();
  expect(screen.getByText('Enter Password.')).toBeVisible();
  expect(screen.queryByText(/aren't connected/)).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByText('Enter a valid email address.')).toBeVisible();
  expect(screen.queryByText('Enter Password.')).not.toBeInTheDocument();
});

it('signs in and opens the pantry', async () => {
  mount();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'cook@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correcthorsebattery' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  expect(await screen.findByRole('heading', { name: 'Pantry' })).toBeVisible();
  expect(signIn).toHaveBeenCalledWith('cook@example.com', 'correcthorsebattery');
});

it('opens demo data without credentials or authentication and leaves any account session', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Continue With Demo Data' }));
  expect(await screen.findByRole('heading', { name: 'Pantry' })).toBeVisible();
  expect(signIn).not.toHaveBeenCalled();
  expect(signOut).toHaveBeenCalledOnce();
});

it('opens sign-up from the sign-in screen', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
  expect(await screen.findByRole('heading', { name: 'Create Account' })).toBeVisible();
});

it('localizes the form in Portuguese', async () => {
  await i18n.changeLanguage('pt-BR');
  mount();
  expect(screen.getByRole('heading', { name: 'Que bom ter você de volta' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Preencha E-mail.')).toBeVisible();
});

it('keeps credentials available to retry when sign-in fails', async () => {
  vi.mocked(signIn).mockRejectedValue(new ApiError(401, 'Unauthorized'));
  mount();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'cook@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'incorrect' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByText('Email or password is incorrect. Try again.')).toBeVisible();
  expect(screen.getByLabelText('Email')).toHaveValue('cook@example.com');
  expect(screen.getByLabelText('Password')).toHaveValue('incorrect');
});
