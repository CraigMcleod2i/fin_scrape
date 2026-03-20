import requests
from bs4 import BeautifulSoup
from datetime import datetime

url = "https://www.fintechfutures.com/fintech/fintech-futures-top-five-news-stories-of-the-week-20-february-2026"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    "Referer": "https://www.google.com/"
}

response = requests.get(url, headers=headers, timeout=15)
response.raise_for_status()  # raises an exception for non-200 responses

soup = BeautifulSoup(response.text, "html.parser")

container = soup.select_one(".ArticleBase-BodyContent")
if not container:
    raise ValueError("Article body not found")

# Grab h2 + relevant paragraphs in DOM order
elements = container.select("h2, p.ContentParagraph")

# ---- PARSE INTO STRUCTURED ARTICLES ----
def parse_articles(els):
    articles = []
    current_article = None

    for el in els:

        # Start new article at each H2
        if el.name == "h2":
            if current_article:
                articles.append(current_article)

            current_article = {
                "title": el.get_text(strip=True),
                "content": []
            }

        # Collect paragraphs under current H2
        elif el.name == "p" and current_article:
            # Only preserve "Read more here" anchor as Markdown link
            anchor = el.find("a")
            if anchor and anchor.get_text(strip=True).lower() == "read more here":
                href = anchor.get("href")
                text = anchor.get_text(strip=True)
                paragraph = f"[{text}]({href})"
            else:
                paragraph = el.get_text(strip=True)

            if paragraph:
                current_article["content"].append(paragraph)

    if current_article:
        articles.append(current_article)

    return articles

# ---- WRITE MARKDOWN FILE ----
def save_markdown(filename, articles):
    with open(filename, "w", encoding="utf-8") as f:
        for article in articles:
            f.write(f"## {article['title']}\n\n")

            for paragraph in article["content"]:
                f.write(f"{paragraph}\n\n")

            f.write("---\n\n")

# ---- RUN ----
articles = parse_articles(elements)

filename = f"{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.md"
save_markdown(filename, articles)