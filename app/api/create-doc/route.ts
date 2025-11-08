import { NextResponse } from "next/server";
import { Octokit } from "octokit";

function slugify(str = "") {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { category = "uncategorized", title, markdown } = body;

    if (!title || !markdown) {
      return NextResponse.json({ error: "Title and markdown are required" }, { status: 400 });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO; // e.g. "username/safiya-blog"
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return NextResponse.json({ error: "Missing GitHub configuration" }, { status: 500 });
    }

    const [owner, repo] = GITHUB_REPO.split("/");
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    const catSlug = slugify(category);
    const fileSlug = slugify(title);
    const filePath = `content/docs/${catSlug}/${fileSlug}.mdx`;

    const content = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ncategory: "${category}"\n---\n\n${markdown}`;
    const encodedContent = Buffer.from(content, "utf8").toString("base64");

    let existingSha: string | undefined;
    try {
      const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path: filePath,
        ref: GITHUB_BRANCH,
      });
      existingSha = (data as any)?.sha;
    } catch (error: any) {
      if (error.status !== 404) {
        console.error("GitHub GET error:", error);
        return NextResponse.json({ error: "GitHub API error while checking file" }, { status: 500 });
      }
    }

    const message = existingSha
      ? `Update doc: ${catSlug}/${fileSlug}.mdx`
      : `Add doc: ${catSlug}/${fileSlug}.mdx`;

    const { data } = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path: filePath,
      message,
      content: encodedContent,
      branch: GITHUB_BRANCH,
      sha: existingSha,
      committer: {
        name: "Safiya-Blog Bot",
        email: "bot@safiya-blog.vercel.app",
      },
    });

    return NextResponse.json({
      success: true,
      message: existingSha ? "File updated successfully" : "File created successfully",
      file: filePath,
      commitUrl: data?.commit?.html_url,
    });
  } catch (error: any) {
    console.error("create-doc error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
