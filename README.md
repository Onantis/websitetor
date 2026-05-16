# Websitetor

Download full websites with all assets, including HTML, CSS, JS, JSON, TXT, and archived snapshots from the Wayback Machine.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Archived Version](#archived-version)
  - [Validate a Downloaded Site](#validate-a-downloaded-site)
  - [CLI](#cli)
- [API](#api)
  - [download](#downloadurl-destination-options)
  - [validate](#validatepath)
- [CLI Commands](#cli-commands)
- [Project Structure](#project-structure)
- [License](#license)

## Introduction

Websitetor is a Node.js package for downloading complete websites to disk. It handles recursive crawling, resolves relative and absolute links, collects all referenced assets, and preserves the original folder structure. It supports both live sites and archival snapshots via the Wayback Machine.

## Features

- Downloads HTML, CSS, JS, JSON, TXT, images, fonts, and media
- Archived website support via the Wayback Machine
- Recursive link crawling with configurable depth
- Parallel downloads with configurable concurrency
- Validates downloaded sites for broken internal links and missing assets
- CLI and programmatic API
- Returns a structured result with file count and error details

## Installation

```bash
npm install websitetor
```

## Usage

### Basic Usage

```js
import { download } from "websitetor";

download("https://example.com", "./example-site")
  .then(() => console.log("Download completed."))
  .catch(console.error);
```

### Archived Version

```js
import { download } from "websitetor";

download("https://example.com", "./example-archive", { wayback: true })
  .then(() => console.log("Archived download completed."))
  .catch(console.error);
```

### Validate a Downloaded Site

```js
import { validate } from "websitetor";

const result = validate("./example-site");

if (result.valid) {
  console.log("Site is complete. No broken links or missing assets.");
} else {
  console.log(`Broken links: ${result.brokenLinks.length}`);
  console.log(`Missing assets: ${result.missingAssets.length}`);
}
```

### CLI

```bash
# Download a live website
websitetor download https://example.com ./example-site

# Download from the Wayback Machine
websitetor download https://example.com ./example-archive --wayback

# Set recursion depth
websitetor download https://example.com ./example-site --depth 3

# Set concurrency
websitetor download https://example.com ./example-site --concurrency 5

# Validate a downloaded site
websitetor validate ./example-site

# Validate and output JSON
websitetor validate ./example-site --json

# List available commands
websitetor list
```

## API

### `download(url, destination, options?)`

Downloads a website and saves all resources to the destination directory.

```ts
download(url: string, destination: string, options?: DownloadOptions): Promise<DownloadResult>
```

#### DownloadOptions

```ts
interface DownloadOptions {
  wayback?: boolean;      // Fetch from the Wayback Machine. Default: false
  depth?: number;         // Maximum recursion depth. Default: 5
  concurrency?: number;   // Parallel downloads. Default: 3
}
```

#### DownloadResult

```ts
interface DownloadResult {
  success: boolean;
  filesDownloaded: number;
  errors: Array<{
    url: string;
    message: string;
  }>;
  archived: boolean;
}
```

Example:

```json
{
  "success": true,
  "filesDownloaded": 42,
  "errors": [
    {
      "url": "https://example.com/missing.js",
      "message": "Resource not found"
    }
  ],
  "archived": false
}
```

---

### `validate(path)`

Scans a previously downloaded site directory for broken internal links and missing assets. Parses every HTML file and checks that all referenced resources exist on disk.

```ts
validate(sitePath: string): ValidationResult
```

#### ValidationResult

```ts
interface ValidationResult {
  valid: boolean;
  htmlFiles: number;
  brokenLinks: Array<{
    file: string;
    href: string;
    reason: string;
  }>;
  missingAssets: Array<{
    file: string;
    src: string;
    reason: string;
  }>;
}
```

Example:

```json
{
  "valid": false,
  "htmlFiles": 5,
  "brokenLinks": [
    {
      "file": "index.html",
      "href": "/about.html",
      "reason": "File not found on disk"
    }
  ],
  "missingAssets": [
    {
      "file": "index.html",
      "src": "/images/logo.png",
      "reason": "Asset not found on disk"
    }
  ]
}
```

## CLI Commands

| Command                              | Description                                              |
| ------------------------------------ | -------------------------------------------------------- |
| `websitetor list`                    | List all available commands and options                  |
| `websitetor download <url> <dest>`   | Download a website to a local directory                  |
| `websitetor validate <path>`         | Scan a downloaded site for broken links and missing assets |

### `download` options

| Option                   | Description                                          | Default |
| ------------------------ | ---------------------------------------------------- | ------- |
| `--wayback`              | Use the Wayback Machine instead of the live site     | `false` |
| `--depth <number>`       | Maximum link recursion depth                         | `5`     |
| `--concurrency <number>` | Number of files downloaded in parallel               | `3`     |

### `validate` options

| Option   | Description                        | Default |
| -------- | ---------------------------------- | ------- |
| `--json` | Output the full result as JSON     | `false` |

## Project Structure

```
websitetor/
├── src/
│   ├── downloader/       # Core crawl and download engine
│   ├── resolver/         # HTML and CSS link extraction
│   ├── archiver/         # Wayback Machine integration
│   ├── validator/        # Broken link and missing asset scanner
│   ├── utils/            # URL helpers and path mapping
│   ├── cli/              # CLI entry point
│   └── index.ts          # Public API exports
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT License © 2026 Onantis
