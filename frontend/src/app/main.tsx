import { restoreSession } from '@/api/session';
import { SessionRecovery } from '@/components/SessionRecovery';
import { OwnedPantry } from '@/screens/OwnedPantry';
import { useSession } from '@/api/session';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import { ThemeProvider } from '@/design/theme';
import { GlobalStyles } from '@/design/GlobalStyles';
import { i18n, ready } from '@/i18n';
import { NavigationGuard } from '@/drafts/NavigationGuard';
import { Meals, CatalogueMeals } from '@/screens/Meals';
import { RecipeDetailScreen } from '@/screens/RecipeDetailScreen';
import { Pantry } from '@/screens/Pantry';
import { Foundation } from '@/screens/Foundation';
import { SignUp } from '@/screens/SignUp';
import { KitchenSimulation } from '@/screens/KitchenSimulation';
import { Landing } from '@/screens/Landing';
import { SignIn } from '@/screens/SignIn';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always' }, mutations: { retry: false, networkMode: 'always' } } });
function ScrollReset() {
  const { pathname } = useLocation();
  React.useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}
function ClearPrivateCache() { const account = useSession(); React.useEffect(() => { queryClient.removeQueries({ queryKey: ['owned'] }); }, [account?.id]); return null; }
function MealsRoute() { const account = useSession(); return account ? <CatalogueMeals /> : <Meals />; }
function PantryRoute() { const account = useSession(); return account ? <OwnedPantry key={account.id} /> : <Pantry />; }
void Promise.all([ready, restoreSession()]).then(() => {
  createRoot(document.getElementById('root')!).render(<React.StrictMode><I18nextProvider i18n={i18n}><ThemeProvider><GlobalStyles /><QueryClientProvider client={queryClient}><HashRouter><ScrollReset /><NavigationGuard><ClearPrivateCache /><SessionRecovery /><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/welcome" element={<Landing />} />
    <Route path="/kitchen" element={<KitchenSimulation />} />
    <Route path="/meals" element={<MealsRoute />} /><Route path="/recipes/:id" element={<RecipeDetailScreen />} />
    <Route path="/pantry" element={<PantryRoute />} />
    <Route path="/catalogue" element={<CatalogueMeals />} />
    <Route path="/demo/meals" element={<Meals />} />
    <Route path="/demo/pantry" element={<Pantry />} />
    <Route path="/my-recipes" element={<Foundation />} />
    <Route path="/sign-in" element={<SignIn />} />
    <Route path="/sign-up" element={<SignUp />} />
    <Route path="*" element={<Navigate to="/meals" replace />} />
  </Routes></NavigationGuard></HashRouter></QueryClientProvider></ThemeProvider></I18nextProvider></React.StrictMode>);
});
