import React, { useMemo } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navbar";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ArrowUpRight, ShoppingCart, Album, Database } from "lucide-react";
import { motion } from "framer-motion";
import xlogo from "@/assets/logo.webp";
import xOctopus from "@/assets/sidebar.webp";
import inkdMark from "@/assets/inkd/ink.svg";
import PollingBottomIcon from "@/assets/polladd.webp";
import { useIsBeforeLg } from "@/hooks/use-mobile";
import tick from "@/assets/tick.webp";
import { GlowCircle } from "./social-media";
import { ASSETS } from "./constants";

const containerVariants = cva("", {
  variants: {
    variant: {
      light: "bg-white text-gray-800",
      dark: "bg-dark-bg text-white",
      accent: "bg-brand text-white",
    },
  },
  defaultVariants: { variant: "dark" },
});

const sidebarVariants = {
  hidden: { x: -40, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
};

const bottomVariants = {
  hidden: { y: 40, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
};

const containerMotion = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

export interface LogoConfig {
  src: string;
  alt?: string;
  href?: string;
}

export interface UserConfig {
  name: string;
  imgSrc: string;
  href?: string;
}

export interface ResponsiveNavProps extends VariantProps<
  typeof containerVariants
> {
  items: NavItem[];
  logo?: LogoConfig | string;
  user?: UserConfig;
  className?: string;
  mobileContent?: React.ReactNode;
  showSidebar?: boolean;
  showTopBar?: boolean;
  showBottomBar?: boolean;
}

function isPathActive(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}

function CustomAddPollIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 21 21"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M9.33813 5.26872V17.2286C9.33813 17.7022 8.96094 18.0843 8.49935 18.0843H6.90092C6.43669 18.0843 6.06213 17.6995 6.06213 17.2286V5.26872C6.06213 4.79517 6.43932 4.41309 6.90092 4.41309H8.49935C8.96358 4.41309 9.33813 4.79517 9.33813 5.26872ZM2.64633 8.82038H0.749913C0.367457 8.82038 0.0588379 9.13518 0.0588379 9.52534V17.382C0.0588379 17.7722 0.36744 18.087 0.749913 18.087H2.64633C3.02878 18.087 3.3374 17.7722 3.3374 17.382V9.52534C3.3374 9.1352 3.02615 8.82038 2.64633 8.82038ZM14.5712 6.56557H12.8357C12.4111 6.56557 12.0655 6.91805 12.0655 7.35124V17.2986C12.0655 17.7318 12.4111 18.0843 12.8357 18.0843H14.5712C14.9959 18.0843 15.3414 17.7318 15.3414 17.2986V7.354C15.3414 6.91812 14.9959 6.56557 14.5712 6.56557Z" />
      <path d="M17.1822 7.02707C16.9601 7.02707 16.7801 6.84701 16.7801 6.62489V0.994459C16.7801 0.772345 16.9601 0.592285 17.1822 0.592285H18.0048C18.2269 0.592285 18.4069 0.772345 18.4069 0.994459V6.62489C18.4069 6.84701 18.2269 7.02707 18.0048 7.02707H17.1822ZM14.7783 4.62311C14.5562 4.62311 14.3761 4.44305 14.3761 4.22094V3.39841C14.3761 3.1763 14.5562 2.99624 14.7783 2.99624H20.4087C20.6308 2.99624 20.8109 3.1763 20.8109 3.39841V4.22094C20.8109 4.44305 20.6308 4.62311 20.4087 4.62311H14.7783Z" />
    </svg>
  );
}

