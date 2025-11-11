import { NextResponse } from "next/server";
import { Octokit } from "octokit"; // ✅ Use existing octokit package, no install needed

// ---------- Utility: slugify title/category ----------
function slugify(str = ""): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ---------- POST handler ----------
export async function POST(req: Request) {
  try {
    // Step 1️⃣ — Parse the request body
    const body = await req.json();
    const { category = "uncategorized", title, markdown } = body || {};

    if (!title || !markdown) {
      return NextResponse.json(
        { error: "Missing 'title' or 'markdown' in request body" },
        { status: 400 }
      );
    }

    // Step 2️⃣ — Load GitHub configuration from environment
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO; // e.g., "safiya/safiya-blog"
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
    const COMMITTER_NAME = process.env.GITHUB_COMMITTER_NAME || "Auto Commit Bot";
    const COMMITTER_EMAIL = process.env.GITHUB_COMMITTER_EMAIL || "bot@example.com";

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return NextResponse.json(
        { error: "Missing GitHub configuration in environment variables" },
        { status: 500 }
      );
    }

    const [owner, repo] = GITHUB_REPO.split("/");
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    // Step 3️⃣ — Prepare file details
    const cat = slugify(category);
    const slug = slugify(title);
    const normalizedCategory = slugify(category);
    const normalizedTitle = slugify(title);

    // ✅ FIXED: Use octokit.request instead of repos.getContent (no @octokit/rest required)
    const repoContentsResp = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path: "content",
        ref: GITHUB_BRANCH,
      }
    );

    const repoContents = repoContentsResp.data;
    const existingCategories = Array.isArray(repoContents)
      ? repoContents.map((item: any) => item.name.toLowerCase())
      : [];

    // If category folder exists, use it; otherwise, create new one
    const finalCategory = existingCategories.includes(normalizedCategory)
      ? normalizedCategory
      : normalizedCategory;

    const filePath = `content/docs/${finalCategory}/${normalizedTitle}.mdx`;


    // Add frontmatter + markdown
    const content = `---\ntitle: "${title}"\ncategory: "${category}"\n---\n\n${markdown}`;
    const encodedContent = Buffer.from(content).toString("base64");

    // Step 4️⃣ — Check if file exists to determine update vs create
    let sha: string | undefined;
    try {
      const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        { owner, repo, path: filePath, ref: GITHUB_BRANCH }
      );
      sha = (data as any).sha;
    } catch (err: any) {
      if (err.status !== 404) {
        console.error("Error checking file:", err);
        throw err;
      }
    }

    // Step 5️⃣ — Create or update file via GitHub API (unchanged)
    const commitMessage = sha
      ? `Update blog: ${cat}/${slug}`
      : `Add new blog: ${cat}/${slug}`;

    const { data } = await octokit.request(
      "PUT /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: encodedContent,
        branch: GITHUB_BRANCH,
        sha,
        committer: {
          name: COMMITTER_NAME,
          email: COMMITTER_EMAIL,
        },
      }
    );

    // Step 6️⃣ — Response to client
    return NextResponse.json({
      success: true,
      message: sha ? "File updated successfully" : "File created successfully",
      commitUrl: data?.commit?.html_url,
      filePath,
      branch: GITHUB_BRANCH,
    });
  } catch (err: any) {
    // ---------- Error handling ----------
    console.error("GitHub commit error:", {
      message: err?.message,
      status: err?.status,
      documentation_url: err?.documentation_url,
    });

    let errorMessage = "Unexpected error occurred";
    let status = 500;

    if (err?.status === 401) {
      errorMessage = "Bad credentials — invalid or expired GitHub token.";
    } else if (err?.status === 403) {
      errorMessage =
        "Resource not accessible — check token permissions or branch protection.";
    } else if (err?.status === 404) {
      errorMessage =
        "Repository or branch not found — check GITHUB_REPO and GITHUB_BRANCH values.";
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
