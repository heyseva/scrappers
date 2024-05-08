import dbConnection from "../../utils/mongo";
import puppeteer from "../../utils/puppeteer";
import Async from "async";
import { scrapTiktokProfile, scrapTiktokProfileFollowings } from "./common";

export const tiktokProfiles = async () => {
  try {
    const newDate = new Date().toISOString();
    await puppeteer.crawl();
    let page = await puppeteer.getPage();
    const client: any = await dbConnection("dev");

    const INSTA: any = [];

    if (INSTA.length) {
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
                scrapTiktokProfileFollowings({
                  page,
                  item: x,
                  callback,
                  client,
                  newDate,
                });
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
    }
  } catch (error) {
    console.log("error-----", error);
  }
};
