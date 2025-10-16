import playwright = require("playwright");
import Cheerio = require("cheerio");

const firefox = playwright.firefox;

async function scrapePage(url: string): Promise<string[]> {
  const browser = { name: "firefox", instance: await firefox.launch() };

  const page = await browser.instance.newPage();
  let results: string[] = [];
  try {
    await page.goto(url);
    const htmlContent = await page.content();
    console.log(htmlContent);
    const $ = Cheerio.load(htmlContent);
    $(".job-listing-full a").each((_, element) => {
      const link = $(element).attr("href");
      link && results.push(link);
    });
  } finally {
    await browser.instance.close();
  }
  return results;
}

scrapePage("https://wpp.careersitecloud.com/search")
  .then((results) => {
    console.log("scraping...");
    console.log(results);
  })
  .catch(console.error);
