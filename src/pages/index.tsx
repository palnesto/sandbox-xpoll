import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

import heroVideo from "@/assets/hero-tentacle.mp4";
import heroNetworkPoster from "@/assets/hero-network.png";
import activationSeed from "@/assets/activation-seed.png";

import "./auth-landing.css";
import { ASSETS } from "@/components/commons/constants";
import { GlowCircle } from "@/components/commons/circle-button";

const BRAND_LOGO_SVG = `
  <svg class="brand-logo" viewBox="0 0 228.31 233.65" xmlns="http://www.w3.org/2000/svg">
    <path fill="#00D4FF" d="M223.68,139.03l-.1-.16c-8.81-15.12-28.08-22.51-45.01-18.62-21.56,4.56-34.45,22.61-49.26,37.16-10.37,10.05-21.98,20.62-36.67,23.47-7.18,1.39-15.02,1.33-22.23-.64l-.77-.22c-5.5-1.62-10.61-4.38-14.72-8.51-8.32-9.17-11.79-22.45-11.56-34.49.28-14.68,10.1-26.54,20.16-36.65,5.52-5.31,11.69-10.63,16.62-16.51,6.66-8.35,9.52-19.1,12.72-29.29,2.79-11.21,2.13-23.86-3.78-34C80.33,5.07,60.71-3.29,43.54,1.22c-13.74,3.51-27.23,17.22-26.41,32.32.3,6.4,3.43,12.94,8.64,16.22,2.88,1.85,6.99,2.85,10.27,2.19,3.19-.93-2.4-4.45-3.73-6.26-1.47-1.56-2.74-3.49-3.32-5.81-1.53-5.78.75-12.33,4.77-16.61,9.55-10.49,27.57-5.79,32.45,7.06,4.61,10.83.01,23.89-7.86,32.22-10.43,11.5-24.4,19.37-34.06,31.66-14.1,16.58-19.89,38.71-16.35,60.3,2.77,21.05,14.96,40.63,33.62,50.95,7.91,4.28,15.65,7.89,24.66,10.83,7.99,2.61,13.96,3.23,21.92,1.9,4.61-.68,9.52-1.2,14.14-2.84,3.34-1.14,6.55-2.74,9.72-4.27,4.66-2.36,9.68-4.25,13.61-7.59,2.63-2.28,5.25-4.27,7.86-6.58,3.27-2.99,7.13-6.32,10.16-9.79,1.7-1.92,3.33-3.7,4.86-5.74,4.68-6.47,11.08-12.13,16.22-18.48,2.62-3.27,5.14-6.36,8.13-9.23,8.06-9.42,17.57-16.84,29.73-9.19,12.25,7.49,12.56,27.16-.43,33.9-1.49,1.25-11.16,3.03-9.3,4.98,3.6,2.78,10.81,3.29,15.47,1.88,18.92-5.23,25.26-30.44,15.36-46.21Z"/>
    <path fill="#fff" d="M161.46,169.33c-.78.77-10.68,10.58-12.85,13.77-2.45,3.6-8.99,9.87-8.99,9.87,10.59,15.25,20.88,30.19,28.2,40.68h40.36l-46.72-64.32Z"/>
    <path fill="#fff" d="M124.27,118.14L206.19,8.64s-36.79,0-36.79,0l-65.92,93.88-16.81-26.33s-4.21,9.66-20.07,22.46l15.71,21.17-32.17,44.49-23.03,31.85L0,233.65s39.96,0,39.96,0c3.79-6.05,8.73-13.57,14.2-21.79l21.48-32.04c10.62-15.88,20.48-30.88,25.86-40.31,4.56,5.95,10.73,14.47,17.61,24.17l9.72-8.42c.25-.22.49-.44.72-.68l12.1-12.52-17.37-23.92Z"/>
  </svg>`;

const HERO_BG_HTML = `
  <div class="hero-bg">
    <div class="hero-grid"></div>
    <svg class="hero-network-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="dotGlow">
          <stop offset="0%" stop-color="#00D4FF" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#00D4FF" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="lineFade" x1="0" x2="1">
          <stop offset="0%" stop-color="#00D4FF" stop-opacity="0"/>
          <stop offset="50%" stop-color="#00D4FF" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#1E5EFF" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g stroke="url(#lineFade)" stroke-width="0.8" fill="none" opacity="0.5">
        <line x1="180" y1="180" x2="380" y2="120"/>
        <line x1="380" y1="120" x2="540" y2="280"/>
        <line x1="540" y1="280" x2="320" y2="420"/>
        <line x1="320" y1="420" x2="180" y2="180"/>
        <line x1="540" y1="280" x2="780" y2="180"/>
        <line x1="780" y1="180" x2="980" y2="320"/>
        <line x1="980" y1="320" x2="1180" y2="240"/>
        <line x1="1180" y1="240" x2="1380" y2="360"/>
        <line x1="1380" y1="360" x2="1240" y2="520"/>
        <line x1="1240" y1="520" x2="1040" y2="600"/>
        <line x1="1040" y1="600" x2="800" y2="540"/>
        <line x1="800" y1="540" x2="600" y2="640"/>
        <line x1="600" y1="640" x2="380" y2="700"/>
        <line x1="380" y1="700" x2="220" y2="580"/>
        <line x1="220" y1="580" x2="320" y2="420"/>
      </g>
      <g>
        <circle cx="180" cy="180" r="3" fill="#00D4FF" opacity="0.8"/>
        <circle cx="180" cy="180" r="14" fill="url(#dotGlow)" opacity="0.4"/>
        <circle cx="380" cy="120" r="2" fill="#00D4FF" opacity="0.6"/>
        <circle cx="540" cy="280" r="3" fill="#1E5EFF" opacity="0.7"/>
        <circle cx="540" cy="280" r="12" fill="url(#dotGlow)" opacity="0.3"/>
        <circle cx="320" cy="420" r="2" fill="#00D4FF" opacity="0.5"/>
        <circle cx="780" cy="180" r="2.5" fill="#00D4FF" opacity="0.7"/>
        <circle cx="980" cy="320" r="3" fill="#1E5EFF" opacity="0.8"/>
        <circle cx="980" cy="320" r="14" fill="url(#dotGlow)" opacity="0.3"/>
        <circle cx="1180" cy="240" r="2" fill="#00D4FF" opacity="0.6"/>
        <circle cx="1380" cy="360" r="3" fill="#1E5EFF" opacity="0.7"/>
        <circle cx="1240" cy="520" r="2.5" fill="#00D4FF" opacity="0.6"/>
        <circle cx="1040" cy="600" r="2" fill="#1E5EFF" opacity="0.5"/>
        <circle cx="800" cy="540" r="3" fill="#00D4FF" opacity="0.8"/>
        <circle cx="800" cy="540" r="12" fill="url(#dotGlow)" opacity="0.4"/>
        <circle cx="600" cy="640" r="2" fill="#1E5EFF" opacity="0.5"/>
        <circle cx="380" cy="700" r="2.5" fill="#00D4FF" opacity="0.6"/>
        <circle cx="220" cy="580" r="2" fill="#00D4FF" opacity="0.5"/>
      </g>
    </svg>
  </div>`;

