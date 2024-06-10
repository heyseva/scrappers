import dbConnection from "../../utils/mongo";
import Async from "async";
import { Request } from "express";
import { Page } from "puppeteer";
import { getNumberValue } from "../../utils/lib";
import cheerio from "cheerio";
import { MongoClient } from "mongodb";
import { scrapTiktokVideo } from "./video";

// @ts-ignore
async function scrollUntilNoMoreData(scrollPage: Page) {
  if (typeof scrollPage && scrollPage?.evaluate) {
    let currentItems = await scrollPage.evaluate(() => {
      const element = document.querySelectorAll('[data-e2e="challenge-item"]');
      return element ? element?.length : 0;
    });
    let previousItems = 0;
    let currentHeight = 0;

    do {
      if (scrollPage) {
        currentHeight = await scrollPage?.evaluate(() => {
          const element = document.querySelector(
            '[data-e2e="challenge-item-list"]'
          );
          return element ? element.scrollHeight : 0;
        });
        previousItems = currentItems;
        await scrollPage?.evaluate((height) => {
          window.scrollTo({
            top: height + 200,
            behavior: "smooth",
          });
        }, currentHeight);

        await scrollPage?.waitForTimeout(5000);
        currentItems = await scrollPage?.evaluate(() => {
          const element = document.querySelectorAll(
            '[data-e2e="challenge-item"]'
          );
          return element ? element?.length : 0;
        });
      }
      console.log("scrollUntilNoMoreData----", currentItems, previousItems);
    } while (previousItems !== currentItems && previousItems < 200);
    console.log("scrollUntilNoMoreData----", currentItems);
    return currentItems;
  }
}

const getLinks = async ({
  tiktokPage,
  callback,
  postCount,
}: {
  tiktokPage: Page;
  callback: any;
  postCount: number;
}) => {
  try {
    console.log("getLinks----", callback);
    scrollUntilNoMoreData(tiktokPage).then(async () => {
      console.log("scrollUntilNoMoreData----", callback);
      callback(null, postCount);
    });
  } catch (error) {
    console.log("error-----", error);
    callback(null, error);
  }
};

export const tiktokHashTag = async (req: Request, tiktokPage: Page) => {
  try {
    const client: any = await dbConnection("dev");

    // const INSTA: any = [];
    const tag = req.query.tag;
    const orgId = req.query.orgId;
    const tagId = req.query.tagId;
    console.log("tag------", tag);
    Async.waterfall(
      [
        function (callback: any) {
          tiktokPage
            ?.goto(`https://www.tiktok.com/tag/${tag}`, {
              waitUntil: "networkidle2",
            })
            .then(async () => {
              const count = await tiktokPage.evaluate(() => {
                const element = document.querySelector(
                  '[data-e2e="challenge-vvcount"]'
                );
                return (
                  (element as HTMLElement)?.innerText.replace("posts", "0") ||
                  ""
                );
              });

              const postCount = getNumberValue(count);
              callback(null, postCount);
            });
        },
        function (postCount: number, callback: any) {
          getLinks({ tiktokPage, callback, postCount });
        },
        function (count: number, callback: any) {
          new Promise(async (resolve, reject) => {
            const content = await tiktokPage?.content();
            let $ = cheerio.load(content);

            const items = $('[data-e2e="challenge-item"]');

            const data = items
              .map((i, el) => {
                const link = $(el).find("a").attr("href");
                const description = $(el).siblings("div").find("a").text();
                const userName = $(el)
                  .find(`[data-e2e="challenge-item-username"]`)
                  .text();
                const userLink = $(el)
                  .find('[data-e2e="challenge-item-avatar"]')
                  .attr("href");

                return {
                  link,
                  userName,
                  userLink,
                  description,
                };
              })
              .get();

            resolve(data);
          }).then((data) => {
            callback(null, data);
          });
        },
      ],
      function (err, result) {
        if (err) {
          console.log("error", err);
        } else {
          tiktokAllPosts(tiktokPage, result);
        }
      }
    );
  } catch (error) {
    console.log("error-----", error);
  }
};

export const tiktokAllPosts = async (page: Page, posts: any) => {
  try {
    const client = (await dbConnection("dev")) as MongoClient;

    if (posts.length) {
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
          ...posts.map(
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
                                newDate: "",
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