export default function ResponsiveNav({
  items,
  variant,
  logo,
  className,
  mobileContent,
  showSidebar = true,
  showTopBar = true,
  showBottomBar = true,
}: ResponsiveNavProps) {
  const { data: meData } = useApiQuery(endpoints.profile.me);
  const profile = useMemo(() => meData?.data?.data?.profile ?? null, [meData]);
  const isSoulboundActive = Boolean(meData?.data?.data?.soulbound?.isActive);
  const navigate = useNavigate();
  const location = useLocation();

  const isBeforeLg = useIsBeforeLg();
  const showDesktopSidebar = !isBeforeLg;

  const goToProfile = () => navigate("/profile");

  const getItem = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const it of items) if (it.label) map.set(it.label, it);
    return (label: string) => map.get(label);
  }, [items]);

  const desktopNavItems = useMemo(() => {
    const order = [
      "Home",
      "Campaigns",
      "User Polls",
      "Market",
      "Coins",
      "Exchange",
      "Create Campaign",
    ];
    const base = order.map(getItem).filter(Boolean) as NavItem[];

    return base;
  }, [getItem, items]);

  const mobileBottomItems = useMemo(() => {
    const addPollsItem = getItem("Add");
    const userPollsItem = getItem("User Polls");
    const campaignsItem = getItem("Campaigns");
    const marketplaceItem = getItem("Market");
    const exchangeItem = getItem("Exchange");

    return [
      addPollsItem,
      userPollsItem,
      campaignsItem,
      marketplaceItem,
      exchangeItem,
    ].filter(Boolean) as NavItem[];
  }, [getItem]);

  const avatarSrc =
    profile?.apps?.xpoll?.avatar?.imageUrl ??
    (typeof logo === "string" ? logo : logo?.src) ??
    "";
  const username = profile?.apps?.xpoll?.username ?? "User";
  const level = profile?.level ?? 1;

  const SidebarRow = (item: NavItem) => {
    const {
      to,
      label,
      icon: Icon,
      isCustomSvg,
      sidebarImgSrc,
      sidebarIconImgSrc,
      isMarketplace,
      isCoins,
      isBookmarked,
    } = item as NavItem & { sidebarIconImgSrc?: string };

    if (sidebarImgSrc) {
      return (
        <Link to={to}>
          <img
            src={sidebarImgSrc}
            alt={label}
            className="w-[10rem] h-[4rem] hover:shadow-xl rounded-full hover:scale-110 transition-transform duration-300"
          />
        </Link>
      );
    }

    const activeClass = "bg-[#49e6db] font-semibold";
    const idleClass = "hover:bg-[#3bd6cc50]";

    if (isCustomSvg) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex gap-3 px-4 py-3 mr-2 font-medium rounded-full text-neutral-900",
              isActive ? activeClass : "hover:bg-[#35c5bc50]",
            )
          }
        >
          <CustomAddPollIcon className="h-4 w-4" />
          <span className="text-xs lg:text-sm">{label}</span>
        </NavLink>
      );
    }

    if (isCoins) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex gap-3 px-4 py-3 mr-2 font-medium rounded-full text-neutral-900",
              isActive ? activeClass : idleClass,
            )
          }
        >
          <Database className="h-4 w-4" />
          <span>{label}</span>
        </NavLink>
      );
    }

    if (isMarketplace) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex gap-3 px-4 py-3 mr-2 font-medium rounded-full text-neutral-900",
              isActive ? activeClass : idleClass,
            )
          }
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{label}</span>
        </NavLink>
      );
    }

    if (isBookmarked) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 mr-2 font-medium rounded-full text-neutral-900",
              isActive ? activeClass : idleClass,
            )
          }
        >
          <Album className="h-4 w-4" />
          <span>{label}</span>
        </NavLink>
      );
    }

    if (sidebarIconImgSrc) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 mr-2 font-medium rounded-full text-neutral-900",
              isActive ? "bg-[#49e6db] font-semibold text-base" : idleClass,
            )
          }
        >
          <img src={sidebarIconImgSrc} alt={label} className="h-4 w-4" />
          <span>{label}</span>
        </NavLink>
      );
    }

    if (Icon) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 mr-2 font-medium rounded-full text-neutral-900",
              isActive ? "bg-[#49e6db] font-semibold text-base" : idleClass,
            )
          }
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </NavLink>
      );
    }

    return null;
  };

  const BottomTab = (item: NavItem) => {
    const active = isPathActive(location.pathname, item.to);

    const tabClass = cn(
      "flex flex-col items-center text-neutral-900 transition-transform gap-1",
      active ? "scale-105 font-semibold" : "",
    );

    const labelClass = "text-[0.7rem] md:text-[0.9rem]";

    if (item.isCampaigns) {
      const mobileText = item.mobileLabel ?? "Camps";
      return (
        <Link
          to={item.to}
          className={cn(
            "flex flex-col items-center text-neutral-900 relative transition-transform",
            active ? "scale-105" : "",
            "-mt-4 md:-mt-8",
          )}
        >
          {item.bottomImgSrc ? (
            <img
              src={item.bottomImgSrc}
              alt={mobileText}
              className="h-16 md:h-24"
            />
          ) : (
            <div className="h-16 md:h-24 w-16 md:w-24 rounded-full bg-white/50" />
          )}

          <span className="text-[0.68rem] md:text-[0.9rem] font-semibold -mt-2 md:-mt-6">
            {mobileText}
          </span>
        </Link>
      );
    }

    if (item.isCustomSvg) {
      return (
        <Link to={item.to} className={tabClass}>
          <img
            src={PollingBottomIcon}
            alt={item.label || "+polls"}
            className="h-4 w-4 md:w-5 md:h-5"
          />
          <span className={labelClass}>+Polls</span>
        </Link>
      );
    }

    if (item.label === "User Polls") {
      return (
        <Link to={item.to} className={tabClass}>
          {item.bottomImgSrc && (
            <img
              src={item.bottomImgSrc}
              alt={item.label || "User Polls"}
              className="h-4 w-3.5 md:w-5 md:h-5 object-contain"
            />
          )}
          <span className={labelClass}>User Polls</span>
        </Link>
      );
    }

    if (item.isMarketplace) {
      return (
        <Link to={item.to} className={tabClass}>
          <span className="flex flex-col items-center">
            <ShoppingCart className="h-4 w-4 md:w-5 md:h-5" />
            <span className={labelClass}>{item.mobileLabel ?? item.label}</span>
          </span>
        </Link>
      );
    }

    if (item.icon) {
      const Icon = item.icon;
      return (
        <Link to={item.to} className={tabClass}>
          <Icon className="h-4 w-4 md:w-5 md:h-5" />
          <span className={labelClass}>{item.mobileLabel ?? item.label}</span>
        </Link>
      );
    }

    return null;
  };

  const sidebar =
    showSidebar && showDesktopSidebar ? (
      <aside
        className={cn(
          containerVariants({ variant }),
          "flex flex-col justify-between items-start w-44 xl:w-56 h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#25FBEC]",
          className,
        )}
        aria-label="Sidebar"
      >
        <section className="space-y-4 xl:space-y-10 relative z-50 w-full shrink-0">
          <section
            className="flex flex-col space-y-2 cursor-pointer"
            onClick={goToProfile}
          >
            <div className="relative pt-2 w-fit">
              <img
                src={avatarSrc}
                alt={username}
                className="w-14 h-14 rounded-full object-cover object-top border-2 border-white"
              />

              {isSoulboundActive && (
                <img
                  src={tick}
                  alt="Verified"
                  className="absolute top-2 right-0 w-7 h-7 translate-x-1/4 -translate-y-1/4 object-contain"
                  draggable={false}
                />
              )}

              <span className="absolute -bottom-1 left-2 bg-[#00BFA6] text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                LVL {level}
              </span>
            </div>

            <span className="font-semibold text-sm flex items-center gap-1 text-black">
              Hello, {username}! <ArrowUpRight />
            </span>
          </section>

          <motion.nav
            className="flex flex-col gap-1 text-neutral-900 text-xs md:text-sm"
            variants={containerMotion}
            initial="hidden"
            animate="show"
          >
            {desktopNavItems
              .filter((i) => i.label !== "Profile")
              .map((item) => (
                <React.Fragment key={item.to}>
                  {item.label === "Market" && (
                    <motion.div variants={sidebarVariants}>
                      <NavLink
                        to="/inkd"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-4 py-3 mr-2 font-medium rounded-full text-neutral-900",
                            isActive
                              ? "bg-[#49e6db] font-semibold text-base"
                              : "hover:bg-[#3bd6cc50]",
                          )
                        }
                      >
                        <img
                          src={inkdMark}
                          alt="The Inkd"
                          className="h-4 w-4 rounded-sm object-contain"
                        />
                        <span>Inkd</span>
                      </NavLink>
                    </motion.div>
                  )}

                  <motion.div
                    variants={sidebarVariants}
                    className={cn(
                      item.label === "Create Campaign" &&
                        "2xl:w-[190px] w-[150px]",
                    )}
                  >
                    {SidebarRow(item)}
                  </motion.div>
                </React.Fragment>
              ))}
          </motion.nav>
        </section>

        <img
          src={xOctopus}
          alt="Octopus Tactical"
          className="absolute bottom-0 left-5 h-72 xl:h-96 object-contain mix-blend-screen"
        />

        <footer className="relative z-10 flex xl:flex-col justify-between items-start gap-2">
          <Link to="/home" className="h-10 w-fit" aria-label="Home">
            <img
              src={xlogo}
              alt="logo"
              className="h-full w-full object-contain"
            />
          </Link>
          <section className="flex items-center gap-2">
            <GlowCircle
              img={ASSETS.icons.x}
              size="sm"
              onClick={() =>
                window.open("https://x.com/xpollplatform", "_blank")
              }
            />
            <GlowCircle
              img={ASSETS.icons.instagram}
              size="sm"
              onClick={() =>
                window.open(
                  "https://www.instagram.com/xpollplatform/",
                  "_blank",
                )
              }
            />
            <GlowCircle
              img={ASSETS.icons.telegram}
              size="sm"
              onClick={() =>
                window.open("https://t.me/Xpoll_signals/1", "_blank")
              }
            />
          </section>
        </footer>
      </aside>
    ) : null;

  const topBar =
    showTopBar && !showDesktopSidebar ? (
      <main
        className={cn(
          containerVariants({ variant }),
          "w-full h-fit bg-[#F2F3F5] rounded-t-xl",
          className,
        )}
        aria-label="Top navigation"
      >
        <section className="flex items-center justify-between px-6 py-3">
          <section
            className="relative flex items-center space-x-3 cursor-pointer"
            onClick={goToProfile}
          >
            <div className="relative w-fit">
              <img
                src={avatarSrc}
                alt={username}
                className="w-16 h-16 rounded-full object-cover object-top border-2 border-white"
              />

              {isSoulboundActive && (
                <img
                  src={tick}
                  alt="Verified"
                  className="absolute top-0 right-0 w-6 h-6 translate-x-1/4 -translate-y-1/4 object-contain"
                  draggable={false}
                />
              )}

              <span className="absolute -bottom-1 left-3 bg-[#00BFA6] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                LVL {level}
              </span>
            </div>
            <span className="font-bold text-lg text-gray-900">
              Hello, {username}!
            </span>
          </section>

          <Link to="/home" className="h-8 w-8" aria-label="Home">
            <img
              src={xlogo}
              className="w-full h-full object-contain"
              alt="logo"
            />
          </Link>
        </section>
      </main>
    ) : null;

  const bottomBar =
    showBottomBar && !showDesktopSidebar ? (
      <motion.nav
        className={cn(
          containerVariants({ variant }),
          "w-full max-h-[3.75rem] md:max-h-[4.2rem] bg-[#25FBEC] flex items-center justify-around",
          className,
        )}
        aria-label="Bottom navigation"
        variants={containerMotion}
        initial="hidden"
        animate="show"
      >
        {mobileBottomItems.map((item) => (
          <motion.div
            key={item.to}
            variants={bottomVariants}
            className="flex-1 flex justify-center"
          >
            {BottomTab(item)}
          </motion.div>
        ))}
      </motion.nav>
    ) : null;

  return (
    <>
      {sidebar}

      {!showDesktopSidebar && (
        <div className="flex w-full flex-1 flex-col overflow-hidden">
          {topBar}
          <div className="flex-1 h-full min-h-0 overflow-y-auto">
            {mobileContent}
          </div>
          {bottomBar}
        </div>
      )}
    </>
  );
}
