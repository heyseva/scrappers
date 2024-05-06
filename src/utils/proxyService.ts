import axios from "axios";
import { proxies } from "../constants/proxyIps";

export const getRequest = async (url: string) => {
  return await axios.get(url);
  // return await axios.get(url, {
  //   proxy: {
  //     host: "96.80.235.1",
  //     port: 8080,
  //   },
  // });
};
