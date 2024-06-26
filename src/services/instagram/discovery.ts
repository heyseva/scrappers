import Async from "async";
import { Request, Response } from "express";
import cheerio from "cheerio";
import { ElementHandle, Page, Puppeteer } from "puppeteer";
import { scrapIGPosts, scrapIGProfile } from "./lib";
import dbConnection from "../../utils/mongo";
import { MongoClient, ObjectId } from "mongodb";
import axios, { AxiosError } from "axios";
import {
  extractEmails,
  extractUsernameFromUrl,
  getNumberValue,
  urlify,
} from "../../utils/lib";
import { inputData } from "./constant";
// import { analyzeEngagement } from "../../utils/engagementRate";

const timeout = 60000;

export const instagamDiscovery = async (
  req: Request,
  res: Response,
  page: Page
) => {
  try {
    const version = `youthforia`;
    // const version = req.query.version || `seva-01`;
    const client = (await dbConnection("dev")) as MongoClient;
    // const live_client = (await dbConnection("live")) as MongoClient;

    const list = await client
      .db("insta-scrapper")
      .collection("scrap-ig-user")
      .find({
        "emails.0": { $exists: true },
        version: { $not: { $regex: "seva" } },
        "linktree.0": { $exists: false },
      })
      .toArray();
    // const exitingList = await client
    //   ?.db("insta-scrapper")
    //   .collection("scrap-ig-user")
    //   .find({
    //     user: { $regex: "youthforia" },
    //     version: { $in: ["seva-assigned", version] },
    //   })
    //   .toArray();

    // const profiles = list.map((x) => ({
    //   ...x,
    //   influencer: {
    //     ig_link: `https://instagram.com${x.link}`,
    //   },
    // }));

    // const list = await client
    //   ?.db("heyseva")
    //   .collection("assignedinfluencers")
    //   .aggregate([
    //     {
    //       $lookup: {
    //         from: "influencers",
    //         localField: "influencerId",
    //         foreignField: "_id",
    //         as: "influencer",
    //       },
    //     },
    //     {
    //       $unwind: "$influencer",
    //     },
    //     {
    //       $match: {
    //         ig_followers_growth_rate: { $exists: false },
    //       },
    //     },
    //   ])
    //   .toArray();

    // let profiles = list.filter((x) => {
    //   const data = exitingList.find((y: any) => y.link.includes(x.link));
    //   if (!data) {
    //     return true;
    //   }
    // });

    const profiles = list.map((x) => ({
      ...x,
      influencer: {
        // ig_link: `https://instagram.com${x.link}`,
        ig_link: x.link,
      },
    }));

    console.log("profiles", profiles.length);

    Async.waterfall(
      [
        function (callback: (arg0: null) => void) {
          console.log("start");
          setTimeout(() => {
            callback(null);
          }, 10000);
        },
        ...profiles.map(
          (x: any, i: number) =>
            function (callback: any) {
              if (x.influencer) {
                const link = x.influencer.ig_link;
                console.log("fetching:", i, ":", link);
                // const name = x.name;
                const username = extractUsernameFromUrl(link);
                // const username = name.toLowerCase();
                console.log("fetching:", i, ":", { link, username });

                Promise.resolve(
                  getDiscovery({
                    username: username.toLowerCase() as string,
                    page,
                  })
                )
                  // .then(async (result: any) => {
                  //   const reels = await scrapIGPosts({
                  //     page,
                  //     item: { url: link },
                  //     subPage:
                  //       link.charAt(link.length - 1) === "/"
                  //         ? "reels"
                  //         : "/reels",
                  //   });
                  //   return { reels, data: result };
                  // })
                  .then(async (result: any) => {
                    try {
                      if (result) {
                        console.log("saving", i);

                        if (result.result?.business_discovery) {
                          result.extractEmails = extractEmails(
                            result.result.business_discovery.biography
                          );
                          result.extractUrls = urlify(
                            result.result.business_discovery.biography
                          );
                        }

                        client
                          .db("insta-scrapper")
                          .collection("scrap-ig-user")
                          .updateOne(
                            {
                              link: link,
                            },
                            {
                              $set: {
                                // user: x.user,
                                scrapped: result,
                                active: true,
                                // version: version,
                                link_fetch: true,
                              },
                            },
                            {
                              upsert: true,
                            }
                          )
                          .then(() => {
                            setTimeout(() => {
                              console.log("done", i);
                              callback(null);
                            }, timeout);
                          });
                      } else {
                        console.log("saving false", i);
                        client
                          .db("insta-scrapper")
                          .collection("scrap-ig-user")
                          .updateOne(
                            {
                              link: link,
                            },
                            {
                              $set: {
                                active: false,
                                // version: version,
                              },
                            },
                            {
                              upsert: true,
                            }
                          )
                          .then(() => {
                            setTimeout(() => {
                              console.log("done", i);
                              callback(null);
                            }, timeout);
                          });
                      }
                    } catch (error: AxiosError | any) {
                      console.log("error--done", i, error.message);
                      setTimeout(() => {
                        callback(null);
                      }, timeout);
                    }
                  });
              } else {
                setTimeout(() => {
                  console.log("done", i);
                  callback(null);
                }, timeout);
              }
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
  } catch (error) {
    console.log("error-----", error);
  }
};

export const getDiscovery = async ({
  username,
  page,
}: {
  username: string;
  page: Page;
}) => {
  try {
    // const data = await axios.get(
    //   `https://dev.api.heyseva.com/instagram/discovery-search?handle=${username}`
    // );
    // console.log(data.data);
    // if (data.data?.business_discovery) {
    //   return data.data;
    // } else {
    //   return await ScrapProfile({
    //     link: `https://instagram.com/${username}`,
    //     page,
    //   });
    // }
    return await ScrapProfile({
      link: `https://instagram.com/${username}`,
      page,
    });
  } catch (error) {
    return await ScrapProfile({
      link: `https://instagram.com/${username}`,
      page,
    });
  }
};

export const ScrapProfile = async ({
  link,
  page,
}: {
  link: string;
  page: Page;
}) => {
  try {
    const url = link;
    await page?.goto(`${url}`, {
      waitUntil: "networkidle2",
    });
    await page?.waitForTimeout(3000);

    // await page.evaluate(() => {
    //   const divs = document.querySelectorAll(
    //     'div[style*="height: auto; overflow: hidden auto;"]'
    //   );
    //   // Iterate through matched divs and scroll them
    //   divs.forEach((div) => {
    //     div.scrollTop = div.scrollHeight;
    //   });
    // });

    await page.evaluate(() => {
      try {
        // @ts-ignore
        const button: ElementHandle = document.querySelector(
          'button[class=" _acan _acao _acas _aj1- _ap30"]'
        );
        if (button && button) {
          button?.click();
        }
      } catch (error) {
        console.log("error", error);
      }
    });

    await page?.waitForTimeout(1000);

    const content = await page?.content();
    let $ = cheerio.load(content || "");
    let UserPosts = {
      posts: 0,
      followers: 0,
      following: 0,
    };
    // search input
    // $('[class="x1lugfcp x19g9edo x6umtig x1b1mbwd xaqea5y xav7gou x1lq5wgf xgqcy7u x30kzoy x9jhf4c x9f619 x5n08af xl565be x5yr21d x1a2a7pz xyqdw3p x1pi30zi xg8j3zb x1swvt13 x1yc453h xh8yej3 xhtitgo xs3hnx8 x1dbmdqj xoy4bel x7xwk5j"]')
    $('[class="x78zum5 x1q0g3np xieb3on"]')
      .find("li")
      .each(function (index: number, element: any) {
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

    // userProfileImage &&
    //   (await downloadImage(
    //     userProfileImage,
    //     `${item.handle}.png`,
    //     "../sourcing-pending"
    //   ));

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
    let biography = $('[class="_ap3a _aaco _aacu _aacx _aad6 _aade"]').text();
    const email = extractEmails(biography);
    const bioUrls = urlify(biography);

    const buttonClick = await page?.$(
      "#mount_0_0_ix > div > div > div.x9f619.x1n2onr6.x1ja2u2z > div > div > div > div.x78zum5.xdt5ytf.x10cihs4.x1t2pt76.x1n2onr6.x1ja2u2z > div:nth-child(2) > section > main > div > header > section > div.x6s0dn4.x78zum5.x1q0g3np.xs83m0k.xeuugli.x1n2onr6 > div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.xmn8rco.x1n2onr6.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1 > div > div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1i64zmx.x1n2onr6.x1plvlek.xryxfnj.x1iyjqo2.x2lwn1j.xeuugli.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1 > button"
    );

    await buttonClick?.click();

    $('[class="x1dm5mii x16mil14 xiojian x1yutycm x1lliihq x193iq5w xh8yej3"]')
      .find("span")
      .each(function (index: number, element: any) {
        console.log($(element).text());
      });

    // Select elements and extract text from <span> into an array
    const links = new Set();
    $('[rel="me nofollow noopener noreferrer"]')
      .find("span")
      .each((i, elem) => {
        links.add($(elem).text());
      });

    console.log(links);

    return {
      link,
      biography,
      email,
      bioUrls,
      links: Array.from(links),
      isVerified: verified,
      handleName,
      name,
      posts: UserPosts.posts,
      followers: UserPosts.followers,
      following: UserPosts.following,
      isActive: name ? true : false,
    };
  } catch (error: any) {
    return undefined;
  }
};
