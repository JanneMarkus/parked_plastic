// components/ChatWindow.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

function initials(name, fallback = "U") {
  const s = (name || "").trim();
  if (!s) return fallback;
  const parts = s.split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[1]?.[0] : "";
  return (a + b).toUpperCase();
}

export default function ChatWindow({ currentUserId, otherUserId, listingId }) {
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [meProfile, setMeProfile] = useState({ name: "You", avatar_url: null });
  const [otherProfile, setOtherProfile] = useState({
    name: "User",
    avatar_url: null,
  });

  const scrollerRef = useRef(null);

  // stable pair for the conversation row (sorted a/b)
  const [a, b] = useMemo(() => {
    if (!currentUserId || !otherUserId) return [null, null];
    return currentUserId < otherUserId
      ? [currentUserId, otherUserId]
      : [otherUserId, currentUserId];
  }, [currentUserId, otherUserId]);

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // fetch display names/avatars from profiles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (currentUserId) {
          const { data: me } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", currentUserId)
            .maybeSingle();
          if (!cancelled && (me?.full_name || me?.avatar_url)) {
            setMeProfile({
              name: me?.full_name || "You",
              avatar_url: me?.avatar_url || null,
            });
          }
        }
        if (otherUserId) {
          const { data: other } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", otherUserId)
            .maybeSingle();
          if (!cancelled && (other?.full_name || other?.avatar_url)) {
            setOtherProfile({
              name: other?.full_name || "User",
              avatar_url: other?.avatar_url || null,
            });
          }
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, otherUserId]);

  // create or fetch conversation
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!a || !b || !listingId) return;
      setLoading(true);
      setErrorMsg("");
      try {
        let { data: conv, error } = await supabase
          .from("conversations")
          .select("*")
          .eq("listing_id", listingId)
          .eq("user_a", a)
          .eq("user_b", b)
          .maybeSingle();
        if (error) throw error;

        if (!conv) {
          const { data, error: insErr } = await supabase
            .from("conversations")
            .insert([{ listing_id: listingId, user_a: a, user_b: b }])
            .select("*")
            .single();
          if (insErr) throw insErr;
          conv = data;
        }
        if (!cancelled) setConvId(conv.id);
      } catch (e) {
        console.error(e);
        if (!cancelled)
          setErrorMsg(e?.message || "Failed to start conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [a, b, listingId]);

  // load messages + realtime
  useEffect(() => {
    if (!convId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message || "Failed to load messages.");
      } else {
        setMessages(data || []);
        setTimeout(scrollToBottom, 0);
      }
    })();

    const ch = supabase
      .channel(`messages:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(scrollToBottom, 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      cancelled = true;
    };
  }, [convId, scrollToBottom]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !convId || !currentUserId || !otherUserId) return;

    const body = input.trim();
    setInput("");
    setSending(true);
    setErrorMsg("");

    // optimistic
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversation_id: convId,
      sender_id: currentUserId,
      from_user: currentUserId, // legacy
      to_user: otherUserId, // legacy
      body,
      created_at: new Date().toISOString(),
      listing_id: listingId,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(scrollToBottom, 0);

    const payload = {
      conversation_id: convId,
      listing_id: listingId,
      sender_id: currentUserId, // new
      from_user: currentUserId, // legacy
      to_user: otherUserId, // legacy
      body,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setErrorMsg(error.message || "Failed to send message.");
      setInput(body);
    } else {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const exists = withoutTemp.some((m) => m.id === data.id);
        return exists ? withoutTemp : [...withoutTemp, data];
      });
      setTimeout(scrollToBottom, 0);
    }

    setSending(false);
  };

  const me = currentUserId;
  let lastSender = null;

  return (
    <div className="chat">
      <style jsx>{styles}</style>

      <header className="head">
        {otherProfile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="avatar"
            src={otherProfile.avatar_url}
            alt={otherProfile.name}
          />
        ) : (
          <div className="avatar avatar-fallback" aria-hidden>
            {initials(otherProfile.name, "U")}
          </div>
        )}
        <div className="title">
          <div className="name">{otherProfile.name}</div>
          <div className="sub">Private chat</div>
        </div>
      </header>

      <div
        className="scroll"
        ref={scrollerRef}
        aria-live="polite"
        aria-atomic="false"
      >
        {loading ? (
          <div className="sys muted">Loading messages…</div>
        ) : errorMsg ? (
          <div className="sys error">{errorMsg}</div>
        ) : messages.length === 0 ? (
          <div className="sys muted">
            Say hi and ask about ink, dome, or trades.
          </div>
        ) : (
          messages.map((m, i) => {
  const sender = m.sender_id ?? m.from_user;
  const mine = sender === me;

  const prev = messages[i - 1];
  const prevSender = prev ? (prev.sender_id ?? prev.from_user) : null;

  // Only show a label when the OTHER person starts a new block
  const showLabel = !mine && sender !== prevSender;
  const label = otherProfile.name || "User";

  return (
    <div key={m.id} className={`row ${mine ? "mine" : "theirs"}`}>
      <div className="stack">
        {showLabel && <div className="who">{label}</div>}
        <div className="bubble">
          <div className="text">{m.body}</div>
          <div className="time">
            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  );
})
        )}
      </div>

      <form className="composer" onSubmit={onSend}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e);
            }
          }}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!input.trim() || sending || !convId}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

const styles = `
  /* brand tokens with safe fallbacks so this looks good even if vars aren't global */
  :root {}
  .chat {}
  .head {
    display:flex; align-items:center; gap:10px; margin-bottom: 8px;
  }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%; object-fit: cover;
    border: 2px solid rgba(0,0,0,0.06);
  }
  .avatar-fallback {
    display:flex; align-items:center; justify-content:center;
    background: var(--teal, #279989); color:#fff; font-weight: 800;
  }
  .title .name {
    font-family:'Poppins',sans-serif; font-weight:600; color: var(--storm, #141B4D);
  }
  .title .sub { font-size:.85rem; color: #666; }

  .scroll {
    height: 300px; overflow:auto; border:1px solid var(--cloud, #E9E9E9);
    border-radius:10px; padding:10px; background:#FAFAF7;
  }
  .sys { text-align:center; padding:10px; }
  .muted { color:#666; }
  .error {
    display:inline-block; background:#fff5f4; border:1px solid #ffd9d5; color:#8c2f28;
    border-radius:10px; padding:6px 10px;
  }

  .row { display:flex; width: 80%; margin: 10px 0; }

  .row.mine { justify-content:flex-end; }
  .row.theirs { justify-content:flex-start; }

  .stack { max-width: 84%; display: flex; flex-direction: column; align-items: flex-start; }
  .row.mine .stack { align-items: flex-end; }

  .who {
    font-size:.75rem; color:#777; margin:0 6px 4px;
  }
  .bubble {
    background:#fff; border:1px solid var(--cloud, #E9E9E9);
    border-radius:12px; padding:8px 10px; box-shadow:0 2px 6px rgba(0,0,0,0.05);
  }
  .row.mine .bubble {
    background: var(--tint, #ECF6F4);
    border-color: #D3EEEA;
  }
  .text { white-space: pre-wrap; color: var(--char, #3A3A3A); }
  .time { text-align:right; font-size:.75rem; color:#777; margin-top:4px; }

  .composer { display:flex; gap:8px; margin-top: 12px; }
  .composer textarea {
    flex:1; resize:none; min-height:40px; max-height:120px;
    border:1px solid var(--cloud, #E9E9E9); border-radius:10px; padding:10px 12px;
    font-size:15px; color: var(--char, #3A3A3A); outline:none;
    transition: border-color .15s, box-shadow .15s;
  }
  .composer textarea:focus { border-color: var(--teal, #279989); box-shadow: 0 0 0 4px var(--tint, #ECF6F4); }

  .btn {
    border:none; border-radius:10px; padding:10px 14px; font-weight:700; cursor:pointer;
  }
  .btn-primary { background: var(--teal, #279989); color:#fff; }
  .btn-primary:hover { background: var(--teal-dark, #1E7A6F); }
`;