const HERO_FLOWLINE_HTML = `
  <svg class="hero-flowline" viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="flowlineGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#00D4FF" stop-opacity="0"/>
        <stop offset="20%" stop-color="#00D4FF" stop-opacity="0.4"/>
        <stop offset="50%" stop-color="#1E5EFF" stop-opacity="0.55"/>
        <stop offset="80%" stop-color="#0036D7" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#0036D7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path class="flow-1" d="M 0 100 Q 400 60, 800 100 T 1600 100"/>
    <path class="flow-2" d="M 0 110 Q 400 150, 800 110 T 1600 110"/>
    <path class="flow-3" d="M 0 90 Q 400 70, 800 90 T 1600 90"/>
  </svg>`;

const TICKER_HTML = `
  <div class="ticker-wrap">
    <div class="ticker">
      <div class="ticker-item"><span class="dot"></span>Idea launched</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
      <div class="ticker-item"><span class="dot"></span>Signal captured</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
      <div class="ticker-item"><span class="dot"></span>Community formed</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
      <div class="ticker-item"><span class="dot"></span>Capital unlocked</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
      <div class="ticker-item"><span class="dot"></span>Idea launched</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
      <div class="ticker-item"><span class="dot"></span>Signal captured</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
      <div class="ticker-item"><span class="dot"></span>Community formed</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
      <div class="ticker-item"><span class="dot"></span>Capital unlocked</div>
      <div class="ticker-item"><span class="arrow">→</span></div>
    </div>
  </div>`;

