import cheerio from "cheerio";
import { MongoClient } from "mongodb";
import { Page } from "puppeteer";
import {
  extractEmails,
  getNumberValue,
  getUniqueObjects,
  urlify,
} from "../../utils/lib";
import { downloadImage } from "../../helper/images";

export const scrapIGProfile = async ({
  page,
  item,
  callback,
  client,
  allowImageDownload = false,
}: {
  page: Page;
  item: any;
  callback: any;
  client: MongoClient;
  allowImageDownload?: boolean;
}) => {
  try {
    let url = item.link.includes("https") ? item.link : `https://${item.link}`;
    await page?.goto(`${url}`, {
      waitUntil: "networkidle2",
    });

    await page?.waitForTimeout(2000);

    const content = await page?.content();
    let $ = cheerio.load(content || "");
    let UserPosts = {
      posts: 0,
      followers: 0,
      following: 0,
    };

    $('[class="x78zum5 x1q0g3np xieb3on"]')
      .find("li")
      .each(function (index, element) {
        let dataKey = $(element).text().trim();
        if (dataKey.toLowerCase().includes("posts")) {
          UserPosts.posts = getNumberValue(dataKey.split(" ")[0]);
        }
        if (dataKey.toLowerCase().includes("followers")) {
          UserPosts.followers = getNumberValue(dataKey.split(" ")[0]);
        }
        if (dataKey.toLowerCase().includes("following")) {
          UserPosts.following = getNumberValue(dataKey.split(" ")[0]);
        }
      });
    let handleName = $(
      '[class="x1lliihq x1plvlek xryxfnj x1n2onr6 x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye x1ms8i2q xo1l8bm x5n08af x10wh9bi x1wdrske x8viiok x18hxmgj"]'
    ).text();

    const userProfileImage = $(
      `[alt="${handleName.replaceAll("/", "").trim()}'s profile picture"]`
    ).attr("src");
    let profileImage = userProfileImage;
    if (allowImageDownload) {
      userProfileImage &&
        (profileImage = await downloadImage(
          userProfileImage,
          `${item.handle}.png`,
          "../sourcing-pending"
        ));
    }

    let isVerified = $(
      '[class="x9f619 xjbqb8w x78zum5 x168nmei x13lgxp2 x5pf9jr xo71vjh x1gslohp x1i64zmx x1n2onr6 x1plvlek xryxfnj x1c4vz4f x2lah0s xdt5ytf xqjyukv x1qjc9v5 x1oa3qoh x1nhvcw1"]'
    ).text();
    let verified = "";
    if (isVerified) {
      verified = "Verified";
    }
    let name = $(
      '[class="x1lliihq x1plvlek xryxfnj x1n2onr6 x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye xvs91rp x1s688f x5n08af x10wh9bi x1wdrske x8viiok x18hxmgj"]'
    ).text();
    let bio = $('[class="_ap3a _aaco _aacu _aacx _aad6 _aade"]').text();
    const email = extractEmails(bio);
    const urls = urlify(bio);
    let link = $('[rel="me nofollow noopener noreferrer"]').text();
    if (!link) {
      link = $('[class="_acan _acao _acas _aj1-"]').text();
    }

    await page?.waitForTimeout(2000);
    callback(null, {
      handleName,
      profileImage,
      verified,
      name,
      bio,
      email,
      urls,
      link,
      UserPosts,
    });
  } catch (error: any) {
    console.log("error in scrapInstagramProfile:", error?.message);
    callback(null);
  }
};

