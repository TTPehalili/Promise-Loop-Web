// Three dots, 1s loop (brief §8.2). Shown only while the request is submitted;
// it disappears as soon as the stream starts. Static under reduced motion.
export function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex h-10 items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-surface px-4">
        <span className="sr-only">The assistant is typing</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="pl-assistant-dot h-1.5 w-1.5 rounded-full bg-brand"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Skeleton bubble while the session loads (brief §8.4). */
export function SkeletonBubble() {
  return (
    <div aria-hidden className="flex flex-col gap-2 rounded-2xl rounded-bl-md border border-line bg-surface p-4">
      <div className="h-3 w-11/12 animate-pulse rounded bg-paper-deep" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-paper-deep" />
      <div className="h-3 w-2/5 animate-pulse rounded bg-paper-deep" />
    </div>
  );
}
