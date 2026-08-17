import { Axe } from "lucide-react";

import { Navigate } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex h-full  flex-grow flex-col items-center justify-center gap-3 text-gray-600">
      <Axe size={50} strokeWidth={0.8} />
      <p>Broken or Invalid URL</p>
    </div>
  );
}

export default function NOTFOUNDROUTE() {
  return <Navigate to={"/home"} replace />;
}
