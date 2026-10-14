export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  cleanUrl: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  data?: ParsedGitHubUrl;
}

/**
 * Validates and extracts owner and repository name from user input.
 * Supports:
 * - https://github.com/owner/repo
 * - http://github.com/owner/repo
 * - github.com/owner/repo
 * - Optional trailing slashes and .git extensions
 */
export function validateGitHubUrl(rawInput: string): ValidationResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      isValid: false,
      error: "Please enter a GitHub repository URL.",
    };
  }

  // Regex matching github.com/owner/repo with optional protocol and trailing .git/slashes
  const githubPattern =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)*$/;

  const match = input.match(githubPattern);

  if (!match) {
    return {
      isValid: false,
      error: "Must be a valid GitHub repository URL (e.g. github.com/owner/repo).",
    };
  }

  const [, owner, repo] = match;

  // GitHub usernames/organizations and repo names cannot be empty or solely punctuation
  if (!owner || !repo || owner === "." || repo === ".") {
    return {
      isValid: false,
      error: "Invalid repository owner or name.",
    };
  }

  return {
    isValid: true,
    data: {
      owner,
      repo,
      cleanUrl: `https://github.com/${owner}/${repo}`,
    },
  };
}
