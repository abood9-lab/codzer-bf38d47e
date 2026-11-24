import type { ParsedArtifact, WorkspaceFile } from "@/lib/types";

export function inferLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    py: "python",
    sql: "sql",
    sh: "bash",
  };
  return map[ext] ?? "text";
}

export function parseArtifactsFromText(content: string): {
  cleanMarkdown: string;
  artifacts: ParsedArtifact[];
} {
  const artifacts: ParsedArtifact[] = [];
  const artifactRegex = /<boltArtifact\b([^>]*)>([\s\S]*?)(?:<\/boltArtifact>|$)/g;
  let cleanMarkdown = content;

  let match: RegExpExecArray | null;
  while ((match = artifactRegex.exec(content)) !== null) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const idMatch = /id="([^"]+)"/.exec(attrs);
    const titleMatch = /title="([^"]+)"/.exec(attrs);

    const files: WorkspaceFile[] = [];
    const commands: string[] = [];

    const actionRegex = /<boltAction\b([^>]*)>([\s\S]*?)(?:<\/boltAction>|$)/g;
    let actionMatch: RegExpExecArray | null;
    while ((actionMatch = actionRegex.exec(body)) !== null) {
      const actionAttrs = actionMatch[1] ?? "";
      const actionBody = (actionMatch[2] ?? "").replace(/^\n/, "");
      const typeMatch = /type="([^"]+)"/.exec(actionAttrs);
      const pathMatch = /filePath="([^"]+)"/.exec(actionAttrs);

      if (typeMatch?.[1] === "file" && pathMatch?.[1]) {
        const filePath = pathMatch[1].replace(/^\/+/, "");
        files.push({
          path: filePath,
          content: actionBody,
          language: inferLanguage(filePath),
        });
      } else if (typeMatch?.[1] === "shell" && actionBody.trim()) {
        commands.push(actionBody.trim());
      }
    }

    artifacts.push({
      id: idMatch?.[1] ?? `artifact-${artifacts.length + 1}`,
      title: titleMatch?.[1] ?? "Generated Project",
      files,
      commands,
    });
  }

  cleanMarkdown = cleanMarkdown
    .replace(artifactRegex, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanMarkdown, artifacts };
}

export function buildPreviewHtml(files: Record<string, WorkspaceFile>): string {
  const fileList = Object.values(files);
  if (fileList.length === 0) {
    return `<!doctype html><html><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#64748b;background:#f8fafc;"><div>Ask Whiterchat to build an app and its live preview will render here.</div></body></html>`;
  }

  const htmlFile =
    fileList.find((f) => f.path.toLowerCase() === "index.html") ??
    fileList.find((f) => f.path.toLowerCase().endsWith(".html"));

  const cssContent = fileList
    .filter((f) => f.path.endsWith(".css"))
    .map((f) => f.content)
    .join("\n");

  const jsContent = fileList
    .filter((f) => f.path.endsWith(".js") && !f.path.includes("config"))
    .map((f) => f.content)
    .join("\n");

  if (htmlFile) {
    let html = htmlFile.content;
    if (cssContent && !html.includes(cssContent.slice(0, 40))) {
      html = html.replace("</head>", `<style>${cssContent}</style></head>`);
    }
    if (jsContent && !html.includes(jsContent.slice(0, 40))) {
      html = html.replace("</body>", `<script>${jsContent}</script></body>`);
    }
    return html;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #ffffff; color: #0f172a; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>${jsContent}</script>
</body>
</html>`;
}