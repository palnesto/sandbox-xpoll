import { Navigate } from "react-router-dom";

/**
 * `/add-polls` is the entry point every "Create poll" button links to, but the
 * original landing screen was commented out, leaving a blank page. The wizard
 * itself starts at step 1, so send people straight there.
 */
export default function AddPollsEntry() {
  return <Navigate to="/add-polls/basic-info" replace />;
}
