const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent";
const base = "bg-gray-200 rounded-md " + shimmer;

export function AvatarPageSkeleton() {
  return (
    <div className="overflow-scroll">
      <div className="relative z-10 flex justify-center">
        <div className="w-full max-w-[440px] md:max-w-[900px] p-6 flex flex-col gap-8 items-center min-h-96">
          {/* Name input skeleton */}
          <div className="bg-white/70 px-5 py-5 rounded-xl w-full md:w-96 space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className={`h-6 w-full ${base}`} />
            <div className="h-3 w-16 bg-gray-200 rounded ml-auto" />
          </div>

          {/* Avatars grid skeleton */}
          <div className="flex flex-col xl:w-full h-full xl:h-[20rem] mb-2">
            <div className="h-3 w-28 bg-gray-200 mx-auto mb-4 rounded" />
            <ul className="grid h-[27rem] md:h-[37rem] lg:h-[23rem] w-full grid-cols-3 xl:grid-cols-6 gap-x-6 place-items-center overflow-y-scroll">
              {Array.from({ length: 12 }).map((_, i) => (
                <li key={i} className="w-full flex justify-center">
                  <div
                    className={`lg:w-20 xl:w-28 h-24 xl:h-28 rounded-lg ${base}`}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Button skeleton */}
          <div className="w-full flex justify-center">
            <div className={`h-10 w-40 rounded-full ${base}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
export function HomeSkeleton() {
  return (
    <main className="py-4 px-2 md:px-4 space-y-6 animate-pulse">
      {/* 🔹 Banner */}
      <section className="rounded-2xl overflow-hidden p-4 bg-gray-200">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-gray-300 rounded" />
          <div className="h-3 w-64 bg-gray-300 rounded" />
        </div>
        <div className="h-8 w-8 rounded-full bg-gray-300 ml-auto mt-2" />
      </section>

      {/* 🔹 Top Coins */}
      <section className="rounded-2xl bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-28 bg-gray-300 rounded" />
          <div className="h-8 w-16 bg-gray-300 rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-14 w-14 rounded-full bg-gray-300 mx-auto" />
              <div className="h-3 w-10 mx-auto bg-gray-300 rounded" />
              <div className="h-3 w-12 mx-auto bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* 🔹 Trials */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-24 bg-gray-300 rounded" />
          <div className="h-3 w-10 bg-gray-300 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-300" />
          ))}
        </div>
      </section>

      {/* 🔹 Exchange */}
      <section>
        <div className="h-5 w-28 bg-gray-300 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-300" />
          ))}
        </div>
      </section>
    </main>
  );
}

// src/components/polls/PollCardSkeleton.tsx
export function PollCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded-2xl bg-white p-4 shadow-sm">
          {/* Title */}
          <section className="h-4 w-2/3 animate-pulse rounded bg-black/10" />

          {/* Options row */}
          <section className="mt-3 grid grid-cols-3 gap-2">
            <section className="h-14 animate-pulse rounded-xl bg-black/5" />
            <section className="h-14 animate-pulse rounded-xl bg-black/5" />
            <section className="h-14 animate-pulse rounded-xl bg-black/5" />
          </section>

          {/* Footer row */}
          <section className="mt-4 flex items-center justify-between">
            <section className="h-3 w-24 animate-pulse rounded bg-black/10" />
            <section className="h-8 w-8 animate-pulse rounded-full bg-black/10" />
          </section>
        </li>
      ))}
    </ul>
  );
}
// src/components/skeletons/CoinDetailSkeleton.tsx
export function CoinDetailSkeleton() {
  return (
    <main className="min-h-screen bg-[#F2F3F5] animate-pulse">
      {/* Header / balance card */}
      <header className="rounded-b-3xl relative max-w-md mx-auto bg-gradient-to-b from-gray-300 to-gray-500 h-[320px] flex flex-col justify-center items-center">
        <div className="h-6 w-20 rounded bg-white/50 mb-3" />
        <div className="h-4 w-24 rounded bg-white/40 mb-1" />
        <div className="h-8 w-40 rounded bg-white/70" />

        <div className="absolute -bottom-10 h-32 w-32 rounded-full bg-white/60" />
      </header>

      {/* Body */}
      <section className="mx-auto max-w-md px-4 pt-16 space-y-6">
        {/* Drop zone / input */}
        <div className="flex justify-between rounded-3xl bg-white p-4 shadow-sm">
          <div className="h-6 w-10 rounded bg-gray-200" />
          <div className="h-6 w-20 rounded bg-gray-200" />
        </div>

        {/* Banner placeholders */}
        <div className="mx-auto h-6 w-60 rounded-full bg-gray-200" />
        <div className="mx-auto h-6 w-60 rounded-full bg-gray-200" />

        {/* Transactions */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-5 w-24 rounded bg-gray-200 mb-4" />
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="h-16 rounded-xl bg-gray-200" />
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

// src/components/skeletons/EnquiryFormSkeleton.tsx
export function EnquiryFormSkeleton() {
  return (
    <section className="relative overflow-hidden min-h-screen bg-gray-50 animate-pulse">
      {/* Welcome header */}
      <section className="px-6 pt-10 space-y-3 max-w-lg mx-auto">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-5/6 bg-gray-200 rounded" />
      </section>

      {/* Form card */}
      <section className="mt-6 mx-auto max-w-lg bg-white rounded-3xl shadow-2xl p-5 space-y-6">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />

        {/* Sections skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i} className="space-y-3">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 rounded-full bg-gray-200" />
              <div className="h-9 rounded-full bg-gray-200" />
              <div className="h-9 rounded-full bg-gray-200" />
              <div className="h-9 rounded-full bg-gray-200" />
            </div>
          </section>
        ))}
      </section>

      {/* Bottom CTA button */}
      <section className="fixed bottom-6 inset-x-6">
        <div className="h-12 w-full rounded-full bg-gray-200" />
      </section>
    </section>
  );
}

// src/components/skeletons/CertificateSkeleton.tsx
export function CertificateSkeleton() {
  return (
    <section className="relative min-h-screen bg-gray-50 animate-pulse overflow-hidden">
      {/* Flag placeholder */}
      <section className="pt-16 flex justify-center">
        <div className="h-10 w-16 bg-gray-200 rounded" />
      </section>

      {/* Certificate content */}
      <section className="mt-6 mx-auto max-w-sm px-6 text-center space-y-4">
        <div className="h-5 w-64 bg-gray-200 rounded mx-auto" />
        <div className="h-3 w-40 bg-gray-200 rounded mx-auto" />

        {/* Badge / level card */}
        <section className="mt-6 p-6 rounded-3xl bg-white shadow-lg space-y-4">
          <div className="mx-auto h-20 w-20 rounded-full bg-gray-200" />
          <div className="h-5 w-32 bg-gray-200 rounded mx-auto" />
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
        </section>

        {/* Paragraph placeholders */}
        <section className="mt-6 space-y-2">
          <div className="h-3 w-5/6 bg-gray-200 rounded mx-auto" />
          <div className="h-3 w-3/4 bg-gray-200 rounded mx-auto" />
          <div className="h-3 w-2/3 bg-gray-200 rounded mx-auto" />
        </section>
      </section>

      {/* Bottom button */}
      <section className="fixed bottom-6 inset-x-6">
        <div className="h-12 w-full rounded-full bg-gray-200" />
      </section>
    </section>
  );
}

// src/components/skeletons/DashboardSkeleton.tsx
export function DashboardSkeleton() {
  return (
    <main className="py-4 px-2 md:px-4 space-y-6 animate-pulse">
      {/* Banner / Announcement */}
      <section className="rounded-2xl overflow-hidden p-4 flex items-center justify-between bg-gray-200">
        <div className="space-y-2 flex-1">
          <div className="h-6 w-32 bg-gray-300 rounded" />
          <div className="h-3 w-52 bg-gray-300 rounded" />
        </div>
        <div className="h-10 w-10 rounded-full bg-gray-300" />
      </section>

      {/* Top Coins */}
      <section className="space-y-3">
        <div className="h-5 w-28 bg-gray-300 rounded" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center space-y-2 bg-white rounded-xl p-3 shadow-sm"
            >
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="h-3 w-10 bg-gray-200 rounded" />
              <div className="h-3 w-14 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Trials */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 bg-gray-300 rounded" />
          <div className="h-3 w-10 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200" />
          ))}
        </div>
      </section>

      {/* Exchange cards */}
      <section className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-200" />
        ))}
      </section>
    </main>
  );
}

export function ProfilePageSkeleton() {
  return (
    <main className="px-2 pb-6 space-y-10 max-w-[620px] mx-auto animate-pulse">
      {/* Header */}
      <header className="flex items-center justify-between py-4">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-28 bg-gray-200 rounded-full" />
      </header>

      {/* Wallet Card */}
      <section className="relative mx-auto w-full">
        <div className="relative w-full rounded-2xl overflow-hidden bg-gray-200 h-40">
          {/* Avatar + Flag */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="h-10 w-10 bg-gray-300 rounded-full" />
            <div className="h-4 w-6 bg-gray-300 rounded" />
          </div>
          {/* Username */}
          <div className="absolute left-4 top-20 h-4 w-32 bg-gray-300 rounded" />
          {/* Level Badge */}
          <div className="absolute bottom-6 left-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-300" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-300 rounded" />
              <div className="h-3 w-12 bg-gray-300 rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* Civic Score + Level icons */}
      <section className="mx-auto w-full max-w-[500px] px-4 flex items-center justify-between">
        <div className="flex max-w-[75%] gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-8 bg-gray-200 rounded-full" />
          ))}
        </div>
        <div className="h-8 w-24 bg-gray-200 rounded-full" />
      </section>

      {/* Reward History Button */}
      <div className="h-12 w-full bg-gray-200 rounded-full" />

      {/* Coins Section */}
      <section className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <div className="h-12 w-12 bg-gray-200 rounded-full" />
              <div className="h-3 w-12 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Poll Stats Section */}
      <section className="bg-white p-3 rounded-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-gray-200 rounded" />
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-16" />
          ))}
        </div>
      </section>

      {/* Settings Section */}
      <section className="bg-white p-4 rounded-2xl space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-full bg-gray-200 rounded" />
        ))}
      </section>
    </main>
  );
}

export function CardGridSkeleton({ items = 3, className = "" }) {
  return (
    <ul className={`space-y-3 ${className ?? ""}`}>
      {Array.from({ length: items }).map((_, i) => (
        <li key={i} className="rounded-2xl bg-white p-4 shadow-sm">
          <section className="h-4 w-2/3 animate-pulse rounded bg-black/10" />

          <section className="mt-3 grid grid-cols-3 gap-2">
            <section className="h-14 animate-pulse rounded-xl bg-black/5" />
            <section className="h-14 animate-pulse rounded-xl bg-black/5" />
            <section className="h-14 animate-pulse rounded-xl bg-black/5" />
          </section>

          <section className="mt-4 flex items-center justify-between">
            <section className="h-3 w-24 animate-pulse rounded bg-black/10" />
            <section className="h-8 w-8 animate-pulse rounded-full bg-black/10" />
          </section>
        </li>
      ))}
    </ul>
  );
}
