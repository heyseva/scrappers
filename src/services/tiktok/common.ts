import cheerio from "cheerio";
import { MongoClient } from "mongodb";
import { downloadImage } from "../../helper/images";

export const scrapTiktokProfile = async ({
  page,
  item,
  callback,
  newDate,
  client,
  allowImageDownload = false,
}: {
  page: any;
  item: any;
  callback: any;
  client?: MongoClient;
  newDate: string;
  allowImageDownload?: boolean;
}) => {
  try {
    let url = item.link.includes("https") ? item.link : `https://${item.link}`;
    await page?.goto(url, {
      waitUntil: "networkidle2",
    });

    await page?.waitForTimeout(3000);

    async function scrollUntilNoMoreData(page: any) {
      let previousHeight;
      let currentHeight = await page.evaluate(() => {
        console.log("document----", document.querySelector);
        return (
          // @ts-ignore
          document.querySelector('[data-e2e="user-post-item-list"]').children
            ?.length
        );
      });
      do {
        console.log("previousHeight", previousHeight);
        previousHeight = currentHeight;
        // Scroll to the bottom of the page
        await page.evaluate(() => {
          // @ts-ignore
          const divs = document.querySelector(
            '[data-e2e="user-post-item-list"]'
          ).children;

          divs[divs.length - 1].scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        // Wait for the page to load more data
        await page.waitForTimeout(5000);
        currentHeight = await page.evaluate(
          () =>
            // @ts-ignore
            document.querySelector('[data-e2e="user-post-item-list"]').children
              ?.length
        );
      } while (previousHeight !== currentHeight && previousHeight < 200);
    }

    // Call the function to scroll until no more data can be loaded
    await scrollUntilNoMoreData(page);

    await page?.waitForTimeout(3000);
    const content = await page?.content();
    let $ = cheerio.load(content || "");
    const title = $(`[data-e2e="user-title"]`).text();
    let scriptData: any = $('[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]').text();
    if (scriptData) {
      try {
        const obj = JSON.parse(scriptData);
        scriptData = obj.__DEFAULT_SCOPE__["webapp.user-detail"];

        if (allowImageDownload) {
          try {
            const userProfileImage = scriptData.userInfo.user.avatarThumb;
            userProfileImage &&
              (await downloadImage(
                userProfileImage,
                `${item.handle}.png`,
                "tt-profile-images"
              ));
          } catch (error: any) {
            console.log("error in downloading image:", error.message);
          }
        }
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

    let postUrls = await page.$$eval(
      '[data-e2e="user-post-item-list"] a',
      (elements: any) => {
        return elements.map((element: any) => {
          return element.href;
        });
      }
    );

    postUrls = new Set(postUrls.filter((x: string) => x.includes("/video/")));
    console.log("postUrls----", postUrls);

    if (client) {
      (await client)
        .db("insta-scrapper")
        .collection("scrap_tt_user")
        .insertOne({
          url: url,
          scriptData,
          createdAt: newDate,
        });
      setTimeout(() => {
        callback(null);
      }, 2000);
    } else {
      if (title.length) {
        return {
          isActive: true,
          url: url,
          scriptData,
          createdAt: newDate,
          postUrls: Array.from(postUrls),
        };
      } else {
        return {
          isActive: false,
          url: url,
          scriptData,
          createdAt: newDate,
          postUrls: Array.from(postUrls),
        };
      }
    }
  } catch (error) {
    console.log("error in scrapTiktokProfile:", error);
    setTimeout(() => {
      callback(null);
    }, 2000);
  }
};

export const scrapTiktokProfileFollowings = async ({
  page,
  item,
  callback,
  newDate,
  client,
}: {
  page: any;
  item: any;
  callback: any;
  client?: MongoClient;
  newDate: string;
}) => {
  try {
    let url = item.link.includes("https") ? item.link : `https://${item.link}`;
    await page?.goto(url, {
      waitUntil: "networkidle2",
    });

    await page?.waitForTimeout(3000);

    await page?.click('[data-e2e="following"]');

    async function scrollUntilNoMoreData(page: any) {
      let previousHeight;
      let currentHeight = await page.evaluate(() => {
        return (
          // @ts-ignore
          document.querySelectorAll(".eorzdsw0")[0].children?.length
        );
      });
      do {
        console.log("previousHeight", previousHeight);
        previousHeight = currentHeight;
        // Scroll to the bottom of the page
        await page.evaluate(() => {
          // @ts-ignore
          const divs = document.querySelectorAll(".eorzdsw0")[0].children;

          divs[divs.length - 1].scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        // Wait for the page to load more data
        await page.waitForTimeout(5000);
        currentHeight = await page.evaluate(
          () =>
            // @ts-ignore
            document.querySelectorAll(".eorzdsw0")[0].children?.length
        );
      } while (previousHeight !== currentHeight && previousHeight < 200);
    }

    // Call the function to scroll until no more data can be loaded
    await scrollUntilNoMoreData(page);

    await page?.waitForTimeout(3000);

    const content = await page?.content();
    let $ = cheerio.load(content || "");

    const users = $(".eorzdsw0").find("li");

    const bulkOps = Array.from(users).map((x) => {
      const link = $(x).find("p").text();
      const name = $(x).find("span").text();

      return {
        updateOne: {
          filter: { link, user: url },
          update: {
            $set: {
              link,
              name,
              from: url,
              createdAt: newDate,
            },
          },
          upsert: true,
        },
      };
    });

    if (client) {
      client
        .db("insta-scrapper")
        .collection("scrap_tt_user")
        .bulkWrite(bulkOps)
        .then(() => {
          setTimeout(() => {
            callback(null);
          }, 2000);
        });
    } else {
      if (bulkOps.length) {
        return {
          isActive: true,
          url: url,
          createdAt: newDate,
          bulkOps,
        };
      } else {
        return {
          isActive: false,
          url: url,
          createdAt: newDate,
          bulkOps,
        };
      }
    }
  } catch (error) {
    console.log("error in scrapTiktokProfile:", error);
    setTimeout(() => {
      callback(null);
    }, 2000);
  }
};
