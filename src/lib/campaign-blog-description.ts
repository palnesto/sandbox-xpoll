const HTML_TAG_RE = /<\/?(?:p|div|span|br|strong|em|b|i|u|a|ul|ol|li|blockquote|h[1-6]|pre|code)\b[^>]*>/i;

function decodeBasicHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function collapseWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function convertNodeListToMarkdown(nodes: NodeListOf<ChildNode> | ChildNode[], depth = 0): string {
  return Array.from(nodes)
    .map((node, index) => convertNodeToMarkdown(node, depth, index + 1))
    .join("");
}

function convertNodeToMarkdown(node: ChildNode, depth = 0, orderedIndex = 1): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return decodeBasicHtmlEntities(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = convertNodeListToMarkdown(element.childNodes, depth + 1).trim();

  switch (tag) {
    case "br":
      return "\n";
    case "p":
    case "div":
      return `${children}\n\n`;
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = Number(tag[1]);
      return `${"#".repeat(level)} ${children}\n\n`;
    }
    case "strong":
    case "b":
      return children ? `**${children}**` : "";
    case "em":
    case "i":
      return children ? `*${children}*` : "";
    case "u":
      return children;
    case "blockquote": {
      const lines = children
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `> ${line}`)
        .join("\n");
      return lines ? `${lines}\n\n` : "";
    }
    case "a": {
      const href = String(element.getAttribute("href") ?? "").trim();
      if (!href) return children;
      return `[${children || href}](${href})`;
    }
    case "ul": {
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child) => {
          const itemText = convertNodeListToMarkdown(child.childNodes, depth + 1).trim();
          return itemText ? `${"  ".repeat(depth)}- ${itemText}` : "";
        })
        .filter(Boolean)
        .join("\n");
      return items ? `${items}\n\n` : "";
    }
    case "ol": {
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child, index) => {
          const itemText = convertNodeListToMarkdown(child.childNodes, depth + 1).trim();
          return itemText ? `${"  ".repeat(depth)}${index + 1}. ${itemText}` : "";
        })
        .filter(Boolean)
        .join("\n");
      return items ? `${items}\n\n` : "";
    }
    case "li": {
      const prefix = `${"  ".repeat(depth)}${orderedIndex}. `;
      return `${prefix}${children}\n`;
    }
    case "pre":
      return children ? `\`\`\`\n${children}\n\`\`\`\n\n` : "";
    case "code":
      return children ? `\`${children}\`` : "";
    default:
      return `${children}${["section", "article"].includes(tag) ? "\n\n" : ""}`;
  }
}

export function isLegacyCampaignBlogHtml(content: string) {
  return HTML_TAG_RE.test(String(content ?? ""));
}

export function normalizeCampaignBlogMarkdown(content: string) {
  let normalized = String(content ?? "").replace(/\r\n/g, "\n");

  if (!normalized.includes("\n") && normalized.includes("\\n")) {
    normalized = normalized.replace(/\\n/g, "\n");
  }

  if (!normalized.includes("\t") && normalized.includes("\\t")) {
    normalized = normalized.replace(/\\t/g, "  ");
  }

  return normalized;
}

export function legacyCampaignBlogHtmlToMarkdown(html: string) {
  const raw = String(html ?? "").trim();
  if (!raw) return "";

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(raw, "text/html");
      const markdown = convertNodeListToMarkdown(doc.body.childNodes);
      return collapseWhitespace(markdown);
    } catch {
      // fall through to regex fallback below
    }
  }

  return collapseWhitespace(
    decodeBasicHtmlEntities(raw)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/div>/gi, "\n\n")
      .replace(/<div[^>]*>/gi, "")
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
      .replace(/<a[^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi, "[$2]($1)")
      .replace(/<[^>]+>/g, " "),
  );
}

export function campaignBlogMarkdownToPlainText(markdown: string) {
  return collapseWhitespace(
    normalizeCampaignBlogMarkdown(markdown)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\|/g, " ")
      .replace(/^\s*[-:]{3,}\s*$/gm, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

export function campaignBlogHtmlToPlainText(html: string) {
  return collapseWhitespace(
    decodeBasicHtmlEntities(String(html ?? ""))
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<\/div>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  );
}

export function campaignBlogDescriptionToPlainText(content: string) {
  const value = String(content ?? "");
  return isLegacyCampaignBlogHtml(value)
    ? campaignBlogHtmlToPlainText(value)
    : campaignBlogMarkdownToPlainText(value);
}

export function campaignBlogDescriptionHasMeaningfulText(content: string) {
  return campaignBlogDescriptionToPlainText(content).length > 0;
}

export function campaignBlogPlainTextExcerpt(content: string, maxLength: number) {
  const plain = campaignBlogDescriptionToPlainText(content);
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
