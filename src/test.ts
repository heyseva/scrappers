// import { MongoClient } from "mongodb";
// import dbConnection from "./utils/mongo";
// import { extractEmails } from "./utils/lib";

// const main = async () => {
//   const client = (await dbConnection("dev")) as MongoClient;
//   const list = await client
//     .db("insta-scrapper")
//     .collection("scrap-ig-user")
//     .find({ "data.business_discovery.biography": { $exists: true } })
//     // .find({ "data.data.business_discovery": { $exists: true } })
//     .toArray();

//   console.log("list", list.length);

//   const data = list.filter((x) => {
//     const email = extractEmails(
//       x.data.business_discovery.biography || x.business_discovery.biography
//     );
//     if (email.length) {
//       return true;
//     }
//   });

//   console.log(data.length);
// };

// main();