const PATHWAY_SECTION_HTML = `
<section id="pathway" class="pathway">
  <div class="container">
    <div class="section-head">
      <div class="chapter-mark"><span class="roman">I</span> The journey</div>
      <span class="eyebrow">The pathway</span>
      <h2 class="h-section" style="margin-top: 24px;">From idea to capital <span class="serif">in four moves.</span></h2>
      <p class="lede">A single system that takes you from the first signal to a funded enterprise.</p>
    </div>

    <div class="pathway-banner">
      <svg class="pathway-banner-svg" viewBox="0 0 1536 520" preserveAspectRatio="none">
        <defs>
          <linearGradient id="streamGradTop" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#00D4FF" stop-opacity="0.4"/>
            <stop offset="50%" stop-color="#1E5EFF" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#00D4FF" stop-opacity="0.6"/>
          </linearGradient>
          <linearGradient id="streamGradMid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#00D4FF"/>
            <stop offset="50%" stop-color="#1E5EFF"/>
            <stop offset="100%" stop-color="#00D4FF"/>
          </linearGradient>
          <linearGradient id="streamGradBottom" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#00D4FF" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#1E5EFF" stop-opacity="0.7"/>
          </linearGradient>
        </defs>

        <path class="stream-line s1" d="M 0 220 Q 384 180, 768 240 T 1536 220"/>
        <path class="stream-line s2" d="M 0 260 Q 384 280, 768 260 T 1536 260"/>
        <path class="stream-line s3" d="M 0 300 Q 384 340, 768 280 T 1536 300"/>

        <circle class="star" cx="200" cy="120" r="1.5" style="animation-delay: 0s;"/>
        <circle class="star" cx="380" cy="80" r="1" style="animation-delay: 0.4s;"/>
        <circle class="star" cx="560" cy="160" r="2" style="animation-delay: 0.8s;"/>
        <circle class="star" cx="740" cy="100" r="1.2" style="animation-delay: 1.2s;"/>
        <circle class="star" cx="920" cy="140" r="1.5" style="animation-delay: 1.6s;"/>
        <circle class="star" cx="1100" cy="90" r="1" style="animation-delay: 2.0s;"/>
        <circle class="star" cx="1280" cy="150" r="2" style="animation-delay: 2.4s;"/>
        <circle class="star" cx="1420" cy="110" r="1.4" style="animation-delay: 2.8s;"/>
        <circle class="star" cx="320" cy="380" r="1.2" style="animation-delay: 0.6s;"/>
        <circle class="star" cx="640" cy="420" r="1.5" style="animation-delay: 1.0s;"/>
        <circle class="star" cx="980" cy="400" r="1" style="animation-delay: 1.4s;"/>
        <circle class="star" cx="1240" cy="380" r="1.8" style="animation-delay: 1.8s;"/>
      </svg>

      <div class="pathway-spark"></div>

      <div class="pathway-waypoints">
        <div class="pathway-waypoint">
          <div class="wp-orb">
            <svg class="wp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>
            </svg>
          </div>
          <div class="wp-label">Idea</div>
        </div>
        <div class="pathway-waypoint">
          <div class="wp-orb">
            <svg class="wp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12h3l3-9 4 18 3-9h7"/>
            </svg>
          </div>
          <div class="wp-label">Signal</div>
        </div>
        <div class="pathway-waypoint">
          <div class="wp-orb">
            <svg class="wp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <circle cx="5" cy="6" r="2"/>
              <circle cx="19" cy="6" r="2"/>
              <circle cx="5" cy="18" r="2"/>
              <circle cx="19" cy="18" r="2"/>
              <line x1="12" y1="12" x2="5" y2="6"/>
              <line x1="12" y1="12" x2="19" y2="6"/>
              <line x1="12" y1="12" x2="5" y2="18"/>
              <line x1="12" y1="12" x2="19" y2="18"/>
            </svg>
          </div>
          <div class="wp-label">Community</div>
        </div>
        <div class="pathway-waypoint">
          <div class="wp-orb">
            <svg class="wp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 17l6-6 4 4 8-8"/>
              <path d="M14 7h7v7"/>
            </svg>
          </div>
          <div class="wp-label">Capital</div>
        </div>
      </div>
    </div>

    <div class="pathway-flow">
      <div class="pathway-spine"></div>

      <div class="pathway-step">
        <div class="step-rail">
          <span class="step-node"></span>
          <div class="step-num">01<span class="label">LAUNCH</span></div>
        </div>
        <div class="step-content">
          <h3>Launch a campaign.</h3>
          <p>Turn your business idea into a structured, testable campaign that real people can engage with.</p>
        </div>
        <div class="step-viz viz-launch">
          <svg width="100%" height="120" viewBox="0 0 320 120" fill="none" style="position: relative; z-index: 1;">
            <circle class="seed-node" cx="50" cy="60" r="20" fill="#00D4FF" opacity="0.18"/>
            <circle class="seed-node" cx="50" cy="60" r="6" fill="#00D4FF"/>
            <line class="branch-line b1" x1="50" y1="60" x2="160" y2="40" stroke="#00D4FF" stroke-width="1.4" opacity="0.6"/>
            <line class="branch-line b2" x1="50" y1="60" x2="160" y2="60" stroke="#00D4FF" stroke-width="1.4" opacity="0.6"/>
            <line class="branch-line b3" x1="50" y1="60" x2="160" y2="80" stroke="#00D4FF" stroke-width="1.4" opacity="0.6"/>
            <circle class="branch-end e1" cx="160" cy="40" r="4" fill="#1E5EFF" opacity="0.7"/>
            <circle class="branch-end e2" cx="160" cy="60" r="4" fill="#1E5EFF" opacity="0.8"/>
            <circle class="branch-end e3" cx="160" cy="80" r="4" fill="#1E5EFF" opacity="0.7"/>
            <line class="branch-line b4" x1="160" y1="40" x2="270" y2="30" stroke="#0a1220" stroke-width="0.8" opacity="0.4"/>
            <line class="branch-line b5" x1="160" y1="60" x2="270" y2="60" stroke="#0a1220" stroke-width="0.8" opacity="0.4"/>
            <line class="branch-line b6" x1="160" y1="80" x2="270" y2="90" stroke="#0a1220" stroke-width="0.8" opacity="0.4"/>
            <circle class="branch-end e4" cx="270" cy="30" r="3" fill="#0a1220" opacity="0.5"/>
            <circle class="branch-end e5" cx="270" cy="60" r="3" fill="#0a1220" opacity="0.6"/>
            <circle class="branch-end e6" cx="270" cy="90" r="3" fill="#0a1220" opacity="0.5"/>
          </svg>
        </div>
      </div>

      <div class="pathway-step">
        <div class="step-rail">
          <span class="step-node"></span>
          <div class="step-num">02<span class="label">CAPTURE</span></div>
        </div>
        <div class="step-content">
          <h3>Capture real signal.</h3>
          <p>Collect validated market feedback, sentiment, and demand from people who actually care.</p>
        </div>
        <div class="step-viz viz-capture">
          <svg width="100%" height="120" viewBox="0 0 320 120" fill="none" style="position: relative; z-index: 1;">
            <path d="M 20 60 Q 40 30, 60 60 T 100 60 T 140 60 T 180 60 T 220 60 T 260 60 T 300 60" stroke="#00D4FF" stroke-width="2" fill="none" opacity="0.8"/>
            <path d="M 20 60 Q 40 80, 60 60 T 100 60 T 140 60 T 180 60 T 220 60 T 260 60 T 300 60" stroke="#1E5EFF" stroke-width="1.5" fill="none" opacity="0.5"/>
            <line x1="20" y1="60" x2="300" y2="60" stroke="#0a1220" stroke-width="0.5" opacity="0.15" stroke-dasharray="2,4"/>
            <circle class="wave-anchor w1" cx="60" cy="60" r="3" fill="#00D4FF"/>
            <circle class="wave-anchor w2" cx="140" cy="60" r="3" fill="#00D4FF"/>
            <circle class="wave-anchor w3" cx="220" cy="60" r="3" fill="#00D4FF"/>
            <circle class="wave-anchor w4" cx="300" cy="60" r="4" fill="#1E5EFF"/>
            <circle cx="300" cy="60" r="12" fill="#1E5EFF" opacity="0.2"/>
          </svg>
        </div>
      </div>

      <div class="pathway-step">
        <div class="step-rail">
          <span class="step-node"></span>
          <div class="step-num">03<span class="label">BUILD</span></div>
        </div>
        <div class="step-content">
          <h3>Build your community.</h3>
          <p>Convert participants into supporters, users, and customers who shape what you build next.</p>
        </div>
        <div class="step-viz viz-build">
          <svg width="100%" height="120" viewBox="0 0 320 120" fill="none" style="position: relative; z-index: 1;">
            <g opacity="0.3">
              <line x1="160" y1="60" x2="100" y2="40" stroke="#1E5EFF" stroke-width="0.5"/>
              <line x1="160" y1="60" x2="220" y2="40" stroke="#1E5EFF" stroke-width="0.5"/>
              <line x1="160" y1="60" x2="80" y2="80" stroke="#1E5EFF" stroke-width="0.5"/>
              <line x1="160" y1="60" x2="240" y2="80" stroke="#1E5EFF" stroke-width="0.5"/>
              <line x1="160" y1="60" x2="160" y2="20" stroke="#1E5EFF" stroke-width="0.5"/>
              <line x1="160" y1="60" x2="160" y2="100" stroke="#1E5EFF" stroke-width="0.5"/>
              <line x1="160" y1="60" x2="60" y2="60" stroke="#1E5EFF" stroke-width="0.5"/>
              <line x1="160" y1="60" x2="260" y2="60" stroke="#1E5EFF" stroke-width="0.5"/>
            </g>
            <circle class="orbit-ring r1" cx="160" cy="60" r="22" fill="none" stroke="#1E5EFF" stroke-width="0.6" opacity="0.4" stroke-dasharray="4 6"/>
            <circle class="orbit-ring r2" cx="160" cy="60" r="40" fill="none" stroke="#00D4FF" stroke-width="0.4" opacity="0.3" stroke-dasharray="2 8"/>
            <g class="core-orb">
              <circle cx="160" cy="60" r="14" fill="#1E5EFF" opacity="0.2"/>
              <circle cx="160" cy="60" r="8" fill="#1E5EFF"/>
            </g>
            <circle class="satellite s1" cx="100" cy="40" r="4" fill="#00D4FF"/>
            <circle class="satellite s2" cx="220" cy="40" r="4" fill="#00D4FF"/>
            <circle class="satellite s3" cx="80" cy="80" r="4" fill="#00D4FF"/>
            <circle class="satellite s4" cx="240" cy="80" r="4" fill="#00D4FF"/>
            <circle class="satellite s5" cx="160" cy="20" r="4" fill="#00D4FF"/>
            <circle class="satellite s6" cx="160" cy="100" r="4" fill="#00D4FF"/>
            <circle class="satellite s7" cx="60" cy="60" r="3" fill="#00D4FF"/>
            <circle class="satellite s8" cx="260" cy="60" r="3" fill="#00D4FF"/>
          </svg>
        </div>
      </div>

      <div class="pathway-step">
        <div class="step-rail">
          <span class="step-node"></span>
          <div class="step-num">04<span class="label">UNLOCK</span></div>
        </div>
        <div class="step-content">
          <h3>Unlock capital.</h3>
          <p>Activate tokenized, non-dilutive funding when your signal is validated and your community is real.</p>
        </div>
        <div class="step-viz viz-unlock">
          <svg width="100%" height="120" viewBox="0 0 320 120" fill="none" style="position: relative; z-index: 1;">
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#00D4FF"/>
                <stop offset="100%" stop-color="#1E5EFF"/>
              </linearGradient>
              <linearGradient id="barGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#00D4FF" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#1E5EFF" stop-opacity="0.7"/>
              </linearGradient>
            </defs>
            <rect class="bar-rect b1" x="40" y="80" width="32" height="20" fill="url(#barGradLight)" opacity="0.6" rx="3"/>
            <rect class="bar-rect b2" x="80" y="65" width="32" height="35" fill="url(#barGradLight)" opacity="0.7" rx="3"/>
            <rect class="bar-rect b3" x="120" y="50" width="32" height="50" fill="url(#barGradLight)" opacity="0.8" rx="3"/>
            <rect class="bar-rect b4" x="160" y="35" width="32" height="65" fill="url(#barGradLight)" opacity="0.9" rx="3"/>
            <rect class="bar-rect b5" x="200" y="20" width="32" height="80" fill="url(#barGrad)" rx="3"/>
            <rect class="bar-rect b6" x="240" y="10" width="32" height="90" fill="url(#barGrad)" rx="3"/>
            <line x1="20" y1="100" x2="290" y2="100" stroke="#fff" stroke-width="0.5" opacity="0.2"/>
            <g class="arrow-up">
              <path d="M 280 30 L 280 18 M 274 24 L 280 18 L 286 24" stroke="#00D4FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </div>
</section>`;

