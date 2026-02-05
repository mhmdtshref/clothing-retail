import SignUpClient from './SignUpClient';
import { getSignupEnabled } from '@/lib/env';

function getRedirectUrl(searchParams) {
  const raw =
    typeof searchParams?.redirect_url === 'string'
      ? searchParams.redirect_url
      : Array.isArray(searchParams?.redirect_url)
        ? searchParams.redirect_url[0]
        : '/';

  const candidate = String(raw || '').trim() || '/';
  return candidate.startsWith('/') ? candidate : '/';
}

export default function Page({ searchParams }) {
  const redirectUrl = getRedirectUrl(searchParams);
  const signupEnabled = getSignupEnabled();
  return <SignUpClient redirectUrl={redirectUrl} signupEnabled={signupEnabled} />;
}
