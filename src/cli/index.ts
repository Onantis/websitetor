#!/usr/bin/env node

import { Command } from "commander";
import { download } from "../downloader";
import { validate } from "../validator";

const program = new Command();

program
  .name("websitetor")
  .description(
    "Download full websites with all assets, including HTML, CSS, JS, JSON, TXT, and archived snapshots from the Wayback Machine."
  )
  .version("1.0.0");

program
  .command("list")
  .description("List all available commands and their options")
  .action(() => {
    console.log("\nWebsitetor — Available Commands\n");

    const commands: Array<{
      name: string;
      usage: string;
      description: string;
      options: Array<{ flag: string; description: string; default?: string }>;
      examples: string[];
    }> = [
      {
        name: "list",
        usage: "websitetor list",
        description: "List all available commands and their options.",
        options: [],
        examples: ["websitetor list"],
      },
      {
        name: "download",
        usage: "websitetor download <url> <destination>",
        description:
          "Download a full website to a local directory. Crawls HTML pages recursively, following links and collecting all assets (CSS, JS, images, fonts, media).",
        options: [
          {
            flag: "--wayback",
            description:
              "Fetch from the Wayback Machine (web.archive.org) instead of the live site.",
            default: "false",
          },
          {
            flag: "--depth <number>",
            description:
              "Maximum link recursion depth. Higher values download more pages.",
            default: "5",
          },
          {
            flag: "--concurrency <number>",
            description: "Number of files to download in parallel.",
            default: "3",
          },
        ],
        examples: [
          "websitetor download https://example.com ./example-site",
          "websitetor download https://example.com ./archive --wayback",
          "websitetor download https://example.com ./site --depth 3 --concurrency 5",
        ],
      },
      {
        name: "validate",
        usage: "websitetor validate <path>",
        description:
          "Scan a previously downloaded site for broken internal links and missing assets. Checks all HTML files and reports any href or src references that do not resolve to a file on disk.",
        options: [
          {
            flag: "--json",
            description: "Output the full result as JSON.",
            default: "false",
          },
        ],
        examples: [
          "websitetor validate ./example-site",
          "websitetor validate ./example-site --json",
        ],
      },
    ];

    for (const cmd of commands) {
      console.log(`  ${cmd.name}`);
      console.log(`    Usage:       ${cmd.usage}`);
      console.log(`    Description: ${cmd.description}`);

      if (cmd.options.length > 0) {
        console.log("    Options:");
        for (const opt of cmd.options) {
          const defaultStr = opt.default !== undefined ? ` (default: ${opt.default})` : "";
          console.log(`      ${opt.flag.padEnd(24)} ${opt.description}${defaultStr}`);
        }
      }

      console.log("    Examples:");
      for (const ex of cmd.examples) {
        console.log(`      $ ${ex}`);
      }

      console.log();
    }
  });

program
  .command("download <url> <destination>")
  .description("Download a website to a local directory")
  .option("--wayback", "Use archival sources via the Wayback Machine", false)
  .option(
    "--depth <number>",
    "Maximum recursion depth for link crawling",
    (v) => parseInt(v, 10),
    5
  )
  .option(
    "--concurrency <number>",
    "Number of parallel downloads",
    (v) => parseInt(v, 10),
    3
  )
  .action(
    async (
      url: string,
      destination: string,
      opts: { wayback: boolean; depth: number; concurrency: number }
    ) => {
      const { wayback, depth, concurrency } = opts;

      console.log(`\nWebsitetor — starting download`);
      console.log(`  URL:         ${url}`);
      console.log(`  Destination: ${destination}`);
      console.log(`  Wayback:     ${wayback}`);
      console.log(`  Depth:       ${depth}`);
      console.log(`  Concurrency: ${concurrency}\n`);

      try {
        const result = await download(url, destination, {
          wayback,
          depth,
          concurrency,
        });

        console.log("\nResult:");
        console.log(JSON.stringify(result, null, 2));

        if (result.success) {
          console.log(`\nDownload completed! ${result.filesDownloaded} files saved to "${destination}".`);
        } else {
          console.error(
            `\nDownload finished with errors. ${result.filesDownloaded} files saved, ${result.errors.length} error(s).`
          );
          process.exit(1);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`\nFatal error: ${message}`);
        process.exit(1);
      }
    }
  );

program
  .command("validate <path>")
  .description("Scan a downloaded site for broken internal links and missing assets")
  .option("--json", "Output the full result as JSON", false)
  .action((sitePath: string, opts: { json: boolean }) => {
    console.log(`\nWebsitetor — validating "${sitePath}"\n`);

    try {
      const result = validate(sitePath);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.valid ? 0 : 1);
        return;
      }

      console.log(`  HTML files scanned: ${result.htmlFiles}`);
      console.log(`  Broken links:       ${result.brokenLinks.length}`);
      console.log(`  Missing assets:     ${result.missingAssets.length}`);
      console.log();

      if (result.brokenLinks.length > 0) {
        console.log("Broken Links:");
        for (const b of result.brokenLinks) {
          console.log(`  [${b.file}]  href="${b.href}"  — ${b.reason}`);
        }
        console.log();
      }

      if (result.missingAssets.length > 0) {
        console.log("Missing Assets:");
        for (const a of result.missingAssets) {
          console.log(`  [${a.file}]  src="${a.src}"  — ${a.reason}`);
        }
        console.log();
      }

      if (result.valid) {
        console.log("All links and assets resolved. Site looks complete.");
      } else {
        console.error(
          `Validation failed: ${result.brokenLinks.length} broken link(s), ${result.missingAssets.length} missing asset(s).`
        );
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nFatal error: ${message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
