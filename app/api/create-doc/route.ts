import { NextResponse } from "next/server";
import { Octokit } from "octokit";

function slugify(str = "") {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category = "uncategorized", title, markdown } = body || {};

    if (!title || !markdown)
      return NextResponse.json({ error: "Missing title or markdown" }, { status: 400 });

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return NextResponse.json({ error: "Missing GitHub configuration" }, { status: 500 });
    }

    const [owner, repo] = GITHUB_REPO.split("/");
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    const cat = slugify(category);
    const slug = slugify(title);
    const filePath = `content/docs/${cat}/${slug}.mdx`;

    const content = `---\ntitle: "${title}"\ncategory: "${category}"\n---\n\n${markdown}`;
    const encoded = Buffer.from(content).toString("base64");

    // Check if file already exists
    let sha;
    try {
      const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner, repo, path: filePath, ref: GITHUB_BRANCH,
      });
      sha = (data as any).sha;
    } catch (err: any) {
      if (err.status !== 404) throw err;
    }

    const message = sha
      ? `Update doc: ${cat}/${slug}.mdx`
      : `Add doc: ${cat}/${slug}.mdx`;

    const { data } = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path: filePath,
      message,
      content: encoded,
      branch: GITHUB_BRANCH,
      sha,
      committer: {
        name: process.env.GITHUB_COMMITTER_NAME || "auto-bot",
        email: process.env.GITHUB_COMMITTER_EMAIL || "bot@example.com",
      },
    });

    return NextResponse.json({
      success: true,
      message: sha ? "File updated successfully" : "File created successfully",
      commitUrl: data?.commit?.html_url,
    });
  } catch (err: any) {
    console.error("GitHub commit error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
