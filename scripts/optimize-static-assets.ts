import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import sharp from "sharp";
import ts from "typescript";

import {
  GIF_OPTIMIZATION_COMMANDS,
  GIF_OPTIMIZATION_LARGE_FILE_COMMANDS,
  GIF_OPTIMIZATION_LARGE_FILE_THRESHOLD_BYTES,
  GIF_OPTIMIZATION_TARGET_MAX_BYTES,
  GIF_OPTIMIZATION_TARGET_MIN_BYTES,
  IMAGE_OPTIMIZATION_MAX_LONG_EDGE_PX,
  IMAGE_OPTIMIZATION_OUTPUT_EXTENSION,
  IMAGE_OPTIMIZATION_QUALITY_STEPS,
  IMAGE_OPTIMIZATION_TARGET_MAX_SIZE_BYTES,
  VIDEO_OPTIMIZATION_COMPRESSION_STAGES,
  VIDEO_OPTIMIZATION_TARGET_MAX_BYTES,
  type VideoOptimizationStage,
} from "../src/utils/media/asset-optimization.constants";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static") as string | null;
const ffprobeStatic = require("ffprobe-static") as { path?: string };
const gifsiclePath = require("gifsicle") as string;

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = path.dirname(SCRIPT_PATH);
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, "..");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const ASSETS_DIR = path.join(SRC_DIR, "assets");
const TMP_ROOT = path.join(tmpdir(), "xpoll-static-asset-optimizer");

const MEDIA_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
  ".avi",
  ".m4v",
]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".scss"]);

type AssetKind = "image" | "gif" | "video";

type AssetFile = {
  absolutePath: string;
  relativeFromProject: string;
  relativeFromSrc: string;
  size: number;
  extension: string;
  kind: AssetKind;
};

type SourceReference = {
  filePath: string;
  start: number;
  end: number;
  value: string;
  resolvedAssetPath: string;
};

type AssetJob = AssetFile & {
  outputPath: string;
  outputRelativeFromProject: string;
  references: SourceReference[];
};

type FileReplacement = {
  start: number;
  end: number;
  nextValue: string;
};

type VideoMetadata = {
  durationSeconds: number;
  width?: number;
  height?: number;
};

type OptimizationResult = {
  job: AssetJob;
  tempOutputPath: string;
  outputBytes: number;
  keptOriginalBytes: boolean;
};

