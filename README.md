# Websitetor

Download full websites with all assets, including HTML, CSS, JS, JSON, TXT, and archived snapshots from the Wayback Machine.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Archived Version](#archived-version)
  - [CLI](#cli)
- [API](#api)
  - [Options](#options)
  - [Result](#result)
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

# List available commands
websitetor list
```

## API

### `download(url, destination, options?)`

Downloads a website and saves all resources to the destination directory.

```ts
download(url: string, destination: string, options?: DownloadOptions): Promise<DownloadResult>
```

### Options

```ts
interface DownloadOptions {
  wayback?: boolean;      // Fetch from the Wayback Machine. Default: false
  depth?: number;         // Maximum recursion depth. Default: 5
  concurrency?: number;   // Parallel downloads. Default: 3
}
```

### Result

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

## CLI Commands

| Command                              | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `websitetor list`                    | List all available commands and options  |
| `websitetor download <url> <dest>`   | Download a website to a local directory  |

### `download` options

| Option                  | Description                                          | Default |
| ----------------------- | ---------------------------------------------------- | ------- |
| `--wayback`             | Use the Wayback Machine instead of the live site     | `false` |
| `--depth <number>`      | Maximum link recursion depth                         | `5`     |
| `--concurrency <number>`| Number of files downloaded in parallel               | `3`     |

## Project Structure

```
websitetor/
├── src/
│   ├── downloader/       # Core crawl and download engine
│   ├── resolver/         # HTML and CSS link extraction
│   ├── archiver/         # Wayback Machine integration
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
