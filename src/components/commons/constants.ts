/**
 * Shared media constants.
 *
 * Social icons are bundled locally: production serves them from a CDN, and when
 * that host is unreachable the sidebar social buttons render as broken images.
 *
 * The coin videos below are still remote (prod-storage.xpoll.io). They are large
 * MP4s with no local equivalents, so they are left as-is rather than reworking
 * the Coins page layout to use still images.
 */

import xIcon from "@/assets/x.svg";
import instagramIcon from "@/assets/instagram.svg";
import telegramIcon from "@/assets/telegram.svg";

export const ASSETS = {
  signupBonusModalVideoUrl:
    "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Free%2050%20animations%20v3.mp4",
  vids: {
    coins: {
      xHIGH: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Strain.mp4",
      xAMBIT: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Amy.mp4",
      xSHELL: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Shelly.mp4",
      xTIP: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Snitch.mp4",
      xBCBUBBLE: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Bubble.mp4",
      xST3: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Terranova.mp4",
      xCoffee:
        "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Coffee%20milk.mp4",
      xMason: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/The%20mark.mp4",
      xCure: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Curette.mp4",
      xMeta: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Meta4.mp4",
      xStanMini: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Stanton.mp4",
      xKMini: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/K%20Hat.mp4",
      xScope:
        "https://prod-storage.xpoll.io/xpoll-blob-dump-user/The%20Chart.mp4",
      xSlice: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/The%20cut.mp4",
      xJack: "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Jack.mp4",
      xTerm:
        "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Term%20Coin.mp4",
      xThree:
        "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Three%20coin.mp4",
      xMRT:
        "https://prod-storage.xpoll.io/xpoll-blob-dump-user/Me%20T%20Coin.mp4",
    },
  },
  icons: {
    x: xIcon,
    telegram: telegramIcon,
    instagram: instagramIcon,
    mail: xIcon,
    twitter: xIcon,
  },
};