export const scrapIGfollowings = async ({
  page,
  item,
  callback,
  client,
}: {
  page: any;
  item: any;
  callback: any;
  client: MongoClient;
}) => {
  try {
    let url = item.link.includes("https") ? item.link : `https://${item.link}`;
    await page?.goto(`${url}`, {
      waitUntil: "networkidle2",
    });
    await page?.waitForTimeout(3000);

    const links = await page?.$$(
      '[class="x1i10hfl xjbqb8w x1ejq31n xd10rxx x1sy0etr x17r0tee x972fbf xcfux6l x1qhh985 xm0m39n x9f619 x1ypdohk xt0psk2 xe8uvvx xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x4uap5 x18d9i69 xkhd6sd x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz _alvs _a6hd"]'
    );
    links[1].click();

    await page?.waitForTimeout(3000);

    const canScroll = await page?.$(
      '[class="x1lliihq x1plvlek xryxfnj x1n2onr6 x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye xvs91rp xo1l8bm x1roi4f4 x1tu3fi x3x7a5m x10wh9bi x1wdrske x8viiok x18hxmgj"]'
    );

    if (!canScroll) {
      async function scrollUntilNoMoreData(page: any) {
        let previousHeight;
        let currentHeight = await page.evaluate(
          () =>
            document.querySelectorAll(
              ".x1dm5mii.x16mil14.xiojian.x1yutycm.x1lliihq.x193iq5w.xh8yej3"
            ).length
        );
        do {
          console.log("previousHeight", previousHeight);
          previousHeight = currentHeight;
          await page.evaluate(() => {
            const divs = document.querySelectorAll(
              ".x1dm5mii.x16mil14.xiojian.x1yutycm.x1lliihq.x193iq5w.xh8yej3"
            );

            divs[divs.length - 1].scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
          await page.waitForTimeout(5000);
          currentHeight = await page.evaluate(
            () =>
              document.querySelectorAll(
                ".x1dm5mii.x16mil14.xiojian.x1yutycm.x1lliihq.x193iq5w.xh8yej3"
              ).length
          );
        } while (previousHeight !== currentHeight);
      }

      await scrollUntilNoMoreData(page);
    }

    await page?.waitForTimeout(3000);

    const content = await page?.content();
    let $ = cheerio.load(content || "");

    const users = $('[class="x1rg5ohu"]');

    const bulkOps = Array.from(users).map((x) => {
      const link = $(x).find("a").attr("href");
      const name = $(x).find("span").text();

      return {
        updateOne: {
          filter: { link, user: url },
          update: {
            $set: {
              link,
              name,
              user: url,
            },
          },
          upsert: true,
        },
      };
    });

    // callback(null, bulkOps);

    client
      .db("insta-scrapper")
      .collection("scrap-ig-followers")
      .bulkWrite(bulkOps)
      .then((result) => {
        console.log("Bulk write operation completed:", result);
        callback(null);
      })
      .catch((error) => {
        console.error("Error occurred during bulk write operation:", error);
        callback(error);
      });
  } catch (error: any) {
    console.log("error in scrapInstagramFollowings:", error?.message);
    callback(null);
  }
};

export const scrapIGPosts = async ({
  page,
  item,
  callback,
  client,
  subPage = "/",
}: {
  page: Page;
  item: any;
  callback?: any;
  client?: MongoClient;
  subPage?: string;
}) => {
  try {
    let url = item.url.includes("https") ? item.url : `https://${item.url}`;
    const link = `${
      url[url.length - 1] !== "/" ? url + subPage : url + subPage
    }`;
    console.log("link---", link);
    await page?.goto(link, {
      waitUntil: "networkidle2",
    });
    await page?.waitForTimeout(3000);

    const reelsContent = await page?.content();

    let $ = cheerio.load(reelsContent || "");

    const posts = $("main")
      .find('div[role="tablist"]')
      .siblings("div")
      .find('a[role="link"]');
    let reels: any[] = [];
    reels = posts.toArray().map(function (_e, index) {
      const post = $(posts[index]);
      const link = post.attr("href");

      const views = post
        .find('svg[aria-label="Play count icon"]')
        .parent()
        .parent()
        .find('span[dir="auto"]')
        .text();

      const list = post.find("li").find('span[dir="auto"]');
      const likes = list.eq(0).text();
      const comments = list.eq(1).text();
      return {
        link,
        views,
        likes,
        comments,
      };
    });

    let previousReelCount = reels.length;

    async function scrollUntilNoMoreData(newPage: Page) {
      console.log("scrollUntilNoMoreData: newPage----", newPage);
      if (!newPage) {
        return;
      }
      let previousLink;

      const scrollContent = await newPage?.content();
      let $ = cheerio.load(scrollContent || "");
      const posts = $("main")
        .find('div[role="tablist"]')
        .siblings("div")
        .find('a[role="link"]')
        .toArray();
      const post = $(posts[posts.length - 1]);
      let currentLink = post.attr("href");
      await newPage.waitForTimeout(5000);

      do {
        console.log("previousHeight", previousLink);
        previousLink = currentLink;
        await newPage.evaluate(() => {
          const footer = document.querySelector("footer");
          footer?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        await newPage.waitForTimeout(5000);

        const newScrollContent = await newPage?.content();
        let $n = cheerio.load(newScrollContent || "");
        const newPosts = $n("main")
          .find('div[role="tablist"]')
          .siblings("div")
          .find('a[role="link"]')
          .toArray();

        const reelList = newPosts.map(function (_e, index) {
          const post = $(newPosts[index]);
          const link = post.attr("href");

          const views = post
            .find('svg[aria-label="Play count icon"]')
            .parent()
            .parent()
            .find('span[dir="auto"]')
            .text();

          const list = post.find("li").find('span[dir="auto"]');
          const likes = list.eq(0).text();
          const comments = list.eq(1).text();
          return {
            link,
            views,
            likes,
            comments,
          };
        });

        previousReelCount = reels.length;

        reels = getUniqueObjects([...reels, ...reelList]);

        await newPage.waitForTimeout(5000);

        const newScrollContent1 = await newPage?.content();

        let $n1 = cheerio.load(newScrollContent1 || "");
        const newPosts1 = $n1("main")
          .find('div[role="tablist"]')
          .siblings("div")
          .find('a[role="link"]')
          .toArray();
        const post = $n1(newPosts1[newPosts1.length - 1]);
        currentLink = post.attr("href");
        console.log("reels.length---", reels.length);
      } while (
        !previousLink?.includes(currentLink as string) &&
        reels.length < 100 &&
        previousReelCount !== reels.length
      );
    }

    await scrollUntilNoMoreData(page);

    console.log("reels---", reels);

    if (callback) {
      setTimeout(() => {
        callback(null, {});
      }, 15000);
    } else {
      return reels;
    }
  } catch (error: any) {
    console.log("error in scrapInstagramPosts:", error?.message, "----", error);
    if (callback) {
      callback(null);
    } else {
      return {};
    }
  }
};