function toPosix(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function relativeFromProject(filePath: string) {
  return toPosix(path.relative(PROJECT_ROOT, filePath));
}

function replaceFileExtension(filePath: string, nextExtension: string) {
  const normalizedExtension = nextExtension.replace(/^\./, "");
  const extension = path.extname(filePath);

  if (!extension) {
    return `${filePath}.${normalizedExtension}`;
  }

  return `${filePath.slice(0, -extension.length)}.${normalizedExtension}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function walkFiles(rootDir: string): string[] {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function detectAssetKind(extension: string): AssetKind | null {
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (extension === ".gif") return "gif";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return null;
}

function scanAssetFiles(): AssetFile[] {
  return walkFiles(ASSETS_DIR)
    .map((absolutePath) => {
      const extension = path.extname(absolutePath).toLowerCase();
      const kind = detectAssetKind(extension);
      if (!kind) return null;

      return {
        absolutePath,
        relativeFromProject: relativeFromProject(absolutePath),
        relativeFromSrc: toPosix(path.relative(SRC_DIR, absolutePath)),
        size: statSync(absolutePath).size,
        extension,
        kind,
      } satisfies AssetFile;
    })
    .filter((asset): asset is AssetFile => asset !== null);
}

function scanCodeFiles(): string[] {
  return walkFiles(SRC_DIR).filter((filePath) => {
    if (filePath.startsWith(ASSETS_DIR)) return false;
    return CODE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
  });
}

function stripQueryString(value: string) {
  const queryIndex = value.indexOf("?");
  if (queryIndex === -1) {
    return { withoutQuery: value, querySuffix: "" };
  }

  return {
    withoutQuery: value.slice(0, queryIndex),
    querySuffix: value.slice(queryIndex),
  };
}

function resolveAssetReference(filePath: string, value: string) {
  const { withoutQuery } = stripQueryString(value);
  let resolvedPath: string | null = null;

  if (withoutQuery.startsWith("@/")) {
    resolvedPath = path.join(SRC_DIR, withoutQuery.slice(2));
  } else if (withoutQuery.startsWith("/src/")) {
    resolvedPath = path.join(PROJECT_ROOT, withoutQuery.slice(1));
  } else if (withoutQuery.startsWith("assets/")) {
    resolvedPath = path.join(SRC_DIR, withoutQuery);
  } else if (
    withoutQuery.startsWith("./") ||
    withoutQuery.startsWith("../")
  ) {
    resolvedPath = path.resolve(path.dirname(filePath), withoutQuery);
  }

  if (!resolvedPath) return null;
  if (!resolvedPath.startsWith(ASSETS_DIR)) return null;
  if (!existsSync(resolvedPath)) return null;
  if (!MEDIA_EXTENSIONS.has(path.extname(resolvedPath).toLowerCase())) return null;

  return resolvedPath;
}

function collectReferencesFromScriptLikeFile(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : filePath.endsWith(".ts")
        ? ts.ScriptKind.TS
        : filePath.endsWith(".jsx")
          ? ts.ScriptKind.JSX
          : ts.ScriptKind.JS,
  );

  const refs: SourceReference[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node)
    ) {
      const value = node.text;
      const resolvedAssetPath = resolveAssetReference(filePath, value);
      if (resolvedAssetPath) {
        refs.push({
          filePath,
          start: node.getStart(sourceFile) + 1,
          end: node.getEnd() - 1,
          value,
          resolvedAssetPath,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return refs;
}

function collectReferencesFromStyleFile(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  const refs: SourceReference[] = [];
  const regex =
    /(["'`])([^"'`\n]+\.(?:png|jpe?g|webp|gif|mp4|mov|webm|mkv|avi|m4v)(?:\?[^"'`\n]+)?)\1/g;

  for (const match of content.matchAll(regex)) {
    const value = match[2];
    const valueStart = (match.index ?? 0) + 1;
    const resolvedAssetPath = resolveAssetReference(filePath, value);

    if (!resolvedAssetPath) continue;

    refs.push({
      filePath,
      start: valueStart,
      end: valueStart + value.length,
      value,
      resolvedAssetPath,
    });
  }

  return refs;
}

function collectSourceReferences(codeFiles: string[]) {
  const references = new Map<string, SourceReference[]>();

  for (const filePath of codeFiles) {
    const extension = path.extname(filePath).toLowerCase();
    const refs = extension === ".css" || extension === ".scss"
      ? collectReferencesFromStyleFile(filePath)
      : collectReferencesFromScriptLikeFile(filePath);

    for (const ref of refs) {
      const existing = references.get(ref.resolvedAssetPath) ?? [];
      existing.push(ref);
      references.set(ref.resolvedAssetPath, existing);
    }
  }

  return references;
}

function getOutputPath(asset: AssetFile) {
  switch (asset.kind) {
    case "image":
      return replaceFileExtension(
        asset.absolutePath,
        IMAGE_OPTIMIZATION_OUTPUT_EXTENSION,
      );
    case "video":
      return replaceFileExtension(asset.absolutePath, "mp4");
    case "gif":
    default:
      return replaceFileExtension(asset.absolutePath, "gif");
  }
}

function buildAssetJobs(
  assets: AssetFile[],
  referencesByAssetPath: Map<string, SourceReference[]>,
) {
  const usedJobs: AssetJob[] = [];
  const unusedAssets: AssetFile[] = [];

  for (const asset of assets) {
    const references = referencesByAssetPath.get(asset.absolutePath) ?? [];
    if (!references.length) {
      unusedAssets.push(asset);
      continue;
    }

    const outputPath = getOutputPath(asset);
    usedJobs.push({
      ...asset,
      outputPath,
      outputRelativeFromProject: relativeFromProject(outputPath),
      references,
    });
  }

  return { usedJobs, unusedAssets };
}

function assertNoOutputCollisions(usedJobs: AssetJob[], unusedAssets: AssetFile[]) {
  const unusedPaths = new Set(unusedAssets.map((asset) => asset.absolutePath));
  const seenOutputs = new Map<string, string>();

  for (const job of usedJobs) {
    const existing = seenOutputs.get(job.outputPath);
    if (existing && existing !== job.absolutePath) {
      throw new Error(
        `Two assets would collide at ${relativeFromProject(job.outputPath)}: ${relativeFromProject(existing)} and ${job.relativeFromProject}.`,
      );
    }
    seenOutputs.set(job.outputPath, job.absolutePath);

    if (
      existsSync(job.outputPath) &&
      job.outputPath !== job.absolutePath &&
      !unusedPaths.has(job.outputPath)
    ) {
      throw new Error(
        `Optimized output ${relativeFromProject(job.outputPath)} would overwrite an existing kept file.`,
      );
    }
  }
}

function getImageResizeDimensions(width?: number, height?: number) {
  if (!width || !height) return {};
  const longEdge = Math.max(width, height);
  if (longEdge <= IMAGE_OPTIMIZATION_MAX_LONG_EDGE_PX) return {};

  if (width >= height) {
    return { width: IMAGE_OPTIMIZATION_MAX_LONG_EDGE_PX };
  }

  return { height: IMAGE_OPTIMIZATION_MAX_LONG_EDGE_PX };
}

async function optimizeImageAsset(
  job: AssetJob,
  tempOutputPath: string,
): Promise<OptimizationResult> {
  const metadata = await sharp(job.absolutePath).metadata();
  const resizeOptions = getImageResizeDimensions(metadata.width, metadata.height);

  let bestBuffer: Buffer | null = null;
  let bestSize = Number.POSITIVE_INFINITY;

  for (const quality of IMAGE_OPTIMIZATION_QUALITY_STEPS) {
    let pipeline = sharp(job.absolutePath).rotate();

    if (resizeOptions.width || resizeOptions.height) {
      pipeline = pipeline.resize({
        ...resizeOptions,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const buffer = await pipeline.webp({
      quality,
      effort: 6,
      alphaQuality: quality,
      smartSubsample: true,
    }).toBuffer();

    if (buffer.byteLength < bestSize) {
      bestBuffer = buffer;
      bestSize = buffer.byteLength;
    }

    if (buffer.byteLength <= IMAGE_OPTIMIZATION_TARGET_MAX_SIZE_BYTES) {
      bestBuffer = buffer;
      break;
    }
  }

  if (!bestBuffer) {
    throw new Error(`Failed to optimize ${job.relativeFromProject}.`);
  }

  await mkdir(path.dirname(tempOutputPath), { recursive: true });
  await writeFile(tempOutputPath, bestBuffer);

  return {
    job,
    tempOutputPath,
    outputBytes: bestBuffer.byteLength,
    keptOriginalBytes: false,
  };
}

function runBinary(
  executablePath: string,
  args: string[],
  label: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(executablePath, args, {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${label} failed with exit code ${String(code)}.${stderr ? ` ${stderr.trim()}` : ""}`,
        ),
      );
    });
  });
}

function parseGifCommand(command: string, inputPath: string, outputPath: string) {
  return command
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token === "input.gif") return inputPath;
      if (token === "/out/out.gif") return outputPath;
      return token;
    });
}

async function optimizeGifAsset(
  job: AssetJob,
  tempOutputPath: string,
): Promise<OptimizationResult> {
  if (job.size <= GIF_OPTIMIZATION_TARGET_MAX_BYTES) {
    await mkdir(path.dirname(tempOutputPath), { recursive: true });
    await copyFile(job.absolutePath, tempOutputPath);
    return {
      job,
      tempOutputPath,
      outputBytes: job.size,
      keptOriginalBytes: true,
    };
  }

  const commands =
    job.size > GIF_OPTIMIZATION_LARGE_FILE_THRESHOLD_BYTES
      ? GIF_OPTIMIZATION_LARGE_FILE_COMMANDS
      : GIF_OPTIMIZATION_COMMANDS;

  let bestCandidatePath: string | null = null;
  let bestCandidateSize = Number.POSITIVE_INFINITY;
  let candidateWithinMaxPath: string | null = null;
  let candidateWithinMaxSize = Number.POSITIVE_INFINITY;

  for (let index = 0; index < commands.length; index += 1) {
    const stageOutputPath = path.join(
      TMP_ROOT,
      "gif-stages",
      `${path.basename(job.absolutePath, path.extname(job.absolutePath))}-${index}.gif`,
    );

    await mkdir(path.dirname(stageOutputPath), { recursive: true });
    await runBinary(
      gifsiclePath,
      parseGifCommand(commands[index], job.absolutePath, stageOutputPath),
      `GIF optimization (${job.relativeFromProject})`,
    );

    const size = statSync(stageOutputPath).size;
    if (size < bestCandidateSize) {
      bestCandidatePath = stageOutputPath;
      bestCandidateSize = size;
    }

    if (size <= GIF_OPTIMIZATION_TARGET_MAX_BYTES && size < candidateWithinMaxSize) {
      candidateWithinMaxPath = stageOutputPath;
      candidateWithinMaxSize = size;
    }

    if (
      size >= GIF_OPTIMIZATION_TARGET_MIN_BYTES &&
      size <= GIF_OPTIMIZATION_TARGET_MAX_BYTES
    ) {
      bestCandidatePath = stageOutputPath;
      bestCandidateSize = size;
      break;
    }
  }

  const chosenPath = bestCandidateSize <= GIF_OPTIMIZATION_TARGET_MAX_BYTES
    ? bestCandidatePath
    : candidateWithinMaxPath;

  if (!chosenPath || !bestCandidatePath) {
    throw new Error(
      `${job.relativeFromProject} could not be compressed under ${formatBytes(GIF_OPTIMIZATION_TARGET_MAX_BYTES)}.`,
    );
  }

  const chosenSize = statSync(chosenPath).size;
  if (chosenSize >= job.size) {
    throw new Error(
      `${job.relativeFromProject} did not get smaller during GIF optimization.`,
    );
  }

  await mkdir(path.dirname(tempOutputPath), { recursive: true });
  await copyFile(chosenPath, tempOutputPath);

  return {
    job,
    tempOutputPath,
    outputBytes: chosenSize,
    keptOriginalBytes: false,
  };
}

function getVideoBudgetKbps(durationSeconds: number, audioKbps: number) {
  const targetBits = VIDEO_OPTIMIZATION_TARGET_MAX_BYTES * 8 * 0.96;
  const totalKbps = Math.floor(targetBits / Math.max(durationSeconds, 1) / 1000);
  return Math.max(totalKbps - audioKbps, 120);
}

function resolveStageValue(
  value: number | ((durationSeconds: number) => number),
  durationSeconds: number,
) {
  return typeof value === "function" ? value(durationSeconds) : value;
}

function getVideoScaleFilter(maxWidth: number, maxFps?: number) {
  const filters = [
    `scale='min(${maxWidth},iw)':-2:force_original_aspect_ratio=decrease`,
    "pad=ceil(iw/2)*2:ceil(ih/2)*2",
  ];

  if (maxFps) {
    filters.push(`fps=${maxFps}`);
  }

  return filters.join(",");
}

async function probeVideo(inputPath: string): Promise<VideoMetadata> {
  if (!ffprobeStatic.path) {
    throw new Error("ffprobe-static did not provide a binary path.");
  }

  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "format=duration:stream=width,height",
      "-of",
      "json",
      inputPath,
    ];
    const child = execFile(ffprobeStatic.path, args, {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffprobe failed for ${relativeFromProject(inputPath)}.${stderr ? ` ${stderr.trim()}` : ""}`,
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const durationSeconds = Number(parsed?.format?.duration);
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
          reject(new Error(`Video duration could not be detected for ${relativeFromProject(inputPath)}.`));
          return;
        }

        resolve({
          durationSeconds,
          width: Number(parsed?.streams?.[0]?.width) || undefined,
          height: Number(parsed?.streams?.[0]?.height) || undefined,
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

function buildVideoStageArgs(
  inputPath: string,
  outputPath: string,
  stage: VideoOptimizationStage,
  metadata: VideoMetadata,
) {
  if (stage.kind === "crf") {
    return [
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-map_metadata",
      "-1",
      "-vf",
      getVideoScaleFilter(stage.maxWidth),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      String(stage.crf),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      `${stage.audioKbps}k`,
      outputPath,
    ];
  }

  const audioKbps = resolveStageValue(stage.audioKbps, metadata.durationSeconds);
  const maxWidth = resolveStageValue(stage.maxWidth, metadata.durationSeconds);
  const videoKbps = getVideoBudgetKbps(metadata.durationSeconds, audioKbps);

  return [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-map_metadata",
    "-1",
    "-vf",
    getVideoScaleFilter(maxWidth, stage.maxFps),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    `${videoKbps}k`,
    "-maxrate",
    `${videoKbps}k`,
    "-bufsize",
    `${videoKbps * 2}k`,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    `${audioKbps}k`,
    outputPath,
  ];
}

async function optimizeVideoAsset(
  job: AssetJob,
  tempOutputPath: string,
): Promise<OptimizationResult> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path.");
  }

  const metadata = await probeVideo(job.absolutePath);
  const isOriginalMp4 = job.extension === ".mp4";
  let bestCandidatePath: string | null = null;
  let bestCandidateSize = Number.POSITIVE_INFINITY;

  for (let index = 0; index < VIDEO_OPTIMIZATION_COMPRESSION_STAGES.length; index += 1) {
    const stage = VIDEO_OPTIMIZATION_COMPRESSION_STAGES[index];
    const stageOutputPath = path.join(
      TMP_ROOT,
      "video-stages",
      `${path.basename(job.absolutePath, path.extname(job.absolutePath))}-${index}.mp4`,
    );
    await mkdir(path.dirname(stageOutputPath), { recursive: true });
    await runBinary(
      ffmpegPath,
      buildVideoStageArgs(job.absolutePath, stageOutputPath, stage, metadata),
      `Video optimization (${job.relativeFromProject})`,
    );

    const stageSize = statSync(stageOutputPath).size;
    if (stageSize < bestCandidateSize) {
      bestCandidatePath = stageOutputPath;
      bestCandidateSize = stageSize;
    }

    if (stageSize <= VIDEO_OPTIMIZATION_TARGET_MAX_BYTES) {
      bestCandidatePath = stageOutputPath;
      bestCandidateSize = stageSize;
      break;
    }
  }

  if (
    isOriginalMp4 &&
    job.size <= VIDEO_OPTIMIZATION_TARGET_MAX_BYTES &&
    bestCandidateSize >= job.size
  ) {
    await mkdir(path.dirname(tempOutputPath), { recursive: true });
    await copyFile(job.absolutePath, tempOutputPath);
    return {
      job,
      tempOutputPath,
      outputBytes: job.size,
      keptOriginalBytes: true,
    };
  }

  if (!bestCandidatePath || bestCandidateSize > VIDEO_OPTIMIZATION_TARGET_MAX_BYTES) {
    throw new Error(
      `${job.relativeFromProject} could not be compressed under ${formatBytes(VIDEO_OPTIMIZATION_TARGET_MAX_BYTES)}.`,
    );
  }

  await mkdir(path.dirname(tempOutputPath), { recursive: true });
  await copyFile(bestCandidatePath, tempOutputPath);

  return {
    job,
    tempOutputPath,
    outputBytes: bestCandidateSize,
    keptOriginalBytes: false,
  };
}

function renderSummary(usedJobs: AssetJob[], unusedAssets: AssetFile[]) {
  const grouped = usedJobs.reduce<Record<AssetKind, number>>(
    (accumulator, job) => {
      accumulator[job.kind] += 1;
      return accumulator;
    },
    { image: 0, gif: 0, video: 0 },
  );

  console.log("Static asset optimization plan");
  console.log(`- Used media files: ${usedJobs.length}`);
  console.log(`- Unused media files to remove: ${unusedAssets.length}`);
  console.log(
    `- Used by type: ${grouped.image} images, ${grouped.gif} gifs, ${grouped.video} videos`,
  );

  if (unusedAssets.length) {
    console.log("\nUnused media");
    for (const asset of unusedAssets) {
      console.log(`- ${asset.relativeFromProject} (${formatBytes(asset.size)})`);
    }
  }
}

function getUpdatedReferenceValue(
  reference: SourceReference,
  nextAssetPath: string,
) {
  const { withoutQuery, querySuffix } = stripQueryString(reference.value);
  let nextBase = withoutQuery;

  if (withoutQuery.startsWith("@/")) {
    nextBase = `@/${toPosix(path.relative(SRC_DIR, nextAssetPath))}`;
  } else if (withoutQuery.startsWith("/src/")) {
    nextBase = `/src/${toPosix(path.relative(SRC_DIR, nextAssetPath))}`;
  } else if (withoutQuery.startsWith("assets/")) {
    nextBase = toPosix(path.relative(SRC_DIR, nextAssetPath));
  } else if (
    withoutQuery.startsWith("./") ||
    withoutQuery.startsWith("../")
  ) {
    const nextRelative = toPosix(
      path.relative(path.dirname(reference.filePath), nextAssetPath),
    );
    nextBase = nextRelative.startsWith(".") ? nextRelative : `./${nextRelative}`;
  }

  return `${nextBase}${querySuffix}`;
}

function applyFileReplacements(content: string, replacements: FileReplacement[]) {
  const ordered = [...replacements].sort((left, right) => right.start - left.start);
  let nextContent = content;

  for (const replacement of ordered) {
    nextContent =
      nextContent.slice(0, replacement.start) +
      replacement.nextValue +
      nextContent.slice(replacement.end);
  }

  return nextContent;
}

async function writeOptimizedOutputs(results: OptimizationResult[]) {
  for (const result of results) {
    await mkdir(path.dirname(result.job.outputPath), { recursive: true });
    await copyFile(result.tempOutputPath, result.job.outputPath);
  }
}

async function rewriteSourceFiles(results: OptimizationResult[]) {
  const replacementsByFile = new Map<string, FileReplacement[]>();

  for (const result of results) {
    for (const reference of result.job.references) {
      const nextValue = getUpdatedReferenceValue(reference, result.job.outputPath);
      if (nextValue === reference.value) continue;
      const existing = replacementsByFile.get(reference.filePath) ?? [];
      existing.push({
        start: reference.start,
        end: reference.end,
        nextValue,
      });
      replacementsByFile.set(reference.filePath, existing);
    }
  }

  for (const [filePath, replacements] of replacementsByFile.entries()) {
    const content = readFileSync(filePath, "utf8");
    const nextContent = applyFileReplacements(content, replacements);
    if (nextContent !== content) {
      await writeFile(filePath, nextContent);
    }
  }
}

async function removeSupersededAssets(
  results: OptimizationResult[],
  unusedAssets: AssetFile[],
) {
  const keepPaths = new Set(results.map((result) => result.job.outputPath));
  const removePaths = new Set<string>();

  for (const result of results) {
    if (result.job.absolutePath !== result.job.outputPath) {
      removePaths.add(result.job.absolutePath);
    }
  }

  for (const asset of unusedAssets) {
    if (!keepPaths.has(asset.absolutePath)) {
      removePaths.add(asset.absolutePath);
    }
  }

  for (const filePath of removePaths) {
    await rm(filePath, { force: true });
  }
}

async function optimizeJob(job: AssetJob, tempRoot: string) {
  const tempOutputPath = path.join(
    tempRoot,
    job.outputRelativeFromProject,
  );

  switch (job.kind) {
    case "image":
      return optimizeImageAsset(job, tempOutputPath);
    case "gif":
      return optimizeGifAsset(job, tempOutputPath);
    case "video":
      return optimizeVideoAsset(job, tempOutputPath);
    default:
      throw new Error(`Unsupported asset kind for ${job.relativeFromProject}.`);
  }
}

async function runWriteMode(usedJobs: AssetJob[], unusedAssets: AssetFile[]) {
  await rm(TMP_ROOT, { recursive: true, force: true });
  await mkdir(TMP_ROOT, { recursive: true });

  const results: OptimizationResult[] = [];
  for (const job of usedJobs) {
    console.log(`Optimizing ${job.relativeFromProject} -> ${job.outputRelativeFromProject}`);
    results.push(await optimizeJob(job, TMP_ROOT));
  }

  await writeOptimizedOutputs(results);
  await rewriteSourceFiles(results);
  await removeSupersededAssets(results, unusedAssets);

  const totalBefore = usedJobs.reduce((sum, job) => sum + job.size, 0);
  const totalAfter = results.reduce((sum, result) => sum + result.outputBytes, 0);

  console.log("\nOptimization complete");
  console.log(`- Before: ${formatBytes(totalBefore)}`);
  console.log(`- After: ${formatBytes(totalAfter)}`);
  console.log(`- Saved: ${formatBytes(Math.max(totalBefore - totalAfter, 0))}`);
}

function removeDeadCampaignVideoComment() {
  const filePath = path.join(SRC_DIR, "pages/campaigns/create.tsx");
  const content = readFileSync(filePath, "utf8");
  const nextContent = content.replace(
    /\n\/\/ import video from "@\/assets\/campaign\.mp4";[\s\S]*$/,
    "\n",
  );

  if (nextContent !== content) {
    writeFileSync(filePath, nextContent);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const assets = scanAssetFiles();
  const codeFiles = scanCodeFiles();
  const referencesByAssetPath = collectSourceReferences(codeFiles);
  const { usedJobs, unusedAssets } = buildAssetJobs(assets, referencesByAssetPath);

  assertNoOutputCollisions(usedJobs, unusedAssets);
  renderSummary(usedJobs, unusedAssets);

  if (dryRun) {
    console.log("\nDry run only. No files were changed.");
    return;
  }

  removeDeadCampaignVideoComment();
  await runWriteMode(usedJobs, unusedAssets);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
