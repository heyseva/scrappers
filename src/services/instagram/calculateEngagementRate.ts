import { Request, Response } from "express";
import dbConnection from "../../utils/mongo";
import { MongoClient, ObjectId } from "mongodb";
import { calculateEngagementRateRange } from "../../utils/lib";
import {
  analyzeEngagement,
  analyzeTTEngagement,
} from "../../utils/engagementRate";
import { calculateFollowingsAnalysis } from "../../utils/followingGrowth";
// import { analyzeEngagement } from "../../utils/engagementRate";

export const calculateIGEngagementRateRange = async (req: any, res: any) => {
  console.log("Calculating IG Engagement Rate Range...");
  try {
    const client = (await dbConnection("dev")) as MongoClient;
    const live_client = (await dbConnection("live")) as MongoClient;
    const profiles = await client
      ?.db("insta-scrapper")
      .collection("scrap-ig-user")
      .find({})
      .toArray();

    console.log("profiles----", profiles.length);

    profiles.forEach(async (profile: any) => {
      if (
        profile?.data?.business_discovery?.media?.data ||
        profile?.data?.media?.data
      ) {
        const allposts =
          profile?.data?.media?.data ||
          profile?.data?.business_discovery?.media?.data;

        let posts = allposts.filter(
          (x: any) => x?.like_count > 0 && x?.comments_count > 0
        );

        if (!posts.length) {
          posts = allposts.filter((x: any) => x?.comments_count > 0);
        }

        const totalLikeCount = posts.reduce((acc: any, curr: any) => {
          let value = 0;
          if (curr.like_count) {
            value = curr.like_count;
          } else {
            value = curr.comments_count + 1;
          }
          return acc + value;
        }, 0);

        const averageLikeCount = totalLikeCount / posts.length;

        posts = allposts.map((x: any) => {
          return {
            like_count: x?.like_count || averageLikeCount,
            comments_count: x.comments_count,
          };
        });

        const influencer = await live_client
          .db("heyseva")
          .collection("influencers")
          .findOne({
            ig_link: {
              $regex: profile.link.replace("https://www.instagram.com", ""),
            },
          });

        console.log("influencer-----", profile.link);

        if (influencer) {
          const likes = posts.map((x: any) => x.like_count);
          const comments = posts.map((x: any) => x.comments_count);
          const followers_count =
            profile.data.business_discovery.followers_count;

          const igEngRate = analyzeEngagement({
            likes,
            comments,
            followers: followers_count,
          });

          const followingGrowthRate = calculateFollowingsAnalysis(
            {
              count: influencer?.ig_followers,
              date: new Date("2024-02-02").toISOString(),
            },
            {
              count: followers_count,
              date: new Date().toISOString(),
            }
          );

          let ttEngRate = "";

          let tt_followers_count = 0;
          let tt_followingGrowthRate = {
            followingsGrowthRate: 0,
            upOrDown: "",
          };

          if (profile?.tt_data?.scriptData?.userInfo?.stats?.followerCount) {
            tt_followers_count =
              profile.tt_data.scriptData.userInfo.stats.followerCount;
          }

          if (profile.tt_posts) {
            const tt_posts = profile.tt_posts
              .filter(
                (x: any) =>
                  x.scriptData.itemInfo?.itemStruct?.stats?.diggCount > 0 &&
                  x.scriptData.itemInfo?.itemStruct?.stats?.commentCount > 0
              )
              .map((x: any) => x.scriptData.itemInfo.itemStruct.stats);

            const tt_likes = tt_posts.map((x: any) => x.diggCount);
            const tt_comments = tt_posts.map((x: any) => x.commentCount);
            const tt_reposts = tt_posts.map((x: any) =>
              x.repostCount ? Number(x.repostCount) : 0
            );
            const tt_share = tt_posts.map(
              (x: any) => Number(x.shareCount) || 0
            );
            const tt_bookmark = tt_posts.map(
              (x: any) => Number(x.collectCount) || 0
            );

            ttEngRate = analyzeTTEngagement({
              likes: tt_likes,
              comments: tt_comments,
              repost: tt_reposts,
              share: tt_share,
              bookmark: tt_bookmark,
              followers: tt_followers_count,
            });

            // @ts-ignore
            tt_followingGrowthRate = calculateFollowingsAnalysis(
              {
                count: influencer?.tt_followers,
                date: new Date("2024-02-02").toISOString(),
              },
              {
                count: tt_followers_count,
                date: new Date().toISOString(),
              }
            );
          }

          console.log(
            "calculations-----",
            profile.link,
            JSON.stringify(
              {
                ig_eng_rate: igEngRate,
                ig_following_growth_rate:
                  followingGrowthRate.followingsGrowthRate,
                ig_followers_count: followers_count,
                old_followers_count: influencer?.ig_followers,
                ig_growth_type: followingGrowthRate.upOrDown,
                ttEngRate: ttEngRate,
                tt_followingGrowthRate:
                  tt_followingGrowthRate.followingsGrowthRate,
                tt_followers_count: tt_followers_count,
                old_tt_followers_count: influencer?.tt_followers,
                tt_growth_type: tt_followingGrowthRate.upOrDown,
              },
              null,
              2
            )
          );

          await client
            ?.db("insta-scrapper")
            .collection("scrap-ig-user")
            .updateOne(
              { _id: profile._id },
              {
                $set: {
                  ig_eng_rate: igEngRate,
                  ig_following_growth_rate:
                    followingGrowthRate.followingsGrowthRate,
                  ig_followers_count: followers_count,
                  old_followers_count: influencer?.ig_followers,
                  ig_growth_type: followingGrowthRate.upOrDown,
                  ttEngRate: ttEngRate,
                  tt_followingGrowthRate:
                    tt_followingGrowthRate.followingsGrowthRate,
                  tt_followers_count: tt_followers_count,
                  old_tt_followers_count: influencer?.tt_followers,
                  tt_growth_type: tt_followingGrowthRate.upOrDown,
                },
              }
            );
        }
      }
    });
  } catch (error) {
    console.log("error-----", error);
  }
};
