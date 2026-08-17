import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import FeaturedStory from "@/components/inkd/featured";
import { HeroSection } from "@/components/inkd/hero"; 
import MoreBlogs from "@/components/inkd/more-blog";
import TodaysEdition from "@/components/inkd/today";

export default function InkDIndexPage() {
    const location = useLocation();
    const reduceMotion = useReducedMotion();
    const shouldAnimate =
        Boolean((location.state as any)?.fromInkdHero) && !reduceMotion;

    return (
        <motion.div
            className="min-h-screen bg-[#f3f4f6]"
            initial={shouldAnimate ? { x: 60, opacity: 0 } : false}
            animate={shouldAnimate ? { x: 0, opacity: 1 } : undefined}
            transition={{
                duration: 1.8,
                ease: [0.2, 0.85, 0.2, 1],
            }}
        >
            <HeroSection />
            <FeaturedStory />
            <TodaysEdition />
            <MoreBlogs />
        </motion.div>
    );
}