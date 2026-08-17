import explorerImg from "@/assets/levels/explorer.webp";
import settlerImg from "@/assets/levels/settler.webp";
import participantImg from "@/assets/levels/participant.webp";
import contributorImg from "@/assets/levels/contributor.webp";
import advocateImg from "@/assets/levels/advocate.webp";
import guardianImg from "@/assets/levels/guardian.webp";
import builderImg from "@/assets/levels/builder.webp";
import strategistImg from "@/assets/levels/strategist.webp";
import visionaryImg from "@/assets/levels/visionary.webp";
import legendImg from "@/assets/levels/legend.webp";
import explorerBg from "@/assets/levels/bg1.webp";
import settlerBg from "@/assets/levels/bg2.webp";
import participantBg from "@/assets/levels/bg3.webp";
import contributorBg from "@/assets/levels/bg4.webp";
import advocateBg from "@/assets/levels/bg5.webp";
import guardianBg from "@/assets/levels/bg6.webp";
import builderBg from "@/assets/levels/bg7.webp";
import strategistBg from "@/assets/levels/bg8.webp";
import visionaryBg from "@/assets/levels/bg9.webp";
import legendBg from "@/assets/levels/bg10.webp";
import { buildRewardTable } from "./civic-logic2";

export type Level = {
  id: number;
  title: string;
  points: number;
  image: string;
  bg: string;
  desc: string;
  isHidden?: boolean;
};

const rewards = buildRewardTable({
  totalLevels: 10,
  rewardType: "max",
  perUserReward: 100000n,
});
const getReward = (levelId: number) =>
  rewards?.[levelId - 1]?.reward.toString();
console.log("rewards", rewards, +getReward(1));

export const LEVELS: Level[] = [
  {
    id: 1,
    title: "Explorer",
    points: +getReward(1),
    image: explorerImg,
    bg: explorerBg,
    desc: "You’ve taken your first steps, setting out with curiosity to discover civic life.",
  },
  {
    id: 2,
    title: "Settler",
    points: +getReward(2),
    image: settlerImg,
    bg: settlerBg,
    desc: "You’re building roots, observing carefully, and laying down early foundations.",
  },
  {
    id: 3,
    title: "Participant",
    points: +getReward(3),
    image: participantImg,
    bg: participantBg,
    desc: "You’ve moved from watching to acting, casting your voice into the collective.",
  },
  {
    id: 4,
    title: "Contributor",
    points: +getReward(4),
    image: contributorImg,
    bg: contributorBg,
    desc: "You’re adding your own questions and ideas, helping shape the civic conversation.",
  },
  {
    id: 5,
    title: "Advocate",
    points: +getReward(5),
    image: advocateImg,
    bg: advocateBg,
    desc: "You’re speaking out with passion, rallying others and amplifying community voices.",
  },
  {
    id: 6,
    title: "Guardian",
    points: +getReward(6),
    image: guardianImg,
    bg: guardianBg,
    desc: "You stand firm for fairness, defending values and safeguarding the integrity of engagement",
  },
  {
    id: 7,
    title: "Builder",
    points: +getReward(7),
    image: builderImg,
    bg: builderBg,
    desc: "You’ve mastered the foundations and are now shaping bigger structures.",
  }, // current
  {
    id: 8,
    title: "Strategist",
    points: +getReward(8),
    image: strategistImg,
    bg: strategistBg,
    desc: "You’re thinking several moves ahead, guiding civic energy with foresight and precision.",
  },
  {
    id: 9,
    title: "Visionary",
    points: +getReward(9),
    image: visionaryImg,
    bg: visionaryBg,
    desc: "You’re inspiring others with vision, illuminating the path toward greater possibilities.",
  },
  {
    id: 10,
    title: "Legend",
    points: +getReward(10),
    image: legendImg,
    bg: legendBg,
    desc: "You’ve become a symbol of civic excellence, leaving a lasting legacy for others to follow.",
  },
  {
    id: 11,
    title: "Legend",
    points: +getReward(11),
    image: legendImg,
    bg: legendBg,
    desc: "You’ve become a symbol of civic excellence, leaving a lasting legacy for others to follow.",
    isHidden: true,
  },
];
