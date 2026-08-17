// import { useState, useEffect } from "react";
// import xpoll from "@/assets/logo.webp";
// import bg from "@/assets/ani/anibg.webp";
// import card from "@/assets/ani/card.webp";
// import chat from "@/assets/ani/chat.webp";
// import thumb from "@/assets/ani/thumb.webp";
// import mike from "@/assets/ani/mike.webp";
// import msg from "@/assets/ani/msg.webp";
// import poll from "@/assets/ani/poll.webp";
// import CommonButton from "@/components/commons/CommonButton";
// import { useNavigate } from "react-router";
// import BackButton from "@/components/commons/back-button";
// import { heightStyles } from "@/styles";

// const ThumbsUpIcon = ({ className }) => (
//   <figure className="h-14 w-14">
//     <img src={thumb} alt="" className="h-full w-full object-contain" />
//   </figure>
// );

// const SpeechBubbleIcon = ({ className }) => (
//   <figure className="h-14 w-14">
//     <img src={msg} alt="" />
//   </figure>
// );

// const MegaphoneIcon = ({ className }) => (
//   <figure className="h-10 w-10">
//     <img src={mike} alt="" className="h-full w-full object-contain" />
//   </figure>
// );

// const ChartIcon = ({ className }) => (
//   <figure className="h-16 w-16">
//     <img src={poll} alt="" className="h-full w-full object-contain" />
//   </figure>
// );

// const DocumentIcon = ({ className }) => (
//   <figure className="h-14 w-14">
//     <img src={card} alt="" className="h-full w-full object-contain" />
//   </figure>
// );

// const ChatIcon = ({ className }) => (
//   <figure className="h-10 w-10">
//     <img src={chat} alt="" className="h-full w-full object-contain" />
//   </figure>
// );
// const MainLogo = () => (
//   <figure className="w-16 md:w-20">
//     <img src={xpoll} alt="" className="h-full w-full object-contain" />
//   </figure>
// );

// export default function CreatePoll() {
//   const navigate = useNavigate();
//   const [animate, setAnimate] = useState(false);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setAnimate(true);
//     }, 100);
//     return () => clearTimeout(timer);
//   }, []);

//   const icons = [
//     { component: DocumentIcon, angle: 295, distance: 2 },
//     { component: SpeechBubbleIcon, angle: 45, distance: 1.9 },
//     { component: MegaphoneIcon, angle: 350, distance: 1.2 },
//     { component: ChartIcon, angle: 220, distance: 2 },
//     { component: ThumbsUpIcon, angle: 140, distance: 2 },
//     { component: ChatIcon, angle: 180, distance: 2 },
//   ];
//   return (
//     <>
//       <div
//         style={{
//           maxHeight: heightStyles.maxHeight,
//           // minHeight: "calc(100dvh - 25px)",
//           // height: "100dvh",
//         }}
//         className="relative md:w-screen overflow-hidden px-2 md:px-0"
//       >
//         <BackButton
//           className="absolute z-20 top-4 left-4 lg:left-[25%] 2xl:left-[32%] lg:hidden"
//           to="/home"
//         />
//         {/* Layer 1: Background Image */}
//         <div
//           className={`absolute inset-0 bg-contain bg-center transition-transform duration-[6000ms] ease-linear overflow-hidden ${animate ? "translate-y-[-10%] " : "translate-y-0"
//             }`}
//           style={{
//             backgroundImage: `url(${bg})`,
//           }}
//         />

//         {/* Layer 2: Gradient Overlay */}
//         <div
//           className="absolute inset-0"
//           style={{
//             background:
//               "linear-gradient(180deg, rgba(255, 255, 255, 0) 11.84%, #F1F3F6 100%)",
//           }}
//         />

//         {/* Layer 3: UI Content */}
//         <div
//           style={{
//             maxHeight: "calc(100dvh - 25px)",
//             minHeight: "calc(100dvh - 25px)",
//             // height: "100dvh",
//           }}
//           className="relative z-10 w-full h-full flex flex-col items-center justify-center mx-auto"
//         >
//           <div
//             className={`absolute transition-all duration-[3000ms] ease-linear transform lg:translate-x-3/5 lg:right-1/2 ${animate
//                 ? "top-[17%] md:top-[13%] xl:top-[22%]"
//                 : "top-[10%] md:top-[5%] xl:top-[15%]"
//               }`}
//             style={{ perspective: "1000px" }}
//           >
//             <div className="relative flex items-center justify-center w-48 h-44">
//               <MainLogo />

//               {/* Orbits & Icons Container */}
//               <div
//                 className={`absolute inset-0 ${animate ? "animate-containerRotate" : ""
//                   }`}
//                 style={{ transformStyle: "preserve-3d" }}
//               >
//                 {/* Orbiting waves with corrected colors and animations */}
//                 <div
//                   className={`absolute inset-0 border-2 border-[#FFFFFF90] rounded-full ${animate ? "animate-wave-1" : "opacity-0"
//                     }`}
//                 />
//                 <div
//                   className={`absolute inset-0 border border-[#FFFFFF90] rounded-full ${animate ? "animate-wave-2" : "opacity-0"
//                     }`}
//                   style={{ animationDelay: "0.2s" }}
//                 />
//                 <div
//                   className={`absolute inset-0 border border-[#FFFFFF70] rounded-full ${animate ? "animate-wave-3" : "opacity-0"
//                     }`}
//                   style={{ animationDelay: "0.4s" }}
//                 />
//                 <div
//                   className={`absolute inset-0 border border-[#FFFFFF70] rounded-full ${animate ? "animate-wave-4" : "opacity-0"
//                     }`}
//                   style={{ animationDelay: "0.6s" }}
//                 />

