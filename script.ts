import playwright = require("playwright");
import Cheerio = require("cheerio");
import type Browser = require("playwright");

interface JobData {
  jobTitle: string;
  jobCategory: string;
  jobCountry: string;
  jobCity: string;
  jobDescription: string[];
  jobRequirements: string[];
}

const firefox = playwright.firefox;

async function getJobPages(url: string, page: Browser.Page): Promise<string[]> {
  let results: string[] = [];
  await page.goto(url);
  const htmlContent = await page.content();
  const $ = Cheerio.load(htmlContent);
  $(".job-listing-full a").each((_, element) => {
    const link = $(element).attr("href");
    link && results.push(link);
  });
  return results;
}

async function getHtmlFromJobPage(
  baseUrl: string,
  siteLocation: string,
  page: Browser.Page,
): Promise<string> {
  const url = baseUrl + siteLocation;
  await page.goto(url);
  const htmlContent = await page.content();
  return htmlContent;
}

function getJobDataFromHtml(html: string): JobData {
  const temp: JobData = {
    jobTitle: "",
    jobCategory: "",
    jobCountry: "",
    jobCity: "",
    jobDescription: [],
    jobRequirements: [],
  };
  return temp;
}

async function main(): Promise<void> {
  console.log("scraping...");
  const browser = { name: "firefox", instance: await firefox.launch() };
  try {
    const page = await browser.instance.newPage();
    const results = await getJobPages(
      "https://wpp.careersitecloud.com/search",
      page,
    );
    console.log("job urls:");
    console.log(results);
    const htmls: string[] = [];
    results.forEach((siteLocation) => async () => {
      const content = await getHtmlFromJobPage(
        "https://wpp.careersitecloud.com",
        siteLocation,
        page,
      );
      htmls.push(content);
    });
    const jobs: JobData[] = [];
    htmls.forEach((content) => {
      const info = getJobDataFromHtml(content);
      jobs.push(info);
    });
    console.log(jobs);
    console.log("finished");
  } finally {
    await browser.instance.close();
  }
}

main().then().catch(console.error);
