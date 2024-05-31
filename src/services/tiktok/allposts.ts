import dbConnection from "../../utils/mongo";
import puppeteer from "../../utils/puppeteer";
import Async from "async";
import { scrapTiktokProfile } from "./common";
import { MongoClient, ObjectId } from "mongodb";
import { scrapTiktokVideo } from "./video";
import { Page } from "puppeteer";

export const tiktokAllPosts = async (page: Page) => {
  try {
    const newDate = new Date().toISOString();
    // await puppeteer.crawl();
    // let page = await puppeteer.getPage();
    const client = (await dbConnection("dev")) as MongoClient;
    // const live_client = (await dbConnection("live")) as MongoClient;

    const list: any = await client
      ?.db("insta-scrapper")
      .collection("scrap-ig-user")
      .find({
        "tt_data.postUrls": { $exists: true },
        tt_posts: { $exists: false },
      })
      .toArray();

    const profiles = list.filter((x: any) => x?.tt_data?.postUrls?.length > 0);
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
                }, 20000);
              });
          },
          ...profiles.map(
            (profile: any, i: number) =>
              function (callback: any) {
                const ig_link = profile.link;
                const link = profile.tt_link;
                console.log("fetching:", i, ":", { link, ig_link });

                Async.waterfall(
                  [
                    function (postCallback: (arg0: null) => void) {
                      page
                        ?.goto("https://tiktok.com", {
                          waitUntil: "networkidle2",
                        })
                        .then(() => {
                          setTimeout(() => {
                            postCallback(null);
                          }, 20000);
                        });
                    },
                    ...profile.tt_data.postUrls.map(
                      (url: any, i: number) =>
                        function (postCallback: any) {
                          console.log("fetching posts--:", i, url);
                          if (!url?.includes("?is_from_webapp=1")) {
                            url = `${url}?is_from_webapp=1`.toString();
                          }
                          page
                            ?.goto(url, {
                              waitUntil: "networkidle2",
                            })
                            .then(async () => {
                              const data = await scrapTiktokVideo({
                                page,
                                url,
                                callback,
                                newDate,
                              });

                              client
                                ?.db("insta-scrapper")
                                .collection("scrap-ig-user")
                                .updateOne(
                                  {
                                    _id: profile._id,
                                  },
                                  {
                                    $push: {
                                      tt_posts: data,
                                    },
                                  }
                                )
                                .then(() => {
                                  setTimeout(() => {
                                    postCallback(null);
                                  }, 2000);
                                });
                            });
                        }
                    ),
                  ],
                  function (err, result) {
                    if (err) {
                      console.log("error", err);
                    } else {
                      callback(null);
                    }
                  }
                );
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