const AUDIENCE_SECTION_HTML = `
<section id="audience" class="audience">
  <div class="container">
    <div class="section-head">
      <div class="chapter-mark"><span class="roman">II</span> The fit</div>
      <span class="eyebrow">Who it's for</span>
      <h2 class="h-section" style="margin-top: 24px;">Whatever stage you're in, <span class="serif">XPoll meets you there.</span></h2>
    </div>

    <div class="audience-grid">
      <div class="audience-col">
        <div class="aud-tag">If you're building</div>
        <h3>Validate before <em>you spend.</em></h3>
        <ul>
          <li><span class="num">01</span><span>Test product-market fit before spending real capital.</span></li>
          <li><span class="num">02</span><span>Discover hidden demand and overlooked revenue channels.</span></li>
          <li><span class="num">03</span><span>Validate messaging with real users — not assumptions.</span></li>
        </ul>
      </div>
      <div class="audience-col">
        <div class="aud-tag">If you're scaling</div>
        <h3>Convert audience <em>into leverage.</em></h3>
        <ul>
          <li><span class="num">01</span><span>Turn your audience into an active economic network.</span></li>
          <li><span class="num">02</span><span>Generate structured data investors actually value.</span></li>
          <li><span class="num">03</span><span>Build leverage before raising capital.</span></li>
        </ul>
      </div>
      <div class="audience-col">
        <div class="aud-tag">If you need funding</div>
        <h3>Skip the <em>dilution trap.</em></h3>
        <ul>
          <li><span class="num">01</span><span>Prepare your business with real traction data.</span></li>
          <li><span class="num">02</span><span>Unlock non-dilutive funding pathways.</span></li>
          <li><span class="num">03</span><span>Transition seamlessly into tokenized capital strategies.</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>`;

