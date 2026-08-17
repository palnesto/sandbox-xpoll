import inkdHero from "@/assets/inkd/inkd.webp";

import heroCard1 from "@/assets/inkd/first.webp";
import heroCard2 from "@/assets/inkd/sec.webp";
import heroCard3 from "@/assets/inkd/third.webp";
import heroCard4 from "@/assets/inkd/fourth.webp";
import heroCard5 from "@/assets/inkd/fifth.webp";
import heroCard6 from "@/assets/inkd/six.webp";
import heroCard7 from "@/assets/inkd/seven.webp";
import heroCard8 from "@/assets/inkd/eight.webp";
import BackButton from "../commons/back-button";

type FloatingCardProps = {
    src: string;
    alt?: string;
    className?: string;
    rotate?: string;
};

function FloatingCard({
    src,
    alt = "",
    className = "",
    rotate = "",
}: FloatingCardProps) {
    return (
        <div
            className={[
                "absolute overflow-hidden rounded-[18px]",
                "shadow-[0_20px_60px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.15)]",
                rotate,
                className,
            ].join(" ")}
        >
            <img
                src={src}
                alt={alt}
                className="block h-full w-full object-cover"
                loading="lazy"
            />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.6) 100%)",
                }}
            />
        </div>
    );
}

export function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-[#f3f4f6]">
            <BackButton  className="absolute left-4 top-3 z-20" to="/"/>
            <div className="relative mx-auto h-[450px] max-w-[1440px] md:h-[750px] lg:h-[944px]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,104,246,0.10)_0%,rgba(45,104,246,0.04)_18%,rgba(0,0,0,0)_42%)]" />

                {/* brand */}
                <div className="absolute left-1/2 top-5 z-[5] -translate-x-1/2 sm:top-8">
                    <p className="font-black leading-none tracking-[-0.04em] text-black text-lg md:text-2xl">
                        INK<span className="text-[#2D68F6]">D</span>
                    </p>
                </div>

                {/* faded squid background - larger graphic, section height unchanged */}
                <img
                    src={inkdHero}
                    alt=""
                    className="pointer-events-none absolute left-1/2 -top-40 z-[1] h-[140%] w-[140%] min-h-[800px] min-w-[900px] md:min-w-[2000px] -translate-x-1/2 opacity-[0.2] object-contain md:-top-[170px] xl:min-h-[1500px] xl:min-w-[4500px]"
                    loading="lazy"
                />
 
                <div className="hidden sm:block">
                    <FloatingCard
                        src={heroCard1}
                        className="left-[28px] top-[86px] h-[168px] w-[126px] xl:left-[30px] xl:top-[90px] xl:h-[200px] xl:w-[180px] 2xl:left-[40px] 2xl:top-[98px] 2xl:h-[253px] 2xl:w-[215px]"
                        rotate="-rotate-[14deg]"
                    />
                    <FloatingCard
                        src={heroCard2}
                        className="left-[122px] top-[98px] h-[132px] w-[102px] xl:left-[180px] xl:top-[130px] xl:h-[180px] xl:w-[150px] 2xl:left-[279px] 2xl:top-[98px] 2xl:h-[220px] 2xl:w-[171px]"
                        rotate="rotate-[8deg]"
                    />
                    <FloatingCard
                        src={heroCard3}
                        className="left-[36px] top-[428px] h-[156px] w-[118px] xl:left-[50px] xl:top-[450px] xl:h-[180px] xl:w-[150px] 2xl:left-[74px] 2xl:top-[405px] 2xl:h-[271px] 2xl:w-[208px]"
                        rotate="-rotate-[18deg]"
                    />
                    <FloatingCard
                        src={heroCard4}
                        className="left-[154px] top-[554px] h-[126px] w-[96px] md:left-[120px] md:top-[520px] xl:left-[180px] xl:top-[600px] xl:h-[180px] xl:w-[150px] 2xl:left-[261px] 2xl:top-[594px] 2xl:h-[225px] 2xl:w-[165px]"
                        rotate="rotate-[14deg]"
                    />

                    <FloatingCard
                        src={heroCard5}
                        className="right-[126px] top-[112px] h-[138px] w-[104px] xl:right-[180px] xl:top-[130px] xl:h-[180px] xl:w-[150px] 2xl:right-[232px] 2xl:top-[165px] 2xl:h-[235px] 2xl:w-[175px]"
                        rotate="-rotate-[8deg]"
                    />
                    <FloatingCard
                        src={heroCard6}
                        className="right-[28px] top-[88px] h-[154px] w-[118px] xl:right-[30px] xl:top-[100px] xl:h-[180px] xl:w-[150px] 2xl:right-[24px] 2xl:top-[118px] 2xl:h-[255px] 2xl:w-[222px]"
                        rotate="rotate-[15deg]"
                    />
                    <FloatingCard
                        src={heroCard7}
                        className="right-[72px] top-[468px] h-[148px] w-[112px] md:right-[30px] md:top-[400px] xl:right-[50px] xl:top-[450px] xl:h-[180px] xl:w-[150px] 2xl:right-[93px] 2xl:top-[468px] 2xl:h-[228px] 2xl:w-[204px]"
                        rotate="rotate-[18deg]"
                    />
                    <FloatingCard
                        src={heroCard8}
                        className="right-[178px] top-[612px] h-[128px] w-[96px] md:right-[30px] md:top-[550px] xl:right-[200px] xl:top-[600px] xl:h-[180px] xl:w-[150px] 2xl:right-[300px] 2xl:top-[630px] 2xl:h-[232px] 2xl:w-[172px]"
                        rotate="-rotate-[14deg]"
                    />
                </div>
 
                <div className="sm:hidden">
                    <FloatingCard
                        src={heroCard1}
                        className="left-[18px] top-[64px] h-[76px] w-[58px]"
                        rotate="-rotate-[14deg]"
                    />
                    <FloatingCard
                        src={heroCard2}
                        className="left-[58px] top-[112px] h-[54px] w-[42px]"
                        rotate="rotate-[8deg]"
                    />
                    <FloatingCard
                        src={heroCard5}
                        className="right-[40px] top-[70px] h-[66px] w-[50px]"
                        rotate="-rotate-[8deg]"
                    />
                    <FloatingCard
                        src={heroCard6}
                        className="right-[7px] top-[102px] h-[60px] w-[50px]"
                        rotate="rotate-[12deg]"
                    />
                    <FloatingCard
                        src={heroCard3}
                        className="left-[10px] top-[210px] h-[72px] w-[54px]"
                        rotate="-rotate-[18deg]"
                    />
                    <FloatingCard
                        src={heroCard4}
                        className="left-[20px] top-[290px] h-[68px] w-[52px]"
                        rotate="rotate-[12deg]"
                    />
                    <FloatingCard
                        src={heroCard7}
                        className="right-[20px] top-[240px] h-[68px] w-[52px]"
                        rotate="rotate-[14deg]"
                    />
                    <FloatingCard
                        src={heroCard8}
                        className="right-[20px] top-[300px] h-[68px] w-[52px]"
                        rotate="-rotate-[14deg]"
                    />
                </div>

                {/* hero headline */}
                <div className="absolute left-1/2 top-[70px] z-[3] w-full max-w-[560px] -translate-x-1/2 px-4 text-center md:top-[200px] lg:top-[168px]">
                    <div className="leading-[0.88] flex flex-col items-center justify-center">
                        <div className="text-7xl font-black uppercase tracking-[-0.055em] text-[#2D68F6] drop-shadow-[0_8px_48px_rgba(45,104,246,0.28)] sm:text-[120px] lg:text-[200px] lg:leading-[180px]">
                            READ.
                        </div>

                        <div
                            className="mt-2 text-7xl font-black uppercase tracking-[-0.055em] text-transparent sm:text-[112px] lg:mt-0 lg:text-[200px] lg:leading-[180px]"
                            style={{
                                WebkitTextStroke: "1.5px #7EA5FF",
                            }}
                        >
                            SHARE.
                        </div>

                        <div className="mt-2 text-7xl font-black uppercase tracking-[-0.055em] text-[#2D68F6] drop-shadow-[0_8px_48px_rgba(45,104,246,0.28)] sm:text-[120px] lg:mt-0 lg:text-[200px] lg:leading-[180px]">
                            EARN.
                        </div>
                    </div>

                    <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.30em] text-[#6A7282] sm:mt-4 sm:text-[10px] lg:mt-6 lg:text-[11px]">
                    READ, EARN, SHAPE THE FUTURE
                    </p>
                </div>

                {/* scroll - click scrolls to More Blogs section */}
                <button
                    type="button"
                    onClick={() =>
                        document.getElementById("more-blogs")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="absolute bottom-7 left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-2 opacity-40 transition-opacity hover:opacity-60 lg:bottom-10"
                    aria-label="Scroll to More Blogs"
                >
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#6A7282]">
                        Scroll
                    </span>
                    <div className="flex h-4 w-4 items-center justify-center text-[#6A7282]">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M3 5.5L7 9.5L11 5.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </button>
            </div>
        </section>
    );
}

 