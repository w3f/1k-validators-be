import axios from "axios";
import { sleep } from "./util";

export class Subscan {
  public baseV1Url: string;
  public baseV2Url: string;
  public denom: number;

  public eventsEndpoint = "/events";

  public defaultHeader = {
    "Content-Type": "application/json",
  };

  constructor(baseV1Url: string, baseV2Url: string, denom: number) {
    this.baseV1Url = baseV1Url;
    this.baseV2Url = baseV2Url;
    this.denom = denom;
  }

  // Returns all the era reward events for the chain.
  // This includes the era, how much rewards total went to validators, 
  // and what the remainder is (that goes to the treasury). 
  // At some point, the name changed from EraPayout to EraPaid, hence
  // this queries both.
  getEraPaid = async () => {
    const url = this.baseV1Url + this.eventsEndpoint;

    // The total list of all events
    const totalList = [];
    // start at page 0
    let page = 0;
    // flag for deciding when the loop should stop
    let shouldContinue = true;

    let queriedEraPaid = false;
    let queriedEraPayout = false;

    // This will be either "erapaid" or "erapayout", depending on where the query is in the loop
    let call = "erapaid";

    // Continue until it reaches the last page of first query (erapaid),
    // then continue until the last page of the second query (erapayout)
    while (shouldContinue) {
      const data = { row: 100, page: page, module: "staking", call: call };

      const res = await axios.post(url, data, { headers: this.defaultHeader });

      const status = res.status;
      if (status == 200) {
        // count is the total amount of entries in all of the pages
        const { count, events } = res.data.data;

        // If we reached the last page of the query
        if (!events) {
          // if we reached the last page of the first "erapaid" query,
          // continue to starting the "erapayout" query
          if (call == "erapaid") {
            queriedEraPaid = true;
            call = "erapayout";
            page = 0;

            // if we reached the last page of the "erapayout" query, stop
          } else if (call == "erapayout") {
            queriedEraPayout = true;
            shouldContinue = false;
          }
        } else {
          const eventPageList = events.map((event) => {
            const {
              event_index,
              block_num,
              extrinsic_idx,
              module_id,
              event_id,
              params,
              event_idx,
              extrinsic_hash,
              finalized,
              block_timestamp,
            } = event;
            const [eraIndex, validatorReward, remainderReward] =
              JSON.parse(params);

            return {
              era: eraIndex.value,
              blockNumber: block_num,
              blockTimestamp: block_timestamp,
              eventIndex: event_index,
              moduleId: module_id,
              eventId: event_id,
              totalValidatorReward: parseFloat(validatorReward.value) / this.denom,
              remainderReward: parseFloat(remainderReward.value) / this.denom,
            };
          });
          page++;
          totalList.push(...eventPageList);
          await sleep(2000);
        }
      } else if (status == 400) {
        //TODO:
      }
    }

    return totalList;
  };
}