//                 {/* Scattered Icons */}
//                 {icons.map((icon, index) => {
//                   const x =
//                     50 +
//                     40 * icon.distance * Math.cos((icon.angle * Math.PI) / 180);
//                   const y =
//                     50 +
//                     40 * icon.distance * Math.sin((icon.angle * Math.PI) / 180);
//                   const IconComponent = icon.component;

//                   return (
//                     <div
//                       key={index}
//                       className={`absolute ${animate ? "animate-iconFadeIn" : "opacity-0"
//                         }`}
//                       style={{
//                         top: `${y}%`,
//                         left: `${x}%`,
//                         animationDelay: `${0.9 + index * 0.1}s`,
//                       }}
//                     >
//                       <div>
//                         <IconComponent className="w-8 h-8" />
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           <div
//             className="absolute text-center lg:mr-40"
//             style={{ bottom: "calc(1rem + 100px)" }}
//           >
//             <h1
//               className={`text-gray-800 transition-all duration-[6000ms] ease-linear uppercase ${animate ? "text-lg" : "text-3xl"
//                 }`}
//             >
//               Ask Anything, Earn Everything.
//             </h1>
//             <p
//               className={`transition-all duration-[6000ms] ease-linear bg-[linear-gradient(338.48deg,#112CFE_-23.68%,#FF6D6F_133.85%)] bg-clip-text text-transparent ${animate
//                   ? "text-2xl md:text-3xl font-medium text-gray-800"
//                   : "text-sm md:text-lg"
//                 }`}
//             >
//               Launch your poll now
//             </p>
//             <p
//               className={`pt-5 pb-4 ${animate ? "text-xs md:text-base" : "text-[0.5rem]"
//                 }`}
//             >
//               Campaign creation requires a minimum
//               <br /> balance and an additional one-time setup fee
//             </p>
//           </div>

//           <section className="absolute lg:-ml-10 lg:-translate-x-1/2 bottom-1 pt-4 w-72 xl:max-w-lg flex gap-1">
//             <CommonButton
//               text="Add Trail"
//               onClick={() => navigate("/standalone-trails/create")}
//               className="pt-4 pb-10 w-72 xl:max-w-lg hidden lg:block"
//             />
//             <CommonButton
//               text="Create Campaign"
//               onClick={() => navigate("/campaigns/create")}
//               className="pt-4 pb-10 w-72 xl:max-w-lg hidden lg:block"
//             />
//             <CommonButton
//               text="Create Poll"
//               onClick={() => navigate("/add-polls/basic-info")}
//               className="w-72 xl:max-w-lg"
//             />
//           </section>
//         </div>
//       </div>

//       <style>{`
//                 /* Corrected wave animations to stop at their final size */
//                 .animate-wave-1 { animation: wave-1 3s forwards cubic-bezier(0.2, 0.8, 0.2, 1); }
//                 .animate-wave-2 { animation: wave-2 3s forwards cubic-bezier(0.2, 0.8, 0.2, 1); }
//                 .animate-wave-3 { animation: wave-3 3s forwards cubic-bezier(0.2, 0.8, 0.2, 1); }
//                 .animate-wave-4 { animation: wave-4 3s forwards cubic-bezier(0.2, 0.8, 0.2, 1); }

//                 /* New icon animation with rotation */
//                 .animate-iconFadeIn { animation: iconFadeIn 3s forwards ease-out; }
//                 .animate-containerRotate { animation: containerRotate 3s forwards ease-linear; }
//                 .animate-logoPulse { animation: logoPulse 3s forwards ease-linear; }

//                 @keyframes wave-1 { /* Innermost, darkest */
//                   from { transform: scale(0.2); opacity: 0; }
//                   to { transform: scale(0.9); opacity: 1; }
//                 }
//                 @keyframes wave-2 { /* Middle */
//                   from { transform: scale(0.2); opacity: 0; }
//                   to { transform: scale(1.6); opacity: 0.8; }
//                 }
//                 @keyframes wave-3 { /* Outer */
//                   from { transform: scale(0.2); opacity: 0; }
//                   to { transform: scale(2.4); opacity: 0.6; }
//                 }
//                 @keyframes wave-4 { /* Outermost, lightest */
//                   from { transform: scale(0.2); opacity: 0; }
//                   to { transform: scale(3.2); opacity: 0.4; }
//                 }

//                 @keyframes iconFadeIn {
//                   0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) translateZ(-80px); }
//                   100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateZ(0px); }
//                 }
                
//                 @keyframes containerRotate {
//                     from { transform: rotate(0deg); }
//                     to { transform: rotate(60deg); }
//                 }

//                 @keyframes logoPulse {
//                   0% { transform: scale(1); }
//                   50% { transform: scale(0.95); }
//                   100% { transform: scale(1); }
//                 }
//             `}</style>
//     </>
//   );
// }
