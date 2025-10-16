import playwright = require("playwright");
import Cheerio = require("cheerio");
import type Browser = require("playwright");

interface JobData {
  jobTitle: string;
  jobCategory: string;
  jobCountry: string;
  jobCity: string;
  jobDescription: string;
}

interface JobFields {
  jobCategory: string;
  jobCountry: string;
  jobCity: string;
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
  const url = `${baseUrl}${siteLocation}`;
  console.log(url);
  await page.goto(url);
  const htmlContent = await page.content();
  return htmlContent;
}

function parseJobTitle($: Cheerio.CheerioAPI): string {
  return $("h1.page-header").text() ?? "";
}

function parseJobFields($: Cheerio.CheerioAPI): JobFields {
  let jobCategory: string = "";
  let jobCountry: string = "";
  let jobCity: string = "";

  $(".job-view-fields tr").each((_, element) => {
    const $tr = $(element);
    const label = $tr.find("td.job-field").text().trim();
    if (label && label === "Category") {
      const val = $tr.find("td.job-field-value").text().trim();
      jobCategory = val ?? "";
    }
    if (label && label === "Location") {
      const val = $tr.find("td.job-field-value").text().trim();
      jobCountry = val ?? "";
    }
    if (label && label === "City") {
      const val = $tr.find("td.job-field-value").text().trim();
      jobCity = val ?? "";
    }
  });
  return { jobCategory, jobCountry, jobCity };
}

function parseJobText($: Cheerio.CheerioAPI): string {
  return $(".description-info").text().trim() ?? "";
}

function getJobDataFromHtml(html: string): JobData {
  const $ = Cheerio.load(html);
  const jobTitle = parseJobTitle($);
  const { jobCountry, jobCategory, jobCity } = parseJobFields($);
  const jobDescription = parseJobText($);
  const data: JobData = {
    jobTitle,
    jobCategory,
    jobCity,
    jobCountry,
    jobDescription,
  };
  return data;
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
    for (const siteLocation of results) {
      const content = await getHtmlFromJobPage(
        "https://wpp.careersitecloud.com",
        siteLocation,
        page,
      );

      htmls.push(content);
    }
    const jobs: JobData[] = [];
    htmls.forEach((content) => {
      const info = getJobDataFromHtml(content);
      jobs.push(info);
    });
    console.log(jobs);
  } finally {
    await browser.instance.close();
  }
}

main().then().catch(console.error);
