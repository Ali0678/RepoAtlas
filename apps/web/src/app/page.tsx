"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SurveyMap } from "@/components/SurveyMap";
import { validateGitHubUrl } from "@/lib/validation";
const repositories = [
  [
    "pallets",
    "flask",
    "PYTHON",
    "Small surface. Deep foundations. Explore how a web framework fits together.",
  ],
  [
    "expressjs",
    "express",
    "JAVASCRIPT",
    "Follow a request through routing, middleware, and the machinery between.",
  ],
  [
    "fastapi",
    "fastapi",
    "PYTHON",
    "Trace the connections between endpoints, validation, and dependency injection.",
  ],
  [
    "facebook",
    "react",
    "JAVASCRIPT",
    "Find your bearings in a component-driven interface library.",
  ],
  ["encode", "httpx", "PYTHON", "From request to transport. An expedition into an HTTP client."],
  [
    "microsoft",
    "typescript",
    "TYPESCRIPT",
    "A compiler is a landscape. Start with the paths between its modules.",
  ],
];
export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  function analyze(event: React.FormEvent) {
    event.preventDefault();
    const result = validateGitHubUrl(url);
    if (!result.isValid || !result.data) {
      setError(result.error ?? "Enter a repository URL.");
      return;
    }
    setError(null);
    router.push(`/explore?repo=${result.data.owner}/${result.data.repo}`);
  }
  return (
    <div className="atlas-landing">
      <header className="atlas-nav">
        <Link href="/" className="atlas-wordmark" aria-label="RepoAtlas home">
          Repo<b>Atlas</b>.
        </Link>
        <nav aria-label="Main navigation">
          <a href="#field-notes">The collection</a>
          <Link href="https://github.com/Ali0678/RepoAtlas">GitHub ↗</Link>
          <Link href="/explore" className="text-accent">
            Open atlas ↗
          </Link>
        </nav>
      </header>
      <main>
        <section className="atlas-hero" aria-labelledby="hero-title">
          <div className="atlas-intro atlas-reveal">
            <div className="atlas-kicker">
              <span className="text-accent">✳</span> A field guide to unfamiliar code
            </div>
            <h1 id="hero-title">
              Every codebase
              <br />
              has a <em>landscape.</em>
            </h1>
            <p>
              Find the paths through it. Map the dependencies, follow the evidence, and see how one
              change travels through a repository.
            </p>
            <form onSubmit={analyze} className="atlas-form">
              <label htmlFor="repository-url" className="atlas-kicker">
                01 / Choose your territory
              </label>
              <div className="atlas-input-row">
                <input
                  id="repository-url"
                  aria-invalid={!!error}
                  aria-describedby={error ? "url-error" : "preview-note"}
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError(null);
                  }}
                  placeholder="github.com/owner/repository"
                />
                <button type="submit">Map repository ↗</button>
              </div>
              {error && (
                <p id="url-error" role="alert" className="text-danger text-xs mt-2">
                  {error}
                </p>
              )}
              <small id="preview-note">
                Frontend field edition. All routes currently open the same interactive mock map.
              </small>
            </form>
          </div>
          <SurveyMap />
        </section>
        <section className="atlas-method atlas-reveal" aria-label="How to explore">
          {[
            [
              "01",
              "Read the terrain",
              "Files become landmarks. Imports draw the paths. Explore a repository at the scale that makes sense.",
            ],
            [
              "02",
              "Follow the evidence",
              "Ask a question and navigate to its cited files. Streaming answers are simulated in this edition.",
            ],
            [
              "03",
              "Trace the consequences",
              "Choose a file. Follow its dependents outward and see the reach of a potential change.",
            ],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span>{number} /</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>
        <section id="field-notes" className="atlas-library">
          <div className="atlas-section-title">
            <div>
              <div className="atlas-kicker">The collection / 001—006</div>
              <h2>Start somewhere interesting.</h2>
            </div>
            <p>
              A reading list for curious engineers. Each entry opens our mock workspace; real
              analyses arrive in Phase 2.
            </p>
          </div>
          <div className="atlas-repositories">
            {repositories.map(([owner, name, language, description], index) => (
              <Link key={name} href={`/explore?repo=${owner}/${name}`} className="atlas-repo">
                <div className="atlas-repo-top">
                  <span className="atlas-kicker">
                    0{index + 1} / {language}
                  </span>
                  <span className="atlas-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <h3>
                  <span>{owner}/</span>
                  {name}
                </h3>
                <p>{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <footer className="atlas-footer">
        <span className="atlas-kicker">RepoAtlas / Built for finding your bearings</span>
        <span className="atlas-kicker">Public code. New perspectives. / 2026</span>
      </footer>
    </div>
  );
}
