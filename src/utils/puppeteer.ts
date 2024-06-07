import * as puppeteerCore from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";
import AnonymizeUAPlugin from "puppeteer-extra-plugin-anonymize-ua";
import { NODE_ENV } from "./env";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Use the recaptcha plugin to solve reCAPTCHA challenges
puppeteer.use(RecaptchaPlugin());

// Use the anonymizeUA plugin to avoid detection
puppeteer.use(AnonymizeUAPlugin());

const launchBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: NODE_ENV === "development" ? false : "new",
    executablePath:
      NODE_ENV === "development"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Browser launched.");
  return browser;
};

const createPage = async (browser: puppeteerCore.Browser) => {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(2 * 600000); // Set the default navigation timeout to 20 minutes
  console.log("New page created.");
  return page;
};

const loginInstagram = async (
  page: puppeteerCore.Page,
  username: string,
  password: string
) => {
  if (page) {
    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
    });
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', username, {
      delay: 50,
    });
    await page.type('input[name="password"]', password, {
      delay: 50,
    });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    // Solve the reCAPTCHA challenge
    // await page.solveRecaptchas();
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("Instagram login success.");
  }
};

const loginTikTok = async (
  page: puppeteerCore.Page,
  username: string,
  password: string
) => {
  if (page) {
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', username, {
      delay: 50,
    });
    await page.type('input[autocomplete="new-password"]', password, {
      delay: 50,
    });
    await page.click('button[data-e2e="login-button"]');
    await page.waitForTimeout(5000);
    // Solve the reCAPTCHA challenge
    await page.solveRecaptchas();
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("TikTok login success.");
  }
};

const closePage = async (page: puppeteerCore.Page) => {
  if (page) {
    await page.close();
    console.log("Page closed.");
  }
};

const closeBrowser = async (browser: puppeteerCore.Browser) => {
  if (browser) {
    await browser.close();
    console.log("Browser closed.");
  }
};

// Export the functions
export { launchBrowser, createPage, loginInstagram, loginTikTok, closeBrowser };
