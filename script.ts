#!/usr/bin/env node
import { Command } from "commander";
import { firefox } from "playwright";
import * as Cheerio from "cheerio";
import type Browser = require("playwright");

const program = new Command();
program
  .version("1.0.0")
  .description("example webscraper")
  .option("-u, --url  [string]", "url to get job listings from")
  .option("-b, --base [string]", "base url to append job listing links")
  .option("-o, --output [file]", "output file")
  .parse(process.argv);

const options = program.opts();

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
  let jobPagesUrl = "";
  let jobsBaseUrl = "";
  let outputFile = "output.json";

  if (options.url && typeof options.url === "string") {
    jobPagesUrl = options.url;
  } else {
    throw new Error("You must provide a url with job listings");
  }

  if (options.base && typeof options.base === "string") {
    jobsBaseUrl = options.base;
  } else {
    throw new Error("You must provide a base url shared by all job listings");
  }
  console.log("Starting...");
  const browser = { name: "firefox", instance: await firefox.launch() };
  try {
    const page = await browser.instance.newPage();

    const results = await getJobPages(jobPagesUrl, page);
    console.log("job urls:");
    console.log(results);
    const htmls: string[] = [];
    for (const siteLocation of results) {
      const content = await getHtmlFromJobPage(jobsBaseUrl, siteLocation, page);

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
