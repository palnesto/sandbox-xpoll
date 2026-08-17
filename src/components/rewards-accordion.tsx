import { Card } from "@/components/ui/card";
import { RewardsTable, RewardsTableProps } from "./level-reward-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

export function RewardsAccordion(props: RewardsTableProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="rewards">
        <AccordionTrigger className="text-sm border font-semibold bg-white p-2">
          Reward Distribution
        </AccordionTrigger>
        <AccordionContent>
          <Card className="mt-2">
            <RewardsTable {...props} />
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
