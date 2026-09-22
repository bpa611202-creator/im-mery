import path from "path";
import fs from "fs";

const DOCS_DIR = path.join(process.cwd(), "data", "documents");

// Ensure directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  // Seed with sample starter document
  const starterFile = path.join(DOCS_DIR, "welcome.md");
  if (!fs.existsSync(starterFile)) {
    fs.writeFileSync(
      starterFile,
      `# Welcome to Mery Documents\n\nThis folder is your secure local workspace managed by Mery.\nYou can create notes, research outlines, project specs, and ask Mery to read or modify them.\n\n- Voice tool: \`readDocument(path)\`\n- Voice tool: \`saveDocument(path, content)\`\n`,
      "utf-8"
    );
  }
}

export interface DocumentMeta {
  name: string;
  relativePath: string;
  sizeBytes: number;
  updatedAt: string;
  extension: string;
}

export class DocumentsService {
  private sanitizePath(userPath: string): string {
    // Prevent directory traversal attacks
    const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const safePath = path.join(DOCS_DIR, normalized);
    if (!safePath.startsWith(DOCS_DIR)) {
      throw new Error("Access denied: Path is outside the documents repository");
    }
    return safePath;
  }

  public listDocuments(): DocumentMeta[] {
    try {
      if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
      }

      const files = fs.readdirSync(DOCS_DIR);
      return files
        .filter((file) => !file.startsWith("."))
        .map((file) => {
          const fullPath = path.join(DOCS_DIR, file);
          const stat = fs.statSync(fullPath);
          return {
            name: file,
            relativePath: file,
            sizeBytes: stat.size,
            updatedAt: stat.mtime.toISOString(),
            extension: path.extname(file).replace(".", "").toLowerCase(),
          };
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.error("[DocumentsService] Error listing documents:", err);
      return [];
    }
  }

  public readDocument(relativePath: string): { success: boolean; content?: string; error?: string } {
    try {
      const safePath = this.sanitizePath(relativePath);
      if (!fs.existsSync(safePath)) {
        return { success: false, error: `Document "${relativePath}" not found in documents folder.` };
      }

      const content = fs.readFileSync(safePath, "utf-8");
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to read document" };
    }
  }

  public saveDocument(
    relativePath: string,
    content: string
  ): { success: boolean; path: string; size: number; error?: string } {
    try {
      const safePath = this.sanitizePath(relativePath);
      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(safePath, content, "utf-8");
      const stat = fs.statSync(safePath);
      return { success: true, path: relativePath, size: stat.size };
    } catch (err: any) {
      return { success: false, path: relativePath, size: 0, error: err.message || "Failed to save document" };
    }
  }

  public deleteDocument(relativePath: string): { success: boolean; error?: string } {
    try {
      const safePath = this.sanitizePath(relativePath);
      if (fs.existsSync(safePath)) {
        fs.unlinkSync(safePath);
        return { success: true };
      }
      return { success: false, error: "File does not exist" };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to delete document" };
    }
  }
}

export const documentsService = new DocumentsService();
