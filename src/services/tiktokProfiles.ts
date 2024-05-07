import { MongoClient } from "mongodb";
import dbConnection from "../utils/mongo";
import puppeteer from "../utils/puppeteer";
import Async from "async";
import cheerio from "cheerio";
import { downloadImage } from "../helper/images";

export const tiktokProfiles = async () => {
  try {
    const newDate = new Date().toISOString();
    await puppeteer.crawl();
    let page = await puppeteer.getPage();
    const client: any = await dbConnection("dev");

    const INSTA: any = [];

    Async.waterfall(
      [
        function (callback: (arg0: null) => void) {
          page
            ?.goto("https://tiktok.com", {
              waitUntil: "networkidle2",
            })
            .then(() => {
              setTimeout(() => {
                callback(null);
              }, 30000);
            });
        },
        ...INSTA.map(
          (x: any, i: number) =>
            function (callback: any) {
              console.log("processing:", i, x._id, x.link);
              scrapTiktokProfile({ page, item: x, callback, client, newDate });
            }
        ),
      ],
      function (err, result) {
        if (err) {
          console.log("error", err);
        } else {
          console.log("done");
        }
      }
    );
  } catch (error) {
    console.log("error-----", error);
  }
};

const scrapTiktokProfile = async ({
  page,
  item,
  callback,
  client,
  newDate,
}: {
  page: any;
  item: any;
  callback: any;
  client: MongoClient;
  newDate: string;
}) => {
  try {
    let url = item.link.includes("https") ? item.link : `https://${item.link}`;
    await page?.goto(url, {
      waitUntil: "networkidle2",
    });
    await page?.waitForTimeout(3000);
    const content = await page?.content();
    let $ = cheerio.load(content || "");
    const title = $(`[data-e2e="user-title"]`).text();
    let scriptData: any = $('[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]').text();
    if (scriptData) {
      try {
        const obj = JSON.parse(scriptData);
        scriptData = obj.__DEFAULT_SCOPE__["webapp.user-detail"];
        const userProfileImage = scriptData.userInfo.user.avatarThumb;
        userProfileImage &&
          (await downloadImage(
            userProfileImage,
            `${item.handle}.png`,
            "tt-profile-images"
          ));
      } catch (error: any) {
        console.log();
        console.log(
          "error in parsing scriptData for:",
          url,
          "    message :",
          error.message
        );
      }
    }

    if (title.length) {
      (await client)
        .db("insta-scrapper")
        .collection("scrap_tt_user")
        .insertOne({
          url: url,
          scriptData,
          createdAt: newDate,
        });
    }
    setTimeout(() => {
      callback(null);
    }, 2000);
  } catch (error) {
    console.log("error in scrapTiktokProfile:", error);
    setTimeout(() => {
      callback(null);
    }, 2000);
  }
};
