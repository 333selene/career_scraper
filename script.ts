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

interface JobFields {
  jobCategory: string;
  jobCountry: string;
  jobCity: string;
}

interface JobText {
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

function parseJobText(html: string): JobText {
  const jobDescription: string[] = [];
  const jobRequirements: string[] = [];
  const regex_desc = new RegExp(
    "/<strong>What you'll be doing\X*.*?(?=<strong>What you'll need:)",
  );
  const regex_req = new RegExp(
    "<strong>What you'll need\X*.?(?=<strong>Who you are)",
  );
  const html_desc = regex_desc.exec(html);
  const html_req = regex_req.exec(html);
  if (html_desc) {
    const desc = html_desc[0];
    const $desc = Cheerio.load(desc);
    $desc("li").each((_, element) => {
      const text = $desc(element).text().trim();
      jobDescription.push(text);
    });
  }
  if (html_req) {
    const req = html_req[0];
    const $desc = Cheerio.load(req);
    $desc("li").each((_, element) => {
      const text = $desc(element).text().trim();
      jobRequirements.push(text);
    });
  }
  return { jobDescription, jobRequirements };
}

function getJobDataFromHtml(html: string): JobData {
  const $ = Cheerio.load(html);
  const jobTitle = parseJobTitle($);
  const { jobCountry, jobCategory, jobCity } = parseJobFields($);
  const { jobDescription, jobRequirements } = parseJobText(html);
  const data: JobData = {
    jobTitle,
    jobCategory,
    jobCity,
    jobCountry,
    jobDescription,
    jobRequirements,
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