const PROOF_SECTION_HTML = `
<section class="proof">
  <svg class="proof-tentacles" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="proofTentacleGrad1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#00D4FF" stop-opacity="0"/>
        <stop offset="50%" stop-color="#00D4FF" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#1E5EFF" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="proofTentacleGrad2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#1E5EFF" stop-opacity="0"/>
        <stop offset="50%" stop-color="#0036D7" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#00D4FF" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path class="pt-1" d="M 0 200 Q 400 100, 800 250 T 1600 180"/>
    <path class="pt-2" d="M 0 450 Q 350 600, 800 480 T 1600 520"/>
    <path class="pt-3" d="M 0 700 Q 400 800, 800 700 T 1600 750"/>
    <path class="pt-4" d="M 0 350 Q 500 200, 1000 380 Q 1300 480, 1600 350"/>
    <circle class="pt-star" cx="120" cy="150" r="1.5" style="animation-delay: 0s;"/>
    <circle class="pt-star" cx="320" cy="80" r="1" style="animation-delay: 0.4s;"/>
    <circle class="pt-star" cx="540" cy="220" r="2" style="animation-delay: 0.8s;"/>
    <circle class="pt-star" cx="760" cy="120" r="1.2" style="animation-delay: 1.2s;"/>
    <circle class="pt-star" cx="980" cy="180" r="1.5" style="animation-delay: 1.6s;"/>
    <circle class="pt-star" cx="1200" cy="80" r="1" style="animation-delay: 2.0s;"/>
    <circle class="pt-star" cx="1420" cy="190" r="2" style="animation-delay: 2.4s;"/>
    <circle class="pt-star" cx="180" cy="380" r="1.2" style="animation-delay: 0.2s;"/>
    <circle class="pt-star" cx="420" cy="540" r="1.5" style="animation-delay: 0.6s;"/>
    <circle class="pt-star" cx="680" cy="600" r="1" style="animation-delay: 1.0s;"/>
    <circle class="pt-star" cx="940" cy="640" r="1.8" style="animation-delay: 1.4s;"/>
    <circle class="pt-star" cx="1180" cy="580" r="1.4" style="animation-delay: 1.8s;"/>
    <circle class="pt-star" cx="1400" cy="660" r="1.2" style="animation-delay: 2.2s;"/>
    <circle class="pt-star" cx="80" cy="780" r="1.5" style="animation-delay: 0.3s;"/>
    <circle class="pt-star" cx="380" cy="820" r="1" style="animation-delay: 0.7s;"/>
    <circle class="pt-star" cx="640" cy="780" r="2" style="animation-delay: 1.1s;"/>
    <circle class="pt-star" cx="920" cy="800" r="1.4" style="animation-delay: 1.5s;"/>
    <circle class="pt-star" cx="1240" cy="820" r="1.5" style="animation-delay: 1.9s;"/>
    <circle class="pt-star" cx="1480" cy="780" r="1" style="animation-delay: 2.3s;"/>
  </svg>

  <div class="proof-corner top-left">
    <svg viewBox="0 0 240 240" fill="none">
      <path d="M 0 60 Q 60 20, 120 80 T 240 60"/>
      <path d="M 0 120 Q 60 80, 120 140 T 240 120"/>
      <path d="M 0 180 Q 60 140, 120 200 T 240 180"/>
    </svg>
  </div>
  <div class="proof-corner bottom-right">
    <svg viewBox="0 0 240 240" fill="none">
      <path d="M 0 60 Q 60 20, 120 80 T 240 60"/>
      <path d="M 0 120 Q 60 80, 120 140 T 240 120"/>
      <path d="M 0 180 Q 60 140, 120 200 T 240 180"/>
    </svg>
  </div>

  <div class="container">
    <div class="section-head">
      <div class="chapter-mark"><span class="roman">III</span> The receipts</div>
      <span class="eyebrow">Not theory</span>
      <h2 class="h-section" style="margin-top: 24px;">Execution.</h2>
    </div>

    <div class="proof-list">
      <div class="proof-row">
        <div class="num">01 / 04</div>
        <div class="statement">Campaigns identifying previously unseen revenue streams.</div>
        <div class="pulse"><span class="ind"></span> ACTIVE</div>
      </div>
      <div class="proof-row">
        <div class="num">02 / 04</div>
        <div class="statement">Communities forming around early-stage ideas before launch.</div>
        <div class="pulse"><span class="ind"></span> ACTIVE</div>
      </div>
      <div class="proof-row">
        <div class="num">03 / 04</div>
        <div class="statement">Founders accessing capital without dilution pressure.</div>
        <div class="pulse"><span class="ind"></span> ACTIVE</div>
      </div>
      <div class="proof-row">
        <div class="num">04 / 04</div>
        <div class="statement">Market signals sold as valuable data assets.</div>
        <div class="pulse"><span class="ind"></span> ACTIVE</div>
      </div>
    </div>

    <div class="proof-summary">
      <div class="line">
        <span class="item"><span class="ind"></span>Data points generated</span>
        <span class="sep"></span>
        <span class="item"><span class="ind"></span>Communities activated</span>
        <span class="sep"></span>
        <span class="item"><span class="ind"></span>Capital unlocked</span>
      </div>
    </div>
  </div>
</section>`;

