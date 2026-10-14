export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
        RepoAtlas
      </h1>
      <p className="mt-4 max-w-md text-base text-neutral-400">
        Interactive architecture map of any codebase with grounded AI Q&amp;A.
      </p>
      <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-300">
        Status: Scaffold initialized (P0-S02)
      </div>
    </main>
  );
}