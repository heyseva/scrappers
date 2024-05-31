import { MongoClient } from "mongodb";
import dbConnection from "../../utils/mongo";
// import puppeteer from "../../utils/puppeteer";
import puppeteer, { Browser, Page } from "puppeteer";

// const { authenticator } = require("otplib");

// Replace with your actual secret key from your authenticator app setup
// const secret = "YOUR_TOTP_SECRET";

// function generateTOTP() {
//   return authenticator.generate(secret);
// }

async function loginAndSaveSession(
  username: string,
  password: string,
  client: MongoClient
) {
  console.log("Starting loginAndSaveSession...");
  //   await puppeteer.crawl();
  //   const browser = (await puppeteer.getBrowser()) as Browser;
  //   const page = (await puppeteer.getPage()) as Page;
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://www.tiktok.com/login/phone-or-email/email", {
    waitUntil: "networkidle2",
  });

  //   await page.goto("https://www.tiktok.com/login/qrcode", {
  //     waitUntil: "networkidle2",
  //   });

  // Assuming TikTok uses input selectors for username and password
  await page.type('input[name="username"]', username, {
    delay: 50,
  });
  await page.type('input[autocomplete="new-password"]', password, {
    delay: 50,
  });
  await page.click('button[data-e2e="login-button"]');

  await page?.waitForTimeout(60000 * 5);

  // Wait for 2FA input if necessary
  //   await page.waitForSelector("#2fa-input", { visible: true });

  //   const twoFaCode = generateTOTP();
  //   await page.type("#2fa-input", twoFaCode);
  //   await page.click("#2fa-submit-button");

  await page.waitForNavigation();

  await page?.waitForTimeout(5000);

  // Store session cookies
  const cookies = await page.cookies();

  const localStorageData = await page.evaluate(() => {
    let data: any = {};
    try {
      for (let key in localStorage) {
        data[key] = localStorage.getItem(key);
      }
    } catch (e) {
      console.error("Failed to access localStorage:", e);
    }
    return data;
  });

  await client
    .db("insta-scrapper")
    .collection("scrap-session")
    .updateOne(
      {
        username,
      },
      {
        $set: {
          username,
          cookies,
          localStorage: localStorageData,
        },
      },
      {
        upsert: true,
      }
    );
  console.log("Session data saved to MongoDB.");

  await browser.close();
}

async function loadSessionAndNavigate(username: string, client: MongoClient) {
  console.log("Starting loadSessionAndNavigate...");
  //   await puppeteer.crawl();
  //   const browser = (await puppeteer.getBrowser()) as Browser;
  //   const page = (await puppeteer.getPage()) as Page;
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Load session from MongoDB
  const session = await client
    ?.db("insta-scrapper")
    .collection("scrap-session")
    .findOne({ username });

  await page?.waitForTimeout(5000);

  if (session) {
    // Load cookies
    await page.setCookie(...session.cookies);

    // Load localStorage
    await page.evaluate((data: any) => {
      try {
        for (let key in data) {
          localStorage.setItem(key, data[key]);
        }
      } catch (e) {
        console.error("Failed to set localStorage:", e);
      }
    }, session.localStorage);

    await page.goto("https://www.tiktok.com");

    // Perform actions while logged in
    // ...

    await page?.waitForTimeout(60000 * 2);

    // document.querySelector('[data-e2e="inbox-icon"]').click()
    await page.click('[data-e2e="inbox-icon"]');
    await page?.waitForTimeout(5000);
    // document.querySelector('[data-e2e="mentions"]').click()
    await page.click('[data-e2e="mentions"]');

    page.on("response", async (response) => {
      if (response.url().includes("/api/notice/multi/?WebIdLastTime")) {
        const data = await response.json();
        console.log(
          `API result for ${username}:`,
          JSON.stringify(data, null, 2)
        );
      }
    });

    // data-e2e="inbox-list"

    console.log("Session loaded and navigated.");
  } else {
    console.log("Session not found.");
  }

  await browser.close();
}

const main = async () => {
  console.log("Starting puppeteer...");
  const client = (await dbConnection("dev")) as MongoClient;
  const username = "";
  const password = "";
  const username1 = "";
  const password1 = "";
  //   loginAndSaveSession(username, password, client).then(() => {
  //     setTimeout(() => {
  //       loadSessionAndNavigate(username1, client);
  //     }, 5000);
  //   });
  loadSessionAndNavigate(username1, client);
};

// Example usage

main();
