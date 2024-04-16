import * as puppeteerCore from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";
import AnonymizeUAPlugin from "puppeteer-extra-plugin-anonymize-ua";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Use the recaptcha plugin to solve reCAPTCHA challenges
puppeteer.use(RecaptchaPlugin());

// Use the anonymizeUA plugin to avoid detection
puppeteer.use(AnonymizeUAPlugin());

class puppeteerController {
  private browser: puppeteerCore.Browser | null;
  private page: puppeteerCore.Page | null;

  constructor() {
    this.browser = null;
    this.page = null;
  }

  async crawl() {
    // Wait for browser launching.
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    console.log("Browser launched.");

    this.page = await this.browser?.newPage();
    // Set the default navigation timeout to 10 minute
    await this.page.setDefaultNavigationTimeout(600000);
    console.log("New page created.");
    // Wait for creating the new page.
  }

  async login(username: string, password: string) {
    if (this.page) {
      await this.page.waitForSelector('input[name="username"]');
      await this.page.type('input[name="username"]', username, {
        delay: 50,
      });
      await this.page.type('input[name="password"]', password, {
        delay: 50,
      });
      await this.page.click('button[type="submit"]');
      await this.page?.waitForTimeout(5000);
      // Solve the reCAPTCHA challenge
      // await this.page.solveRecaptchas();
      await this.page.waitForNavigation({ waitUntil: "networkidle2" });
      // await this.page?.waitForTimeout(10000);
      console.log("Insta Login success.");
    }
  }

  async TTLogin(username: string, password: string) {
    if (this.page) {
      await this.page.waitForSelector('input[name="username"]');
      await this.page.type('input[name="username"]', username, {
        delay: 50,
      });
      await this.page.type('input[autocomplete="new-password"]', password, {
        delay: 50,
      });
      await this.page.click('button[data-e2e="login-button"]');
      await this.page?.waitForTimeout(5000);
      // Solve the reCAPTCHA challenge
      await this.page.solveRecaptchas();
      await this.page.waitForNavigation({ waitUntil: "networkidle2" });
      await this.page?.waitForTimeout(10000);
      console.log("Login success.");
    }
  }

  getBrowser(): puppeteerCore.Browser | null {
    return this.browser;
  }

  getPage(): puppeteerCore.Page | null {
    return this.page;
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default new puppeteerController();
