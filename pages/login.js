import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const redirect = router.query.redirect || '/account';

  async function signInGoogle() {
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${site}${redirect}`,
        queryParams: { prompt: 'select_account' }, // always show chooser
      },
    });
  }

  return (
    <div className="pp-wrap">
      <h1 className="pp-title">Sign in to Parked Plastic</h1>
      <div className="pp-card" style={{ padding: 16 }}>
        <p>Use your Google account to continue.</p>
        <button className="btn btn-primary" onClick={signInGoogle}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
