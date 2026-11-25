import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createProjectZip, makeWorkspaceFile, normalizeFilePath, conversationMarkdown } from "@/lib/workspace-tools";

describe("Workspace files", () => {
  it("rejects paths outside a project", () => {
    expect(() => normalizeFilePath("../private.txt")).toThrow();
    expect(() => normalizeFilePath("/etc/passwd")).toThrow();
  });
  it("excludes credential files", () => {
    expect(() => normalizeFilePath(".env.local")).toThrow();
    expect(() => normalizeFilePath("config/server.key")).toThrow();
  });
  it("exports edited files with their original paths and content", () => {
    const file = makeWorkspaceFile("src/app.js", "console.log('saved edit')");
    const entry = unzipSync(createProjectZip({ [file.path]: file }))["src/app.js"];
    expect(entry).toBeDefined();
    if (!entry) throw new Error("Missing archive entry");
    expect(strFromU8(entry)).toBe("console.log('saved edit')");
  });
  it("preserves both sides of an exported conversation", () => {
    expect(conversationMarkdown([{ id: "u", role: "user", content: "Build a notebook" }, { id: "a", role: "assistant", content: "Notebook created" }])).toBe("## You\n\nBuild a notebook\n\n---\n\n## Whiterchat\n\nNotebook created");
  });
});