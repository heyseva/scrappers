import { Request, Response } from "express";
import Scraper from "./index";
import Async from "async";

export const scrapLT = async (req: Request) => {
  const profile = req.query.profile;
  if (profile) {
    const result = await Scraper(profile as string);
    return result;
  } else {
    return "Failed to scrape linktree profile";
  }
};
