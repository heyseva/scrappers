import dbConnection from "../../utils/mongo";
import puppeteer from "../../utils/puppeteer";
import Async from "async";
import { scrapTiktokProfile } from "./common";
import { MongoClient, ObjectId } from "mongodb";

export const tiktokProfiles = async () => {
  try {
    const newDate = new Date().toISOString();
    await puppeteer.crawl();
    let page = await puppeteer.getPage();
    const client = (await dbConnection("dev")) as MongoClient;
    // const live_client = (await dbConnection("live")) as MongoClient;

    const profiles: any = await client
      ?.db("insta-scrapper")
      .collection("scrap-ig-user")
      .aggregate([
        {
          $match: {
            tt_link: { $exists: true },
            tt_data: { $exists: false },
          },
        },
      ])
      .toArray();

    console.log("profiles", profiles.length);

    if (profiles.length) {
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
          ...profiles.map(
            (x: any, i: number) =>
              function (callback: any) {
                const ig_link = x.link;
                const link = x.tt_link;
                console.log("fetching:", i, ":", { link, ig_link });
                scrapTiktokProfile({
                  page,
                  item: { link: link },
                  callback,
                  newDate,
                }).then((result: any) => {
                  if (
                    result
                    // &&
                    // result?.reels?.length > 0 &&
                    // result.data
                  ) {
                    client
                      .db("insta-scrapper")
                      .collection("scrap-ig-user")
                      .updateOne(
                        {
                          _id: x._id,
                        },
                        {
                          $set: {
                            tt_data: result,
                            active: true,
                          },
                        },
                        {
                          upsert: true,
                        }
                      )
                      .then(() => {
                        setTimeout(() => {
                          console.log("done processing: ", i);
                          callback(null);
                        }, 5000);
                      });
                  } else {
                    setTimeout(() => {
                      console.log("done processing: ", i);
                      callback(null);
                    }, 5000);
                  }
                });
              }
          ),
        ],
        function (err, result) {
          if (err) {
            console.log("error", err);
          } else {
            console.log("All data fetched and saved in db");
          }
        }
      );
    }
  } catch (error) {
    console.log("error-----", error);
  }
};
