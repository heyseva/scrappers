import dbConnection from "../../utils/mongo";
import Async from "async";
import { Request } from "express";
import { Page } from "puppeteer";
import { getNumberValue } from "../../utils/lib";
import cheerio from "cheerio";
import { MongoClient } from "mongodb";
import { scrapTiktokVideo } from "./video";
import axios from "axios";
import { SEVA_API_URL } from "../../utils/env";
import moment from "moment";

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
    const tag1 = req.query.tag1 as string;
    const tag2 = req.query.tag2 as string;
    const orgId = req.query.orgId as string;
    const tag1Id = req.query.tagId as string;
    const tag2Id = req.query.tagId as string;
    const pageHandle = req.query.pageHandle as string;
    const tiktokHandle = req.query.tiktokHandle as string;
    console.log("tag------", tag1, tag2);
    await tiktokWaterFall({
      tag: tag1,
      tag2,
      orgId,
      tagId: tag1Id,
      tag2Id: tag2Id,
      pageHandle,
      tiktokHandle,
      tiktokPage,
    });
  } catch (error) {
    console.log("error-----", error);
  }
};

const tiktokWaterFall = ({
  tag,
  tag2,
  orgId,
  tagId,
  pageHandle,
  tiktokHandle,
  tiktokPage,
  tag2Id,
}: {
  tag: string;
  tag2: string | undefined;
  orgId: string;
  tagId: string;
  tag2Id: string | undefined;
  pageHandle: string;
  tiktokHandle: string;
  tiktokPage: Page;
}) => {
  try {
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

            resolve(data.filter((x) => !x.userName.includes(tiktokHandle)));
          }).then((data) => {
            callback(null, data);
          });
        },
      ],
      function (err, result) {
        if (err) {
          console.log("error", err);
        } else {
          tiktokAllPosts({
            page: tiktokPage,
            posts: result,
            orgId,
            tagId,
            pageHandle,
            tag2,
            tag2Id,
            tiktokHandle,
          });
        }
      }
    );
  } catch (error) {}
};

export const tiktokAllPosts = async ({
  page,
  posts,
  orgId,
  tagId,
  pageHandle,
  tag2,
  tag2Id,
  tiktokHandle,
}: {
  page: Page;
  posts: any;
  orgId: string;
  tagId: string;
  pageHandle: string;
  tag2: string | undefined;
  tiktokHandle: string;
  tag2Id: string | undefined;
}) => {
  try {
    const client = (await dbConnection("dev")) as MongoClient;
    console.log("tiktokAllPosts----", posts.length);
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
            (post: any, i: number) =>
              function (callback: any) {
                let url = post.link;
                console.log("fetching:", i, ":", { url });

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

                    if (data?.isActive) {
                      const tiktok = data?.scriptData?.itemInfo?.itemStruct;

                      axios
                        .post(`${SEVA_API_URL}/content-library/add`, {
                          url: url,
                          username: tiktok.author.uniqueId,
                          orgId,
                          postedDate: moment
                            .unix(tiktok.createTime)
                            .format("YYYY-MM-DD HH:mm:ss"),
                          mediaId: tiktok.id,
                          userProfilePic: tiktok.author.avatarThumb,
                          followers: data.followers,
                          pageHandle: pageHandle,
                          hashTag: tagId,
                          type: "tiktokHashtag",
                          caption: tiktok.desc,
                          like_count: String(tiktok.stats.diggCount),
                          comments_count: String(tiktok.stats.commentCount),
                          share_count: String(tiktok.stats.shareCount),
                          views_count: String(tiktok.stats.playCount),
                          save_count: tiktok.stats.collectCount,
                          mediaPreviewUrl: tiktok.video.cover,
                          mediaType: "VIDEO",
                        })
                        .then(() => {
                          setTimeout(() => {
                            callback(null);
                          }, 2000);
                        })
                        .catch((error) => {
                          console.log(
                            "error in posting data to seva api",
                            error
                          );
                          setTimeout(() => {
                            callback(null);
                          }, 2000);
                        });
                    } else {
                      setTimeout(() => {
                        callback(null);
                      }, 2000);
                    }
                  });
              }
          ),
        ],
        function (err, result) {
          if (err) {
            console.log("error", err);
          } else {
            if (!tag2) {
              page.close().then();
            } else {
              tiktokWaterFall({
                tag: tag2,
                tag2: undefined,
                orgId,
                tagId: tag2Id as string,
                tag2Id: undefined,
                pageHandle,
                tiktokHandle,
                tiktokPage: page,
              });
            }
          }
        }
      );
    }
  } catch (error) {
    console.log("error-----", error);
  }
};
