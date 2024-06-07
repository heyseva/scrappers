import dbConnection from "../../utils/mongo";
import Async from "async";
import { scrapTiktokProfileFollowings } from "./common";
import { Page } from "puppeteer";

export const tiktokFollowers = async (page: Page) => {
  try {
    const newDate = new Date().toISOString();
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
