import type { ReactNode } from "react";
import {
  Download,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "mpeg", "mpg", "ogg", "ogv", "webm"]);

const URL_PATTERN = /https?:\/\/[^\s<>"`]+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)\]]+$/;

type LinkKind = "image" | "video" | "link";

type MessageLink = {
  url: string;
  host: string;
  title: string;
  kind: LinkKind;
};

function sanitizeUrl(rawUrl: string) {
  const trailing = rawUrl.match(TRAILING_URL_PUNCTUATION)?.[0] ?? "";
  const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

  return { url, trailing };
}

function getFileExtension(pathname: string) {
  const filename = pathname.split("/").pop() ?? "";
  const extension = filename.split(".").pop();

  return extension?.toLowerCase() ?? "";
}

function getLinkKind(url: URL): LinkKind {
  const extension = getFileExtension(url.pathname);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  return "link";
}

function getLinkTitle(url: URL) {
  const filename = url.pathname.split("/").filter(Boolean).pop();

  if (!filename) {
    return url.hostname.replace(/^www\./, "");
  }

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
}

function getMessageLinks(text: string) {
  const links: MessageLink[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(URL_PATTERN)) {
    const { url } = sanitizeUrl(match[0]);

    if (seen.has(url)) {
      continue;
    }

    try {
      const parsed = new URL(url);
      seen.add(url);
      links.push({
        url,
        host: parsed.hostname.replace(/^www\./, ""),
        title: getLinkTitle(parsed),
        kind: getLinkKind(parsed),
      });
    } catch {
      continue;
    }
  }

  return links;
}

function ChatMessageText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const index = match.index ?? 0;
    const { url, trailing } = sanitizeUrl(rawUrl);

    if (index > cursor) {
      parts.push(text.slice(cursor, index));
    }

    parts.push(
      <a
        key={`${url}-${index}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-semibold underline underline-offset-2 transition hover:opacity-80"
      >
        {url}
      </a>,
    );

    if (trailing) {
      parts.push(trailing);
    }

    cursor = index + rawUrl.length;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <span className="block whitespace-pre-wrap break-words">{parts.length ? parts : text}</span>;
}

function ChatLinkPreviews({ text, className }: { text: string; className?: string }) {
  const links = getMessageLinks(text).slice(0, 2);

  if (!links.length) {
    return null;
  }

  return (
    <div className={cn("mt-2 flex flex-col gap-2", className)}>
      {links.map((link) => (
        <LinkPreviewCard key={link.url} link={link} />
      ))}
    </div>
  );
}

function LinkPreviewCard({ link }: { link: MessageLink }) {
  if (link.kind === "image") {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="group/link block w-full max-w-[260px] overflow-hidden rounded-[12px] border border-border/70 bg-background/95 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <img
          src={link.url}
          alt={link.title}
          loading="lazy"
          className="h-32 w-full bg-muted object-cover"
          referrerPolicy="no-referrer"
        />
        <span className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs">
          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-extrabold">{link.title}</span>
            <span className="block truncate text-muted-foreground">{link.host}</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover/link:text-foreground" />
        </span>
      </a>
    );
  }

  if (link.kind === "video") {
    return (
      <div className="w-full max-w-[280px] overflow-hidden rounded-[12px] border border-border/70 bg-background/95 text-foreground shadow-sm">
        <video
          src={link.url}
          controls
          preload="metadata"
          className="h-36 w-full bg-black object-contain"
        />
        <div className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs">
          <FileVideo className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-extrabold">{link.title}</span>
            <span className="block truncate text-muted-foreground">{link.host}</span>
          </span>
          <a
            href={link.url}
            download
            className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2 font-semibold transition hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      className="group/link flex w-full max-w-[260px] items-center gap-3 rounded-[12px] border border-border/70 bg-background/95 p-3 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
        <LinkIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-xs">
        <span className="block truncate font-extrabold">{link.title}</span>
        <span className="block truncate text-muted-foreground">{link.host}</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover/link:text-foreground" />
    </a>
  );
}

export { ChatLinkPreviews, ChatMessageText };