const WHY_SECTION_HTML = `
<section id="why" class="why">
  <div class="container">
    <div class="section-head">
      <div class="chapter-mark"><span class="roman">IV</span> The difference</div>
      <span class="eyebrow">Why XPoll works</span>
      <h2 class="h-section" style="margin-top: 24px;">This isn't <span class="serif dim">a survey tool.</span></h2>
      <p class="lede">Surveys ask. CRM tracks. Web3 hypes. XPoll does something different.</p>
    </div>

    <div class="diff-stage">
      <div class="diff-pair">
        <div class="diff-not">
          <span class="label">NOT</span>
          <div class="text">A survey tool</div>
        </div>
        <div class="diff-arrow">→</div>
        <div class="diff-is">
          <span class="label">BUT</span>
          <div class="text">A market creation engine.</div>
        </div>
      </div>
      <div class="diff-pair">
        <div class="diff-not">
          <span class="label">NOT</span>
          <div class="text">Just data</div>
        </div>
        <div class="diff-arrow">→</div>
        <div class="diff-is">
          <span class="label">BUT</span>
          <div class="text">Data that generates value.</div>
        </div>
      </div>
      <div class="diff-pair">
        <div class="diff-not">
          <span class="label">NOT</span>
          <div class="text">Just community</div>
        </div>
        <div class="diff-arrow">→</div>
        <div class="diff-is">
          <span class="label">BUT</span>
          <div class="text">Community tied to economic outcomes.</div>
        </div>
      </div>
      <div class="diff-pair">
        <div class="diff-not">
          <span class="label">NOT</span>
          <div class="text">Just tokens</div>
        </div>
        <div class="diff-arrow">→</div>
        <div class="diff-is">
          <span class="label">BUT</span>
          <div class="text">Tokens backed by real participation and demand.</div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const ACTIVATION_SECTION_HTML = (seedSrc: string) => `
<section class="activation">
  <div class="activation-bg">
    <img src="${seedSrc}" alt="" aria-hidden="true" />
  </div>
  <div class="quote-close"></div>
  <div class="container-narrow">
    <span class="eyebrow">An interlude</span>
    <h2 class="h-mega" style="margin: 32px 0;">
      <span class="word" style="--delay: 0.1s">Your</span>
      <span class="word" style="--delay: 0.2s">idea</span><br/>
      <span class="word" style="--delay: 0.3s">already</span>
      <span class="word" style="--delay: 0.4s">has</span><br/>
      <span class="word serif" style="--delay: 0.55s">a market.</span>
    </h2>
    <h3 class="h-statement" data-reveal style="--delay: 0.9s; color: var(--dim); font-weight: 400; margin-bottom: 56px;">
      You just haven't activated it yet.
    </h3>
    <p>
      Most businesses fail not because of bad ideas — <b>but because they build in isolation.</b>
    </p>
    <p>
      XPoll connects your idea to real people, real feedback, and real capital — before you risk everything.
    </p>
  </div>
