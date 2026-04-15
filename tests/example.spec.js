// fintech.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('scrape fintech futures article and save markdown', async ({ browser }) => {


  const buildLastTopFiveURL = () => {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) → 6 (Sat)
    const diff = (day >= 5) ? day - 5 : day + 2
    const prevMonday = new Date(now);
    prevMonday.setDate(now.getDate() - diff);
    
    const weekday = prevMonday.getDate();
    const month = prevMonday.toLocaleString('en-GB', { month: 'long' }).toLowerCase();
    const year = prevMonday.getFullYear();

    const formatted = `${weekday}-${month}-${year}`;

   return "https://www.fintechfutures.com/fintech/fintech-futures-top-five-news-stories-of-the-week-" + formatted

  }
  

  const url = buildLastTopFiveURL()

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
               "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "en-GB"
  });

  const page = await context.newPage();

  // Warm up session (like requests.Session)
  await page.goto("https://www.fintechfutures.com/", { waitUntil: "domcontentloaded" });

  // Navigate to article
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Ensure article body exists
  const container = page.locator(".ArticleBase-BodyContent");
  await expect(container).toBeVisible();

  // Extract structured content
  const articles = await page.evaluate(() => {
    const container = document.querySelector(".ArticleBase-BodyContent");
    if (!container) throw new Error("Article body not found");

    const elements = container.querySelectorAll("h2, p.ContentParagraph");

    const articles = [];
    let currentArticle = null;

    elements.forEach(el => {
      if (el.tagName.toLowerCase() === "h2") {
        if (currentArticle) articles.push(currentArticle);

        currentArticle = {
          title: el.textContent.trim(),
          content: []
        };
      } else if (el.tagName.toLowerCase() === "p" && currentArticle) {
        let paragraph = "";

        const anchor = el.querySelector("a");
        if (
          anchor &&
          anchor.textContent.trim().toLowerCase() === "read more here"
        ) {
          const href = anchor.getAttribute("href");
          const text = anchor.textContent.trim();
          paragraph = `[${text}](${'https://www.fintechfutures.com'}${href})`;
        } else {
          paragraph = el.textContent.trim();
        }

        if (paragraph) {
          currentArticle.content.push(paragraph);
        }
      }
    });

    if (currentArticle) articles.push(currentArticle);

    return articles;
  });

  // Basic sanity assertion
  expect(articles.length).toBeGreaterThan(0);

  // Save markdown
  const now = new Date();
  const filename = `${now.toISOString().replace(/[:.]/g, "-")}.md`;

  let md = "";
  for (const article of articles) {
    md += `## ${article.title}\n\n`;

    for (const paragraph of article.content) {
      md += `${paragraph}\n\n`;
    }

    md += `---\n\n`;
  }

  fs.writeFileSync(filename, md, "utf-8");

  console.log(`Saved: ${filename}`);

  await context.close();
});