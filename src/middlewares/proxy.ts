import { NextFunction, Request, Response } from "express";
import { proxies } from "../constants/proxyIps";
import axios, { AxiosError } from "axios";

export const proxyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let response;
  let retries = 10; // Number of retries

  while (retries > 0) {
    const proxyUrl = proxies[Math.floor(Math.random() * proxies.length)]; // Select a random proxy
    try {
      response = await axios.get(req.url, {
        proxy: { host: proxyUrl, port: 80 },
      });
      break; // Break the loop if the request succeeds
    } catch (error: AxiosError | any) {
      if (error.message.includes("ENOTFOUND")) {
        console.error(`Proxy ${proxyUrl} is not available. Retrying...`);
        retries--;
        if (retries === 0) {
          console.error(
            "All retries failed. Falling back to default behavior."
          );
          next(); // Proceed without the proxy
        }
      } else {
        throw error; // Rethrow if the error is not related to the proxy
      }
    }
  }

  if (response) {
    res.send(response.data);
  }
};
