import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export const CustomLink = ({ label, to }: { label: string; to: string }) => {
  return (
    <Link
      className="text-sm flex gap-1 font-semibold items-center text-blue-500 hover:text-blue-600 cursor-pointer hover:underline"
      to={to}
    >
      {label} <ExternalLink size={14} />
    </Link>
  );
};
