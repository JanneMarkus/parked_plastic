// components/ChatWindow.js
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ChatWindow({ currentUserId, otherUserId, listingId }) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef(null);

  // Guard: listingId is required per your DB schema
  if (!listingId) {
    return <p style={{ color: "#E86A5E" }}>Chat requires a listing. (listingId is missing)</p>;
  }

  // Initial fetch
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const pair = `and(from_user.eq.${currentUserId},to_user.eq.${otherUserId}),and(from_user.eq.${otherUserId},to_user.eq.${currentUserId})`;
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("listing_id", listingId)
          .or(pair)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (active) setMessages(data || []);
      } catch (e) {
        console.error(e);
        if (active) setMessages([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [currentUserId, otherUserId, listingId]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUserId || !otherUserId || !listingId) return;
    const channel = supabase
      .channel(`messages-${listingId}-${currentUserId}-${otherUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `listing_id=eq.${listingId}` },
        (payload) => {
          const m = payload.new;
          // only append if this row belongs to this conversation pair
          const inPair =
            (m.from_user === currentUserId && m.to_user === otherUserId) ||
            (m.from_user === otherUserId && m.to_user === currentUserId);
          if (inPair) {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId, listingId]);

  // Auto-scroll to last message
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (sending) return;
    const text = body.trim();
    if (!text) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      listing_id: listingId,
      from_user: currentUserId,
      to_user: otherUserId,
      body: text,
    });
    setSending(false);
    if (error) {
      alert("Failed to send: " + error.message);
      return;
    }
    setBody("");
  }

  return (
    <div className="chat">
      <style jsx>{`
        .chat {
          display: grid;
          grid-template-rows: 1fr auto;
          border: 1px solid #E9E9E9;
          border-radius: 12px;
          overflow: hidden;
        }
        .list {
          background: #FDFDFB;
          padding: 12px;
          max-height: 420px;
          overflow-y: auto;
        }
        .msg {
          max-width: 70%;
          margin: 6px 0;
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          line-height: 1.25;
          color: #3A3A3A;
        }
        .me {
          margin-left: auto;
          background: #279989; /* Caribbean Sea */
          color: #fff;
        }
        .them {
          background: #FFFFFF;
          border: 1px solid #E9E9E9;
        }
        .time {
          display: block;
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
        }
        form {
          display: flex;
          gap: 8px;
          padding: 10px;
          background: #fff;
          border-top: 1px solid #E9E9E9;
        }
        input[type="text"] {
          flex: 1;
          border: 1px solid #E9E9E9;
          border-radius: 8px;
          padding: 10px 12px;
          outline: none;
        }
        input[type="text"]:focus {
          border-color: #279989;
          box-shadow: 0 0 0 4px #ECF6F4;
        }
        button {
          border: none;
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: 700;
          background: #279989;
          color: #fff;
          cursor: pointer;
        }
        button:hover { background: #1E7A6F; }
      `}</style>

      <div className="list" ref={scrollerRef} aria-live="polite">
        {loading ? (
          <p style={{ textAlign: "center", color: "#666" }}>Loading messages…</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>No messages yet. Say hi!</p>
        ) : (
          messages.map((m) => {
            const mine = m.from_user === currentUserId;
            return (
              <div key={m.id} className={`msg ${mine ? "me" : "them"}`}>
                <div>{m.body}</div>
                <span className="time">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          aria-label="Message"
        />
        <button type="submit" disabled={sending || !body.trim()}>
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
