export default function Loading() {
  return (
    <div className="p-4 max-w-lg mx-auto w-full animate-pulse">
      <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 mb-6"></div>
      <div className="space-y-4">
        <div className="h-32 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-full"></div>
        <div className="h-32 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-full"></div>
        <div className="h-32 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-full"></div>
      </div>
    </div>
  );
}