import axios from "axios";
import { KOTVBackendEndpoint } from "../../src/constants";

const kusamaStash = "FDDy3cQa7JXiChYU2xq1B2WUUJBpZpZ51qn2tiN1DqDMEpS";

const url = `${KOTVBackendEndpoint}/candidate/${kusamaStash}`;

const main = async () => {
  const res = await axios.get(url);

  console.log(res.data.rank);
};

main();