</section>`;

const VALUATION_SECTION_HTML = `
<section id="valuation" class="valuation">
  <div class="container">
    <div class="section-head">
      <div class="chapter-mark"><span class="roman">V</span> The strategic edge</div>
      <span class="eyebrow">The hidden multiplier</span>
      <h2 class="h-section" style="margin-top: 24px;">
        Build your company,<br/>
        <span class="serif" style="color: var(--cyan);">exit like a data company.</span>
      </h2>
      <p class="lede">
        Most businesses sell for 4–5× ARR. Data-driven companies command 10–15×.<br/>
        XPoll helps you build both — from day one.
      </p>
    </div>

    <div class="val-hero-visual">
      <svg class="val-hero-svg" viewBox="0 0 1536 620" preserveAspectRatio="none">
        <defs>
          <linearGradient id="vhBarGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#1E5EFF"/>
            <stop offset="100%" stop-color="#00D4FF"/>
          </linearGradient>
          <linearGradient id="vhTentacleGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#00D4FF" stop-opacity="0"/>
            <stop offset="50%" stop-color="#00D4FF" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#1E5EFF" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <line class="vh-bar vh-bar-grey" x1="280" y1="500" x2="280" y2="350"/>
        <circle cx="280" cy="350" r="10" fill="rgba(160,168,181,0.6)"/>

        <line class="vh-bar vh-bar-cyan" x1="1256" y1="500" x2="1256" y2="120"/>
        <circle cx="1256" cy="120" r="14" fill="#00D4FF" filter="url(#none)"/>

        <path class="vh-tentacle vt-1" d="M 200 520 Q 600 480, 900 380 T 1256 240"/>
        <path class="vh-tentacle vt-2" d="M 100 540 Q 500 500, 850 400 T 1256 200"/>
        <path class="vh-tentacle vt-3" d="M 300 560 Q 700 520, 1000 420 T 1256 180"/>
        <path class="vh-tentacle vt-1" d="M 50 480 Q 400 440, 800 340 T 1256 160"/>

        <circle class="vh-particle" cx="1180" cy="500" r="3" style="animation-delay: 0s;"/>
        <circle class="vh-particle" cx="1230" cy="500" r="2.5" style="animation-delay: 0.5s;"/>
        <circle class="vh-particle" cx="1290" cy="500" r="3" style="animation-delay: 1s;"/>
        <circle class="vh-particle" cx="1340" cy="500" r="2" style="animation-delay: 1.5s;"/>
        <circle class="vh-particle" cx="1210" cy="500" r="2.5" style="animation-delay: 2s;"/>
        <circle class="vh-particle" cx="1310" cy="500" r="3" style="animation-delay: 2.5s;"/>

        <line x1="80" y1="520" x2="1456" y2="520" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4 6"/>
      </svg>

      <div class="val-hero-marker val-hero-marker-left">
        <span class="val-hero-mult">4–5×</span>
        <span class="val-hero-tag">Traditional</span>
      </div>
      <div class="val-hero-marker val-hero-marker-right">
        <span class="val-hero-mult">10–15×</span>
        <span class="val-hero-tag">Data-driven</span>
      </div>
    </div>

    <div class="val-viz">
      <div class="val-bar traditional">
        <div>
          <div class="label-row">
            <span>Traditional</span>
            <span>· · ·</span>
          </div>
          <div class="multiple">4–5×</div>
          <div class="arr-label">ARR multiple</div>
          <div class="scale-bar"><div class="fill"></div></div>
        </div>
        <div>
          <h3>Revenue only.</h3>
          <p>You sell a product. Buyers price you on cash flow. The ceiling is fixed.</p>
        </div>
      </div>

      <div class="val-bar driven">
        <div>
          <div class="label-row">
            <span>Data-driven</span>
            <span>↑ ↑ ↑</span>
          </div>
          <div class="multiple">10–15×</div>
          <div class="arr-label" style="color: rgba(255,255,255,0.7);">ARR multiple</div>
          <div class="scale-bar"><div class="fill"></div></div>
        </div>
        <div>
          <h3>Revenue + data + community.</h3>
          <p>You sell a product <i>and</i> the structured signal it produced. Buyers price you on leverage.</p>
        </div>
      </div>
    </div>

    <div class="val-body">
      <h3>The hidden multiplier most founders miss.</h3>
      <p>Traditional businesses generate revenue. Data-driven businesses generate insight, leverage, and premium valuation multiples.</p>
      <p>The difference isn't what you sell — it's what you capture, structure, and prove along the way.</p>
      <p style="margin-top: 36px; color: rgba(255,255,255,0.85);">XPoll embeds a data layer into your business from day one:</p>
      <ul>
        <li>Every campaign becomes a market validation engine.</li>
        <li>Every interaction becomes structured, monetizable signal.</li>
        <li>Every community becomes a repeatable data asset.</li>
      </ul>
      <p style="margin-top: 24px;">You're not just building a company — you're building a <strong>data-backed enterprise with higher exit potential.</strong></p>
      <p class="val-disclaimer">Valuation ranges vary by market and execution. XPoll is designed to help businesses capture and structure high-value data assets.</p>
    </div>
  </div>
