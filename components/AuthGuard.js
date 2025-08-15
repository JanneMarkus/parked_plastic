import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function AuthGuard({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authed' | 'anon'
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        setStatus('authed');
      } else {
        setStatus('anon');
        const qp = encodeURIComponent(router.asPath || '/account');
        router.replace(`/login?redirect=${qp}`);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setStatus('authed');
      else setStatus('anon');
    });

    return () => { mounted = false; sub.subscription?.unsubscribe(); };
  }, [router]);

  if (status !== 'authed') {
    return (
      <div className="pp-wrap">
        <h1 className="pp-title">Checking your session…</h1>
      </div>
    );
  }

  return children;
}
