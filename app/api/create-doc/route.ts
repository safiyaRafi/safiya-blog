import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

/** Helpers */
function slugify(str = "") {
    return String(str)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

function escapeForImportPath(p: string) {
    // Use forward slashes and normalize backslashes for windows paths in generated text
    return p.replace(/\\/g, "/");
}

export async function POST(req: Request) {
    try {
        const payload = await req.json().catch(() => null);
        if (!payload) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { category = "uncategorized", title, markdown } = payload;

        if (!title || !markdown) {
            return NextResponse.json({ error: "title and markdown are required" }, { status: 400 });
        }

        const projectRoot = process.cwd();
        const baseDir = path.join(projectRoot, "content", "docs");
        const catSlug = slugify(category || "uncategorized");
        const fileSlug = slugify(title);

        const catDir = path.join(baseDir, catSlug);
        await fs.mkdir(catDir, { recursive: true });

        const fileName = `${fileSlug}.mdx`;
        const filePath = path.join(catDir, fileName);

        // If file already exists, do not overwrite by default; return 409
        try {
            await fs.access(filePath);
            return NextResponse.json({ error: "File already exists" }, { status: 409 });
        } catch {
            // ok - doesn't exist
        }

        // write the markdown file
        await fs.writeFile(filePath, markdown, "utf8");
        console.log("[create-doc] wrote file:", filePath);

        // Ensure lib/index.ts exists and has a minimal fumadocs template if not present
        const indexPath = path.join(projectRoot, "lib", "index.ts");
        try {
            await fs.access(indexPath);
        } catch {
            const template = `// Auto-generated fumadocs index file\n// @ts-nocheck\nimport { _runtime } from "fumadocs-mdx/runtime/next"\nimport * as _source from "../source.config"\n\nexport const docs = _runtime.docs<typeof _source.docs>([], [])\n`;
            await fs.mkdir(path.dirname(indexPath), { recursive: true });
            await fs.writeFile(indexPath, template, "utf8");
            console.log("[create-doc] created initial lib/index.ts");
        }

        // Read index content
        let indexContent = await fs.readFile(indexPath, "utf8");

        // Determine next d_docs_N index
        const existingMatches = indexContent.match(/import \* as d_docs_(\d+) from/g) || [];
        // compute next index as max+1
        const indices = Array.from(indexContent.matchAll(/import \* as d_docs_(\d+) from/g), m =>
            parseInt(m[1], 10)
        );
        const nextIndex = indices.length ? Math.max(...indices) + 1 : 0;

        const importPath = escapeForImportPath(`../content/docs/${catSlug}/${fileName}?collection=docs`);
        const importLine = `import * as d_docs_${nextIndex} from "${importPath}";\n`;

        // Insert the import line before the first runtime import (if present), else prepend
        const runtimeIdx = indexContent.indexOf('import { _runtime }');
        if (runtimeIdx !== -1) {
            indexContent = indexContent.slice(0, runtimeIdx) + importLine + indexContent.slice(runtimeIdx);
        } else {
            indexContent = importLine + indexContent;
        }

        // Now inject the docs array entry
        // We search for _runtime.docs<...>([ <existing-list> ], ...)
        const docsRegex = /_runtime\.docs<[^>]>\(\[([\s\S]?)\],\s*\[\]\)/m;
        const match = indexContent.match(docsRegex);

        const entry = `{ info: {"path":"${catSlug}/${fileName}","fullPath":"content\\\\docs\\\\${catSlug}\\\\${fileName}"}, data: d_docs_${nextIndex} }, `;

        if (match) {
            const existingList = match[1].trim();
            const newList = existingList ? `${existingList} ${entry}` : `${entry}`;
            indexContent = indexContent.replace(docsRegex, `_runtime.docs<typeof _source.docs>([${newList}], [])`);
        } else {
            // fallback: append a full docs declaration at end
            indexContent += `\nexport const docs = _runtime.docs<typeof _source.docs>([ ${entry} ], [])\n`;
        }

        await fs.writeFile(indexPath, indexContent, "utf8");
        console.log("[create-doc] updated lib/index.ts");

        return NextResponse.json({
            ok: true,
            message: "Created file and updated lib/index.ts",
            file: `/content/docs/${catSlug}/${fileName}`,
        });
    } catch (err: any) {
        console.error("[create-doc] Error:", err);
        return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
    }
}
