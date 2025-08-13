// components/ChatWindow.js
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Use it 2 ways:
 *  - <ChatWindow otherUserId="..." listingId="...optional..." />
 *  - <ChatWindow threadId="..." />  (opens an existing thread)
 */
export default function ChatWindow({ otherUserId = null, listingId = null, threadId: threadIdProp = null }) {
  const [me, setMe] = useState(null);
  const [threadId, setThreadId] = useState(threadIdProp);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  // Auth
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setMe(data?.session?.user ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setMe(session?.user ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Find or create thread if needed
  useEffect(() => {
    if (!me) return;
    let cancelled = false;

    async function ensureThread() {
      if (threadIdProp) {
        setThreadId(threadIdProp);
        return;
      }
      if (!otherUserId) return;

      // Try to find existing
      const { data: existing, error: findErr } = await supabase
        .from("threads")
        .select("id")
        .or(`and(a.eq.${me.id},b.eq.${otherUserId}),and(a.eq.${otherUserId},b.eq.${me.id})`)
        .eq("listing_id", listingId ?? null)
        .limit(1)
        .maybeSingle();

      if (findErr) console.error(findErr);
      if (existing?.id) {
        if (!cancelled) setThreadId(existing.id);
        return;
      }

      // Create new
      const payload = { a: me.id, b: otherUserId, listing_id: listingId ?? null };
      const { data: created, error: insErr } = await supabase.from("threads").insert(payload).select("id").single();
      if (insErr) {
        console.error(insErr);
        return;
      }
      if (!cancelled) setThreadId(created.id);
    }

    ensureThread();
    return () => { cancelled = true; };
  }, [me, otherUserId, listingId, threadIdProp]);

  // Load messages + realtime
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    let channel;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        if (error) console.error(error);
        setMessages(data || []);
        setLoading(false);
        scrollToEnd();
      }

      // realtime sub
      channel = supabase
        .channel(`thread-${threadId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
            scrollToEnd();
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [threadId]);

  function scrollToEnd() {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
  }

  async function sendMessage(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !me || !threadId) return;
    setText("");
    const { error } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender: me.id,
      body
    });
    if (error) {
      console.error(error);
      alert("Failed to send message: " + error.message);
    }
  }

  return (
    <div className="chat">
      <style jsx>{`
        .chat { border:1px solid #E9E9E9; border-radius:12px; overflow:hidden; background:#fff; display:flex; flex-direction:column; height:420px; }
        .head { background:#F8F7EC; padding:10px 14px; font-weight:700; color:#141B4D; font-family:'Poppins',sans-serif; }
        .list { flex:1; overflow:auto; padding: 12px; background:#fff; }
        .row { margin: 8px 0; display:flex; }
        .row.you { justify-content:flex-end; }
        .bubble { max-width: 72%; padding:10px 12px; border-radius:12px; line-height:1.3; }
        .me { background:#279989; color:#fff; border-top-right-radius:4px; }
        .them { background:#ECF6F4; color:#141B4D; border-top-left-radius:4px; }
        .meta { font-size:11px; color:#666; margin-top:4px; }
        form { border-top:1px solid #E9E9E9; display:flex; gap:8px; padding:10px; background:#fff; }
        input[type="text"] { flex:1; border:1px solid #E9E9E9; border-radius:10px; padding:10px 12px; }
        input[type="text"]:focus { outline:none; border-color:#279989; box-shadow:0 0 0 4px #ECF6F4; }
        button { background:#279989; color:#fff; border:none; border-radius:10px; padding:10px 14px; font-weight:700; }
        button:hover { background:#1E7A6F; }
      `}</style>

      <div className="head">Conversation</div>

      <div className="list">
        {loading && <div className="meta">Loading messages…</div>}
        {messages.map((m) => {
          const mine = m.sender === me?.id;
          return (
            <div key={m.id} className={`row ${mine ? "you" : ""}`}>
              <div className={`bubble ${mine ? "me" : "them"}`}>
                <div>{m.body}</div>
                <div className="meta">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
