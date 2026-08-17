import { Link } from "react-router-dom";

import "./add-campaign.css";

const HERO_PARTICLES: Array<{
  left: string;
  delay: string;
  duration: string;
}> = [
  { left: "8%", delay: "0s", duration: "14s" },
  { left: "18%", delay: "3s", duration: "11s" },
  { left: "32%", delay: "6s", duration: "13s" },
  { left: "47%", delay: "1.5s", duration: "16s" },
  { left: "62%", delay: "4.5s", duration: "12s" },
  { left: "75%", delay: "7.5s", duration: "15s" },
  { left: "88%", delay: "2s", duration: "13.5s" },
  { left: "95%", delay: "9s", duration: "11.5s" },
];

function FlagshipArt() {
  const id = "ac-hub-camp";
  return (
    <svg viewBox="0 0 360 320" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={`${id}-g1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0CECDA" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#1E5EFF" />
        </linearGradient>
        <linearGradient id={`${id}-g2`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#1E5EFF" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="14"
            floodColor="#0B2A6B"
            floodOpacity="0.12"
          />
        </filter>
      </defs>
      <g
        transform="translate(190 92) rotate(-6)"
        filter={`url(#${id}-shadow)`}
      >
        <rect
          x="-90"
          y="-60"
          width="180"
          height="120"
          rx="14"
          fill="#ffffff"
          stroke="#DCE5EE"
        />
        <rect x="-78" y="-46" width="84" height="8" rx="3" fill="#ECF1F6" />
        <rect x="-78" y="-30" width="56" height="6" rx="2" fill="#ECF1F6" />
        <rect x="-78" y="-12" width="120" height="20" rx="6" fill="#F2F7FC" />
        <rect
          x="-78"
          y="-12"
          width="86"
          height="20"
          rx="6"
          fill={`url(#${id}-g2)`}
        />
        <rect x="-78" y="14" width="120" height="20" rx="6" fill="#F2F7FC" />
        <rect
          x="-78"
          y="14"
          width="46"
          height="20"
          rx="6"
          fill={`url(#${id}-g2)`}
          opacity="0.55"
        />
        <rect x="-78" y="40" width="120" height="20" rx="6" fill="#F2F7FC" />
        <rect
          x="-78"
          y="40"
          width="22"
          height="20"
          rx="6"
          fill={`url(#${id}-g2)`}
          opacity="0.3"
        />
      </g>
      <g transform="translate(150 178)" filter={`url(#${id}-shadow)`}>
        <rect
          x="-110"
          y="-80"
          width="220"
          height="160"
          rx="18"
          fill="#ffffff"
          stroke="#DCE5EE"
        />
        <rect
          x="-110"
          y="-80"
          width="220"
          height="42"
          rx="18"
          fill={`url(#${id}-g1)`}
        />
        <rect x="-110" y="-50" width="220" height="12" fill={`url(#${id}-g1)`} />
        <circle cx="-86" cy="-58" r="11" fill="#ffffff" opacity="0.92" />
        <text
          x="-86"
          y="-54"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="800"
          fill="#0B2A6B"
        >
          X
        </text>
        <rect x="-66" y="-66" width="68" height="6" rx="2" fill="#ffffff" opacity="0.8" />
        <rect x="-66" y="-54" width="42" height="4" rx="1.5" fill="#ffffff" opacity="0.55" />
        <circle cx="92" cy="-59" r="3" fill="#10B981" />
        <g transform="translate(-86 -22)">
          <rect x="0" y="14" width="172" height="6" rx="3" fill="#ECF1F6" />
          <rect
            x="0"
            y="14"
            width="138"
            height="6"
            rx="3"
            fill={`url(#${id}-g2)`}
          />
          <text
            x="-2"
            y="10"
            fontFamily="JetBrains Mono, monospace"
            fontSize="8"
            fill="#5b6573"
            letterSpacing="0.06em"
          >
            YES · 80%
          </text>
          <rect x="0" y="38" width="172" height="6" rx="3" fill="#ECF1F6" />
          <rect
            x="0"
            y="38"
            width="56"
            height="6"
            rx="3"
            fill="#1E5EFF"
            opacity="0.7"
          />
          <text
            x="-2"
            y="34"
            fontFamily="JetBrains Mono, monospace"
            fontSize="8"
            fill="#5b6573"
            letterSpacing="0.06em"
          >
            MAYBE · 33%
          </text>
          <rect x="0" y="62" width="172" height="6" rx="3" fill="#ECF1F6" />
          <rect
            x="0"
            y="62"
            width="22"
            height="6"
            rx="3"
            fill="#0B2A6B"
            opacity="0.5"
          />
          <text
            x="-2"
            y="58"
            fontFamily="JetBrains Mono, monospace"
            fontSize="8"
            fill="#5b6573"
            letterSpacing="0.06em"
          >
            NO · 13%
          </text>
        </g>
      </g>
      <g transform="translate(282 84)" filter={`url(#${id}-shadow)`}>
        <circle r="28" fill={`url(#${id}-g1)`} />
        <circle r="22" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.55" />
        <text
          y="3"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="800"
          fill="#ffffff"
          letterSpacing="0.04em"
        >
          +0.024
        </text>
        <text
          y="13"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="7"
          fill="rgba(255,255,255,0.78)"
          letterSpacing="0.1em"
        >
          ETH
        </text>
      </g>
      <circle cx="60" cy="60" r="2.5" fill="#00D4FF" opacity="0.5" />
      <circle cx="320" cy="200" r="1.8" fill="#1E5EFF" opacity="0.4" />
      <circle cx="40" cy="220" r="1.8" fill="#00D4FF" opacity="0.35" />
      <circle cx="300" cy="40" r="2" fill="#0CECDA" opacity="0.5" />
    </svg>
  );
}

function PollArt() {
  const id = "ac-hub-poll";
  return (
    <svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={`${id}-g1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0CECDA" />
          <stop offset="100%" stopColor="#1E5EFF" />
        </linearGradient>
      </defs>
      <g transform="translate(110 100)">
        <circle r="64" fill="none" stroke="#ECF1F6" strokeWidth="12" />
        <circle
          r="64"
          fill="none"
          stroke={`url(#${id}-g1)`}
          strokeWidth="12"
          strokeDasharray="330 402"
          strokeDashoffset="80"
          strokeLinecap="round"
          transform="rotate(-90)"
        />
        <text
          y="-2"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="30"
          fontWeight="700"
          fill="#0a1220"
          letterSpacing="-0.025em"
        >
          82%
        </text>
        <text
          y="18"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          fill="#5b6573"
          letterSpacing="0.16em"
        >
          YES
        </text>
      </g>
      <circle cx="178" cy="44" r="4" fill="#00D4FF" />
      <circle
        cx="178"
        cy="44"
        r="9"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1"
        opacity="0.4"
      />
      <circle cx="40" cy="158" r="3" fill="#0CECDA" opacity="0.55" />
    </svg>
  );
}

export default function AddCampaignPage() {
  return (
    <div className="add-campaign-page w-full min-h-0 hidden lg:block">
      <main className="ac-main">
        <div className="topbar">
          <div className="topbar-crumbs" />
          <div className="head-actions">
            <a className="btn-ghost" href="https://t.me/ivan_sriv" target="_blank">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Get help
            </a>
          </div>
        </div>

        <div className="bento">
          <article className="card hero-tile span-12">
            <div className="hero-mist" aria-hidden>
              <span className="m1" />
              <span className="m2" />
              <span className="m3" />
            </div>
            <div className="hero-particles" aria-hidden>
              {HERO_PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className="hero-particle"
                  style={{
                    left: p.left,
                    bottom: "-10px",
                    animationDelay: p.delay,
                    animationDuration: p.duration,
                  }}
                />
              ))}
            </div>
            <div className="hero-tile-text">
              <span className="eyebrow">Ask anything · Earn everything</span>
              <h2>
                Your community&apos;s voice, <span className="serif">turned into capital</span>.
              </h2>
              <p className="hero-sub">
                Launch a campaign, invite your community, and earn from every
                response. Your audience gets paid in tokens. You get the signal.
              </p>
              <div className="hero-actions">
                <Link to="/campaigns/create" className="btn-primary no-underline">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                  Launch your first campaign
                </Link>
              </div>
            </div>
          </article>

          <article className="card flow-tile span-12">
            <div className="flow-head">
              <span className="eyebrow">How it works</span>
              <h3 className="flow-title">
                From <span className="serif">question</span> to{" "}
                <span className="serif">capital</span> - in four steps.
              </h3>
            </div>
            <ol className="flow-steps" role="list">
              <li className="flow-step">
                <div className="flow-step-num">01</div>
                <div className="flow-step-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <div className="flow-step-text">
                  <div className="flow-step-title">Create a campaign</div>
                  <div className="flow-step-sub">Frame your question. Set the reward.</div>
                </div>
              </li>
              <li className="flow-step">
                <div className="flow-step-num">02</div>
                <div className="flow-step-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 11h-6M19 8v6" />
                  </svg>
                </div>
                <div className="flow-step-text">
                  <div className="flow-step-title">Invite your community</div>
                  <div className="flow-step-sub">Share the link. Bring your people in.</div>
                </div>
              </li>
              <li className="flow-step">
                <div className="flow-step-num">03</div>
                <div className="flow-step-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" />
                  </svg>
                </div>
                <div className="flow-step-text">
                  <div className="flow-step-title">Pull your community</div>
                  <div className="flow-step-sub">Responses flow in. Signal sharpens.</div>
                </div>
              </li>
              <li className="flow-step flow-step-final">
                <div className="flow-step-num">04</div>
                <div className="flow-step-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="flow-step-text">
                  <div className="flow-step-title">Earn</div>
                  <div className="flow-step-sub">
                    Tokens go straight to your audience&apos;s wallets.
                  </div>
                </div>
              </li>
            </ol>
          </article>

          <Link
            to="/campaigns/create"
            className="card action-card flagship tappable span-7 no-underline text-inherit"
            aria-label="Create Campaign"
          >
            <div className="card-art flagship-art" aria-hidden>
              <FlagshipArt />
            </div>
            <div className="action-card-inner">
              <span className="action-tag">Most popular</span>
              <div className="action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 22 21 4M14 4h7v7" />
                  <circle cx="6" cy="18" r="3" />
                </svg>
              </div>
              <h3>
                Create a <span className="serif">campaign</span>
              </h3>
              <p>
                The full experience. Reward voters, gate by audience, send tokens
                straight to wallets - automatically.
              </p>
              <span className="action-cta">
                Start a campaign
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>

          <Link
            to="/add-polls/basic-info"
            className="card action-card compact tappable span-5 no-underline text-inherit"
            aria-label="Create Poll"
          >
            <div className="card-art" aria-hidden>
              <PollArt />
            </div>
            <div className="action-card-inner">
              <span className="action-tag">
                Quick · <span className="tag-num">60s</span>
              </span>
              <div className="action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <h3>
                Create a <span className="serif">poll</span>
              </h3>
              <p>
                One question, instant pulse - perfect for testing an idea before
                scaling.
              </p>
              <span className="action-cta subtle">
                Ask a question
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
