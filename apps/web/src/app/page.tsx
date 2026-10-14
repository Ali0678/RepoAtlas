"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { GalleryCard, type GalleryRepo } from "@/components/GalleryCard";
import { validateGitHubUrl } from "@/lib/validation";

const FEATURED_REPOSITORIES: GalleryRepo[] = [
  {
    owner: "pallets",
    name: "flask",
    description:
      "A lightweight WSGI web application framework designed to make getting started quick and easy.",
    language: "Python",
    languageColor: "#3572A5",
    stars: "68k",
    files: 94,
    clusters: 6,
  },
  {
    owner: "expressjs",
    name: "express",
    description:
      "Fast, unopinionated, minimalist web framework for Node.js and standard HTTP servers.",
    language: "JavaScript",
    languageColor: "#f1e05a",
    stars: "64k",
    files: 78,
    clusters: 5,
  },
  {
    owner: "fastapi",
    name: "fastapi",
    description:
      "Modern, high-performance web framework for building APIs with Python based on standard type hints.",
    language: "Python",
    languageColor: "#3572A5",
    stars: "77k",
    files: 112,
    clusters: 7,
  },
  {
    owner: "astral-sh",
    name: "uv",
    description:
      "An extremely fast Python package and project manager written in Rust, replacing pip and venv.",
    language: "Rust / Python",
    languageColor: "#dea584",
    stars: "45k",
    files: 160,
    clusters: 6,
  },
  {
    owner: "facebook",
    name: "react",
    description:
      "The declarative, component-based library for building web and native user interfaces.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: "230k",
    files: 150,
    clusters: 8,
  },
  {
    owner: "torvalds",
    name: "linux",
    description:
      "Linux kernel source tree, subsystem drivers, virtual filesystem, and system architectures.",
    language: "C",
    languageColor: "#555555",
    stars: "185k",
    files: 150,
    clusters: 6,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [repoInput, setRepoInput] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  function handleAnalyze(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const result = validateGitHubUrl(repoInput);

    if (!result.isValid) {
      setErrorMessage(result.error ?? "Invalid repository URL");
      return;
    }

    setErrorMessage(null);
    router.push(`/explore?repo=${result.data!.owner}/${result.data!.repo}`);
  }

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-border-subtle/80 bg-surface-panel/60 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight text-white">
            RepoAtlas
          </span>
          <span className="text-[11px] font-mono text-text-muted bg-surface-elevated px-2 py-0.5 rounded border border-border-subtle">
            MVP Preview
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/Ali0678/RepoAtlas"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-text-secondary hover:text-white transition-colors"
          >
            GitHub
          </Link>
          <Link href="/explore">
            <Button variant="secondary" size="sm">
              Open Workspace
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-subtle bg-surface-elevated text-xs text-text-secondary mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          WebGL Dependency Visualization + Grounded AI Q&amp;A
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          See any codebase as an{" "}
          <span className="bg-gradient-to-r from-accent to-cyan-400 bg-clip-text text-transparent">
            interactive architecture map
          </span>
          .
        </h1>

        <p className="mt-5 max-w-xl text-base sm:text-lg text-text-secondary leading-relaxed">
          Transform public GitHub repositories into living, animated dependency
          graphs. Ask architectural questions in plain English with cited files
          highlighted directly on the map.
        </p>

        {/* URL Input Form */}
        <form onSubmit={handleAnalyze} className="mt-8 w-full max-w-lg">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full flex-1">
              <Input
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="github.com/owner/repository"
                error={errorMessage ?? undefined}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto shrink-0"
            >
              Analyze
            </Button>
          </div>
          <p className="mt-2 text-xs text-text-muted text-left">
            Try:{" "}
            <button
              type="button"
              onClick={() => setRepoInput("github.com/pallets/flask")}
              className="text-text-secondary hover:text-accent underline cursor-pointer"
            >
              github.com/pallets/flask
            </button>{" "}
            or select a gallery card below.
          </p>
        </form>

        {/* Value proposition badges */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
          <div className="p-3.5 rounded-lg border border-border-subtle/80 bg-surface-panel/40">
            <p className="text-xs font-semibold text-text-primary">
              WebGL ForceAtlas2
            </p>
            <p className="text-xs text-text-muted mt-1">
              60 fps interactive canvas clustered by module.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-border-subtle/80 bg-surface-panel/40">
            <p className="text-xs font-semibold text-text-primary">
              Grounded AI Q&amp;A
            </p>
            <p className="text-xs text-text-muted mt-1">
              Ask questions, answers glow on the cited graph nodes.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-border-subtle/80 bg-surface-panel/40">
            <p className="text-xs font-semibold text-text-primary">
              Blast Radius Impact
            </p>
            <p className="text-xs text-text-muted mt-1">
              Select any file to trace dependencies by depth.
            </p>
          </div>
        </div>

        {/* Gallery Section */}
        <section className="mt-20 w-full text-left">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Public Repository Gallery
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Explore pre-analyzed open-source projects instantly with zero
                login required.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURED_REPOSITORIES.map((repo) => (
              <GalleryCard key={`${repo.owner}/${repo.name}`} repo={repo} />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle/60 py-8 px-6 text-center text-xs text-text-muted">
        RepoAtlas • Computer Science Portfolio Project • Open Source
      </footer>
    </div>
  );
}