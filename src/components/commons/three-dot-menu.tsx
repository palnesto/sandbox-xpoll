import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MenuAction = {
  name: string; // Action name
  icon: React.ElementType; // Icon component
  onClick: () => void; // Action handler
  separatorBefore?: boolean; // Whether to include a separator before this action
};

type ThreeDotMenuProps = {
  label?: string; // Optional label for the menu
  actions: MenuAction[]; // Array of actions
};

export function ThreeDotMenu({
  label = "Actions",
  actions,
}: ThreeDotMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {actions.map((action, index) => (
          <div key={index}>
            {action.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={action.onClick}>
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.name}</span>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
