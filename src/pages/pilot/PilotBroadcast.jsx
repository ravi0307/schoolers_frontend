import { useState } from "react";
import PilotShell from "../../components/layout/PilotShell";
import BroadcastFeed from "../../components/ui/BroadcastFeed";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as communicationApi from "../../api/communication";
import { useToast } from "../../context/ToastContext";
import { apiErrorMessage } from "../../api/client";

export default function PilotBroadcast() {
  const { user } = useAuth();
  const toast = useToast();

  const { data: broadcasts, loading: broadcastsLoading, error: broadcastsError, refetch: refetchBroadcasts } = useApi(
    () => communicationApi.listBroadcasts(),
    []
  );
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  async function sendBroadcast(event) {
    event.preventDefault();
    if (!broadcastMessage.trim()) {
      toast("Enter a message");
      return;
    }
    setSendingBroadcast(true);
    try {
      await communicationApi.createBroadcast({
        scope: "school",
        role_name: "Pilot",
        sender_name: user?.name || user?.username || "Pilot",
        message: broadcastMessage.trim(),
      });
      toast("Broadcast sent to the school community");
      setBroadcastMessage("");
      refetchBroadcasts();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSendingBroadcast(false);
    }
  }

  return (
    <PilotShell>
      <div className="scr-title">Broadcast</div>
      <div className="scr-sub">
        Sent to the school admin, teachers, and parents across the school.
      </div>

      <form className="card white" onSubmit={sendBroadcast} style={{ marginTop: 14 }}>
        <div className="field">
          <label>Message</label>
          <textarea
            value={broadcastMessage}
            onChange={(event) => setBroadcastMessage(event.target.value)}
            placeholder="Type a broadcast for the school..."
            rows={3}
          />
        </div>
        <button className="btn primary" type="submit" disabled={sendingBroadcast}>
          {sendingBroadcast ? "Sending..." : "Send Broadcast"}
        </button>
      </form>

      <div className="section-label">Recent broadcasts</div>
      <BroadcastFeed
        data={broadcasts}
        loading={broadcastsLoading}
        error={broadcastsError}
        limit={6}
        empty="No broadcasts yet."
      />
    </PilotShell>
  );
}