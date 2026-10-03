import { useApi } from "../../hooks/useApi";
import * as supportApi from "../../api/support";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner } from "../ui/Primitives";
import SupportTicketThread from "./SupportTicketThread";
import { apiErrorMessage } from "../../api/client";

/**
 * Loads one ticket on demand and wires its two mutations (reply, status) to
 * the API. Both the admin and the master screens open the same panel; the
 * master just gets the status control.
 */
export default function SupportTicketPanel({
  ticketId,
  schoolId,
  canManageStatus = false,
  onChanged,
}) {
  const { data, loading, error, refetch } = useApi(
    () => supportApi.getTicket(ticketId),
    [ticketId]
  );
  const toast = useToast();

  async function reply(payload) {
    try {
      await supportApi.addTicketMessage(ticketId, payload);
      toast("Reply sent");
      refetch();
      onChanged?.();
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    }
  }

  async function changeStatus(status) {
    try {
      await supportApi.setTicketStatus(ticketId, status);
      toast(`Marked ${status}`);
      refetch();
      onChanged?.();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <ErrorBanner message={error} />
      {data && (
        <SupportTicketThread
          ticket={data}
          schoolId={schoolId}
          canManageStatus={canManageStatus}
          onReply={reply}
          onStatusChange={changeStatus}
        />
      )}
    </>
  );
}
