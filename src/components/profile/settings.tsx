import { ChevronRight, Headset, LogOut, Cable } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { ResponsiveModal } from "@/components/commons/responsiveModal";
import logo from "@/assets/logo.webp";

import { appToast } from "@/utils/toast";
interface MenuItem {
  id: "link" | "contact" | "logout";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  warning?: boolean;
  isActive?: boolean;
}

interface Props {
  show: boolean;
  onComplete?: () => void;
}

export function FullScreenLogoutAnimation({ show, onComplete }: Props) {
  useEffect(() => {
    if (show && onComplete) {
      const t = setTimeout(onComplete, 1100); // 1 sec
      return () => clearTimeout(t);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Logo scaling + fade */}
          <motion.img
            src={logo}
            alt="App Logo"
            className="h-32 mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />

          {/* Text fades in/out */}
          <motion.p
            className="text-lg font-semibold text-gray-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 0], y: [10, 0, -10] }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            Logging you out…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout, isLogoutPending } = useAuth();

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [menuItems] = useState<MenuItem[]>([
    {
      id: "link",
      title: "Link Accounts",
      subtitle: "Link your email, X, and google account",
      icon: <Cable className="h-5 w-5" />,
      isActive: true,
    },
    {
      id: "contact",
      title: "Contact us",
      subtitle: "Connect with us for support",
      icon: <Headset className="h-5 w-5" />,
      isActive: true,
    },
    {
      id: "logout",
      title: "Logout",
      subtitle: "",
      icon: <LogOut className="h-5 w-5 text-red-600" />,
      isActive: true,
    },
  ]);

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 12 },
    },
  };

  const handleMenuClick = (item: MenuItem) => {
    switch (item.id) {
      case "link":
        if (item.isActive) navigate("/profile/settings");
        break;
      case "contact":
        if (item.isActive)
          window.open("https://t.me/cryptogeek_ivan", "_blank");
        break;
      case "logout":
        if (item.isActive) setLogoutModalOpen(true);
        break;
      default:
        break;
    }
  };

  const confirmLogout = useCallback(async () => {
    try {
      // setLoggingOut(true);
      await logout();
    } catch (e) {
      appToast.error("Failed to logout");
      console.error(e);
    }
    // finally {
    //   // Fallback: in case onSuccess doesn't run (network hiccup, etc.)
    //   setTimeout(() => window.location.reload(), 100);
    // }
  }, [logout]);

  return (
    <>
      <motion.div
        variants={sectionVariants}
        className="p-2 md:p-4 space-y-2 bg-white rounded-2xl mt-[11rem] md:mt-5"
      >
        {menuItems.map((item) => {
          const disabled = !item.isActive;
          return (
            <section
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`
                flex items-center justify-between p-2 md:p-3 hover:rounded-lg 
                ${
                  disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
                }
                md:hover:bg-white/10
              `}
            >
              <section className="flex items-center gap-3">
                <h2 className="p-2 rounded-full flex items-center justify-center bg-black bg-opacity-5">
                  {item.icon}
                </h2>
                <section>
                  <p className="font-medium">{item.title}</p>
                  {item.subtitle && <p className="text-xs">{item.subtitle}</p>}
                </section>
              </section>

              <ChevronRight className="h-5 w-5" />
            </section>
          );
        })}
      </motion.div>

      {/* Logout Confirmation Modal */}
      <ResponsiveModal
        open={logoutModalOpen}
        onOpenChange={setLogoutModalOpen}
        title="Logout"
        description=" "
        actionLabel={loggingOut ? "Logging out..." : "Confirm Logout"}
        onAction={confirmLogout}
        disabled={loggingOut}
      >
        <p className="text-sm text-black/70">
          Are you sure you want to log out of your account?
        </p>
      </ResponsiveModal>
      {/* at the bottom of Settings() render */}
      {loggingOut && (
        <FullScreenLogoutAnimation
          show={loggingOut}
          // onComplete={() => window.location.reload()}
          onComplete={() => window.location.replace("/login")}
        />
      )}
    </>
  );
}
