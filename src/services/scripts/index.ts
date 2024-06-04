import { MongoClient } from "mongodb";
import dbConnection from "../../utils/mongo";
import { users } from "../tiktok/constant";

export const setTiktokProfileIGUrl = async () => {
  try {
    const profiles: any = users;
    const client = (await dbConnection("dev")) as MongoClient;
    profiles.forEach(async (element: any, index: number) => {
      console.log("fetching:", index);
      await client
        ?.db("insta-scrapper")
        .collection("scrap-ig-user")
        .updateOne(
          {
            link: element.tt_link,
          },
          {
            $set: {
              ig_link: element.link,
            },
          }
        );
    });
  } catch (error) {
    console.log("error-----", error);
  }
};
