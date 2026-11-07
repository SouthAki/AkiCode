export const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".venv",
  ".turbo",
  ".cache",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor"
]);

export const ROOT_MANIFESTS = new Set([
  "Cargo.toml",
  "composer.json",
  "go.mod",
  "package.json",
  "pom.xml",
  "pyproject.toml",
  "requirements.txt",
  "build.gradle",
  "build.gradle.kts"
]);

export const MAX_INDEX_FILES = 5000;
export const MAX_FILE_BYTES = 256_000;
export const MAX_READ_RESULT_BYTES = 32_000;
export const MAX_SEARCH_FILES = 600;
export const MAX_SEARCH_RESULTS = 60;
export const MAX_DIFF_BYTES = 120_000;
export const MAX_PLAN_BYTES = 120_000;
export const MAX_ARCHITECTURE_GRAPH_BYTES = 32_000;
export const MAX_ARCHITECTURE_UI_BYTES = 700_000;
