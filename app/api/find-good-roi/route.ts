export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Output = {
  ok: boolean;
  searched: string;
  debug: {
    inputFound: boolean;
    suggestionFound: boolean;
    searchClicked: boolean;
    listingsFound: number;
    htmlTitle?: string | null;
    url?: string | null;
  };
  listings: Array<{
    url: string;
    text: string;
  }>;
  apiCalls: Array<{ method: string; url: string }>;
  error?: string;
};

function clean(s: any) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const searchText = String(body.location ?? "Greater Vancouver").trim();

  let browser: any = null;

  try {
    // ✅ dynamic import (prevents bundling/runtime issues)
    const { chromium } = await import("playwright");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      locale: "en-CA",
    });

    page.setDefaultTimeout(30000);

    const apiCalls: { method: string; url: string }[] = [];
    page.on("request", (req) => {
      const rt = req.resourceType();
      if (rt === "xhr" || rt === "fetch") apiCalls.push({ method: req.method(), url: req.url() });
    });
console.log("Fetched URL:", url);
console.log("HTML length:", html?.length ?? 0);
console.log("HTML title:", cheerio.load(html ?? "")("title").text());

    const START_URL = "https://explore.communities.ca/LKP9GY/buy";
    await page.goto(START_URL, { waitUntil: "domcontentloaded" });

    const title = await page.title().catch(() => null);

    // find search input
    const input = page
      .locator(
        [
          'input[placeholder*="city" i]',
          'input[placeholder*="area" i]',
          'input[type="search"]',
          'input[name*="search" i]',
          'input[id*="search" i]',
        ].join(",")
      )
      .first();

    const inputFound = (await input.count()) > 0;
    if (!inputFound) {
      await browser.close();
      return Response.json({
        ok: false,
        searched: searchText,
        debug: {
          inputFound: false,
          suggestionFound: false,
          searchClicked: false,
          listingsFound: 0,
          htmlTitle: title,
          url: START_URL,
        },
        listings: [],
        apiCalls: dedupe(apiCalls),
        error: "Could not find the search input. The site UI/markup likely changed.",
      } satisfies Output);
    }

    await input.waitFor({ state: "visible" });
    await input.click();
    await input.fill(searchText);

    await page.waitForTimeout(700);

    // try to click a suggestion if it exists
    const suggestion = page
      .locator(
        [
          '[role="listbox"] [role="option"]',
          '[role="listbox"] li',
          '[class*="autocomplete" i] li',
          '[class*="suggest" i] li',
          `li:has-text("${searchText}")`,
        ].join(",")
      )
      .first();

    const suggestionFound = (await suggestion.count()) > 0;

    if (suggestionFound) {
      try {
        await suggestion.click({ timeout: 2000 });
      } catch {
        await input.press("ArrowDown");
        await input.press("Enter");
      }
    } else {
      await input.press("Enter");
    }

    // click Search button if present
    const searchButton = page.locator('button:has-text("Search"), a:has-text("Search")').first();
    let searchClicked = false;
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
      searchClicked = true;
    } else {
      await input.press("Enter");
      searchClicked = true;
    }

    await page.waitForTimeout(2000);

    // scroll a bit to load more
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(900);
    }

    // extract listing-like links
    const listings = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const likely = anchors.filter((a) => {
        const href = a.getAttribute("href") || "";
        return (
          href.includes("/listing") ||
          href.includes("/property") ||
          href.includes("/details") ||
          href.includes("/mls") ||
          href.includes("ListingId=") ||
          href.includes("listingId=")
        );
      });

      const seen = new Set<string>();
      const out: Array<{ url: string; text: string }> = [];

      for (const a of likely) {
        const href = (a as HTMLAnchorElement).href;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const card = a.closest("article, li, div") || a.parentElement;
        const text = (card?.textContent || a.textContent || "").replace(/\s+/g, " ").trim();

        out.push({ url: href, text });
      }

      return out;
    });

    await browser.close();

    return Response.json({
      ok: true,
      searched: searchText,
      debug: {
        inputFound: true,
        suggestionFound,
        searchClicked,
        listingsFound: listings.length,
        htmlTitle: title,
        url: START_URL,
      },
      listings: listings.map((x) => ({ url: x.url, text: clean(x.text).slice(0, 500) })),
      apiCalls: dedupe(apiCalls),
    } satisfies Output);
  } catch (e: any) {
    try {
      if (browser) await browser.close();
    } catch {}

    return Response.json({
      ok: false,
      searched: searchText,
      debug: {
        inputFound: false,
        suggestionFound: false,
        searchClicked: false,
        listingsFound: 0,
      },
      listings: [],
      apiCalls: [],
      error: String(e?.stack || e?.message || e),
    } satisfies Output);
  }
}

function dedupe(items: Array<{ method: string; url: string }>) {
  return Array.from(new Map(items.map((x) => [`${x.method} ${x.url}`, x])).values());
}
