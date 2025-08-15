import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        const full_name = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const avatar_url = user.user_metadata?.avatar_url || '';

        await supabase.from('profiles').upsert({
          id: user.id,
          full_name,
          avatar_url,
        });
      }
    });
    return () => sub.subscription?.unsubscribe();
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --storm:#141B4D;
          --teal:#279989;
          --sea:#F8F7EC;
          --wave:#D6D2C4;
          --char:#3A3A3A;
          --cloud:#E9E9E9;
          --coral:#E86A5E;
          --tint:#ECF6F4;
        }
        html,body{margin:0;background:var(--sea);color:var(--char);font-family: 'Source Sans 3', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;}
        a{color:var(--teal);text-decoration:none}
        a:hover{text-decoration:underline}
        .pp-wrap{max-width:1200px;margin:0 auto;padding:24px}
        .pp-title{font-family:'Poppins', system-ui;font-weight:600;letter-spacing:.5px;color:var(--storm);margin:0 0 16px}
        .pp-card{background:#fff;border:1px solid var(--cloud);border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,.05);overflow:hidden}
        .btn{display:inline-flex;gap:8px;align-items:center;border-radius:8px;padding:10px 14px;border:2px solid transparent;cursor:pointer}
        .btn-primary{background:var(--teal);color:#fff}
        .btn-primary:hover{background:#1E7A6F}
        .btn-secondary{background:#fff;border-color:var(--storm);color:var(--storm)}
        .btn-secondary:hover{background:var(--storm);color:#fff}
        input,select,textarea{border:1px solid var(--cloud);border-radius:8px;padding:10px;background:#fff;width:100%}
        input:focus,select:focus,textarea:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px var(--tint)}
        .badge{display:inline-block;background:var(--coral);color:#fff;border-radius:6px;padding:2px 8px;font-size:12px}
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
