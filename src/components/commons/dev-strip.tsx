import { useApiQuery } from "@/hooks/useApiQuery";
import { Button } from "../ui/button";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "../mode-toggle";

export const DevStrip = () => {
  const appName = "Xpoll User";
  const navigate = useNavigate();
  const { refetch } = useApiQuery(endpoints.healthCheck);
  const { logout, user, isLoading } = useAuth();

  return import.meta.env.VITE_MODE !== "" ? (
    <div className="bg-orange-500 text-white text-sm px-4 py-2 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p>Dev mode</p>
          {appName && (
            <p className="bg-gray-900 rounded-lg py-1 px-2">{`App Name: ${appName}`}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <ModeToggle />
          </div>
          <Button
            size={"sm"}
            onClick={() => {
              navigate("/settings");
            }}
          >
            Settings
          </Button>
          <Button
            size={"sm"}
            onClick={() => {
              refetch?.();
            }}
          >
            Health Check
          </Button>
          <Button className="w-full" size={"sm"} onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  ) : null;
};