</section>`;

export default function AuthLanding() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Sandbox: OAuth is not available, so every entry point goes to the demo login.
  const handleEmail = () => navigate("/login");
  const handleSignup = () => navigate("/login");

  useEffect(() => {
    const progressBar = document.getElementById("scrollProgress");
    const updateProgress = () => {
      if (!progressBar) return;
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      progressBar.style.width = pct + "%";
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    const targets: { sel: string; stagger: number }[] = [
      { sel: ".section-head", stagger: 0 },
      { sel: ".pathway-step", stagger: 0.12 },
      { sel: ".audience-col", stagger: 0.12 },
      { sel: ".proof-row", stagger: 0.1 },
      { sel: ".diff-pair", stagger: 0.1 },
      { sel: ".val-bar", stagger: 0.15 },
      { sel: ".val-body", stagger: 0 },
      { sel: ".proof-summary", stagger: 0 },
    ];
    targets.forEach(({ sel, stagger }) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el, i) => {
        if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "");
        if (stagger > 0) el.style.setProperty("--delay", `${i * stagger}s`);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    document
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .forEach((el) => observer.observe(el));
    [".pathway", ".activation", ".valuation"].forEach((sel) => {
      document
        .querySelectorAll<HTMLElement>(sel)
        .forEach((el) => observer.observe(el));
    });
    document
      .querySelectorAll<HTMLElement>(".pathway-step, .val-bar")
      .forEach((el) => {
        if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "");
        observer.observe(el);
      });

    const magneticHandlers: Array<{
      el: HTMLElement;
      onMove: (e: MouseEvent) => void;
      onLeave: () => void;
    }> = [];
    document.querySelectorAll<HTMLElement>(".btn-primary").forEach((btn) => {
      const onMove = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      };
      const onLeave = () => {
        btn.style.transform = "";
      };
      btn.addEventListener("mousemove", onMove);
      btn.addEventListener("mouseleave", onLeave);
      magneticHandlers.push({ el: btn, onMove, onLeave });
    });

    return () => {
      window.removeEventListener("scroll", updateProgress);
      observer.disconnect();
      magneticHandlers.forEach(({ el, onMove, onLeave }) => {
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin" />;
  if (user) return <Navigate to="/home" replace />;

  return (
    <div className="auth-landing-root">
      <div className="scroll-progress" id="scrollProgress"></div>

      {/* NAV */}
      <div className="nav-wrap">
        <nav className="nav">
          <div
            className="brand"
            dangerouslySetInnerHTML={{
              __html: BRAND_LOGO_SVG + "X<span>Poll</span>",
            }}
          />
          <button
            type="button"
            onClick={handleEmail}
            className="nav-cta"
            style={{
              border: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign in →
          </button>
        </nav>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-video-wrap" aria-hidden="true">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={heroNetworkPoster}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>

        <div dangerouslySetInnerHTML={{ __html: HERO_BG_HTML }} />

        <div className="hero-center">
          <span className="eyebrow">
            Idea · Validation · Community · Capital
          </span>

          <h1 className="hero-headline">
            Turn Ideas Into Markets.
            <span className="line-2">
              Markets Into <span className="accent">Capital.</span>
            </span>
          </h1>

          <p className="hero-sub">
            Build a campaign. Test your product. Grow your community. Unlock
            non-dilutive funding — all in one system.
          </p>

          {/* Auth buttons */}
          <div className="hero-auth">
            <button
              type="button"
              onClick={handleEmail}
              className="auth-btn auth-primary"
              style={{ border: 0, fontFamily: "inherit", width: "100%" }}
            >
              <svg
                className="auth-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              Sign in to the Sandbox
              <span className="auth-arrow">→</span>
            </button>
          </div>

          <p className="hero-microproof">
            <span className="live-dot"></span>
            Companies on XPoll have identified new revenue streams and unlocked
            funding in as little as 180 days.
          </p>
        </div>

        <div dangerouslySetInnerHTML={{ __html: HERO_FLOWLINE_HTML }} />
        <div dangerouslySetInnerHTML={{ __html: TICKER_HTML }} />

        <div className="scroll-cue">SCROLL</div>
      </section>

      {/* CHAPTER I — PATHWAY */}
      <div dangerouslySetInnerHTML={{ __html: PATHWAY_SECTION_HTML }} />

      {/* CHAPTER II — AUDIENCE */}
      <div dangerouslySetInnerHTML={{ __html: AUDIENCE_SECTION_HTML }} />

      {/* CHAPTER III — PROOF */}
      <div dangerouslySetInnerHTML={{ __html: PROOF_SECTION_HTML }} />

      {/* CHAPTER IV — WHY */}
      <div dangerouslySetInnerHTML={{ __html: WHY_SECTION_HTML }} />

      {/* ACTIVATION */}
      <div
        dangerouslySetInnerHTML={{
          __html: ACTIVATION_SECTION_HTML(activationSeed),
        }}
      />

      {/* CHAPTER V — VALUATION */}
      <div dangerouslySetInnerHTML={{ __html: VALUATION_SECTION_HTML }} />

      {/* FINAL CTA */}
      <section id="final" className="final">
        <div className="final-grid"></div>
        <div className="container-narrow">
          <span className="eyebrow">The conversion moment</span>
          <h2 className="h-section">
            Why build a 4× business
            <br />
            <span className="light">when you can position for</span>{" "}
            <span className="serif">10–15×?</span>
          </h2>
          <p className="sub">
            Log in to start capturing the data your future valuation depends on.
          </p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <button
              type="button"
              onClick={handleSignup}
              className="btn btn-primary"
              style={{ border: 0, fontFamily: "inherit", cursor: "pointer" }}
            >
              Log in and launch your first campaign
              <span className="arrow">→</span>
            </button>
            <a href="#pathway" className="btn btn-ghost">
              See how it works
            </a>
          </div>
          <p className="reinforce">
            No upfront capital required. Start with signal.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="w-full shrink-0 bg-black text-white flex flex-col items-center gap-8 pt-14"
        style={{
          paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="w-full max-w-3xl px-4 md:py-7 flex flex-col items-center gap-8">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center md:h-16 md:w-16 [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:drop-shadow-[0_0_8px_rgba(0,212,255,0.45)]"
            dangerouslySetInnerHTML={{ __html: BRAND_LOGO_SVG }}
            aria-hidden
          />
          {/* middle para */}
          <div className="max-w-72 sm:max-w-96 md:max-w-none text-center flex flex-col gap-5 mb-5">
            <p className="font-plusjakarta text-3xl md:text-5xl 2xl font-bold">
              Email us: <a href="mailto:hello@xpoll.io">hello@xpoll.io</a>
              {/* Stay <span className="text-nowrap">tuned for</span> XPOLL insights */}
            </p>
            <p className="font-inter font-normal text-base md:text-2xl text-[#A5ABB6]">
              Phone: <a href="tel:+1 860 655 0095">+1 860 655 0095</a>
            </p>
          </div>
          <div className="flex items-center gap-12 md:gap-20">
            <GlowCircle
              img={ASSETS.icons.x}
              size="md"
              className="h-16 p-[1rem] md:h-20 md:p-[1.35rem]"
              onClick={() =>
                window.open("https://x.com/xpollplatform", "_blank")
              }
            />
            <GlowCircle
              img={ASSETS.icons.instagram}
              size="md"
              className="h-16 p-[1rem] md:h-20 md:p-[1.35rem]"
              onClick={() =>
                window.open(
                  "https://www.instagram.com/xpollplatform/",
                  "_blank",
                )
              }
            />
            <GlowCircle
              img={ASSETS.icons.telegram}
              size="md"
              className="h-16 p-[1rem] md:h-20 md:p-[1.35rem]"
              onClick={() =>
                window.open("https://t.me/xpollplatform", "_blank")
              }
            />
          </div>
        </div>
        {/* footer */}
        <div className="flex flex-col items-center gap-4 text-center w-full pt-10 md:pt-16 pb-10 md:pb-16 text-sm md:text-lg lg:text-lg">
          <a
            href="https://www.canvaslabs.world/"
            target="_blank"
            className="text-white/50 hover:text-white/60 transition-colors"
          >
            A Canvas Labs Innovation
          </a>
          <a
            href="https://xpoll.io/privacy-policy"
            target="_blank"
            id="legal-privacy"
            className="text-white/50 hover:text-white/60 transition-colors"
          >
            Privacy Policy
          </a>
          <p className="text-white/50 hover:text-white/60 transition-colors">
            © 2026 XPoll Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
