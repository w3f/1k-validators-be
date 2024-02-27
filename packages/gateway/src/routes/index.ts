import Router from "@koa/router";
import Accounting from "../controllers/Accounting";
import Candidate from "../controllers/Candidate";
import Nominator from "../controllers/Nominator";
import Nomination from "../controllers/Nomination";
import EraPoints from "../controllers/EraPoints";
import Score from "../controllers/Score";
import Stats from "../controllers/Stats";
import Location from "../controllers/Location";
import Validator from "../controllers/Validators";
import Rewards from "../controllers/Rewards";
import Block from "../controllers/Block";

const router: any = new Router();

// Koa API Endpoints
const API = {
  BullBoard: "/bull",
  Accounting: "/accounting/:address",
  Candidate: "/candidate/:address",
  GetCandidates: "/candidates",
  GetRankCandidates: "/candidates/rank",
  GetValidCandidates: "/candidates/valid",
  GetInvalidCandidates: "/candidates/invalid",
  GetNominators: "/nominators",
  GetNominator: "/nominator/:address",
  GetNominations: "/nominations",
  GetNominatorNominations: "/nominations/:address/:last",
  GetBotClaimEvents: "/claims",
  Health: "/healthcheck",
  EraPoints: "/erapoints/:address",
  TotalEraPoints: "/totalerapoints",
  LastNomination: "/lastnomination",
  ProxyTxs: "/proxytxs",
  EraStats: "/erastats",
  Score: "/score/:address",
  SessionScore: "/score/:address/:session",
  ScoreMetadata: "/scoremetadata",
  SessionScoreMetadata: "/scoremetadata/:session",
  Release: "/release",
  LocationsCurrentValidatorSet: "/location/currentvalidatorset",
  LocationValidator: "/location/validator/:address",
  LocationStats: "/locationstats",
  ValidLocationStats: "/locationstats/valid",
  SessionLocationStats: "/locationstats/:session",
  EraPaid: "/erapaid",
  EraRewards: "/erareward/:stash/:limit",
  EraReward: "/erareward/:stash/:era",
  LastNominatorStake: "/nominatorstake/:address/last/:limit",
  LatestNominatorStake: "/nominatorstake/:address",
  EraNominatorStake: "/nominatorstake/:address/:era",
  CurrentValidatorSet: "/validators/current",
  Validators: "/validators",
  Validator: "/validator/:address",
  ValidatorsBeefyStats: "/validators/beefy",
  ValidatorsBeefyDummy: "/validators/beefy/dummy",
  RewardsValidator: "/rewards/validator/:address",
  RewardsValidatorTotal: "/rewards/validator/:address/total",
  RewardsAllValidatorsTotal: "/rewards/validators/total",
  RewardsValidatorStats: "/rewards/validator/:address/stats",
  RewardsAllValidatorsStats: "/rewards/validators/stats",
  RewardsNominator: "/rewards/nominator/:address",
  RewardsNominatorTotal: "/rewards/nominator/:address/total",
  RewardsAllNominatorsTotal: "/rewards/nominators/total",
  BlockIndex: "/blockindex",
  StatsTotalReqeusts: "/stats/totalRequests",
  StatsEndpointCounts: "/stats/endpointCounts",
};

// TODO remove
router.get(API.Accounting, Accounting.getAccounting);

router.get(API.Candidate, Candidate.getCandidate);
router.get(API.GetCandidates, Candidate.getCandidates);
router.get(API.GetRankCandidates, Candidate.getRankCandidates);
router.get(API.GetValidCandidates, Candidate.getValidCandidates);
router.get(API.GetInvalidCandidates, Candidate.getInvalidCandidates);

router.get(API.LatestNominatorStake, Candidate.getLatestNominatorStake);
router.get(API.EraNominatorStake, Candidate.getEraNominatorStake);
router.get(API.LastNominatorStake, Candidate.getLastNominatorStake);

router.get(API.GetNominators, Nominator.getNominators);
router.get(API.GetNominator, Nominator.getNominator);

router.get(API.GetNominations, Nomination.getNominations);
router.get(API.GetNominatorNominations, Nomination.getNominatorNominations);
router.get(API.LastNomination, Nomination.getLastNomination);
router.get(API.ProxyTxs, Nomination.getProxyTxs);

router.get(API.EraPoints, EraPoints.getEraPoints);
router.get(API.TotalEraPoints, EraPoints.getTotalEraPoints);

router.get(API.Score, Score.getScore);
router.get(API.SessionScore, Score.getSessionScore);
router.get(API.ScoreMetadata, Score.getLatestScoreMetadata);
router.get(API.SessionScoreMetadata, Score.getSessionScoreMetadata);

router.get(API.CurrentValidatorSet, Validator.getLatestValidatorSet);

router.get(
  API.LocationsCurrentValidatorSet,
  Location.getLocationCurrentValidatorSet,
);
router.get(API.LocationValidator, Location.getValidatorLocation);

router.get(API.EraStats, Stats.getEraStats);
router.get(API.LocationStats, Stats.getLocationStats);
router.get(API.ValidLocationStats, Stats.getValidLocationStats);
router.get(API.SessionLocationStats, Stats.getSessionLocationStats);

router.get(API.Validators, Validator.getValidators);
router.get(API.Validator, Validator.getValidator);
router.get(API.ValidatorsBeefyStats, Validator.getBeefyStats);
router.get(API.ValidatorsBeefyDummy, Validator.getBeefyDummy);

router.get(API.RewardsValidator, Rewards.getRewardsValidator);
router.get(API.RewardsNominator, Rewards.getRewardsNominator);

router.get(API.RewardsValidatorTotal, Rewards.getRewardsValidatorTotal);
router.get(API.RewardsAllValidatorsTotal, Rewards.getRewardsAllValidatorsTotal);
router.get(API.RewardsValidatorStats, Rewards.getRewardsValidatorStats);
router.get(API.RewardsAllValidatorsStats, Rewards.getRewardsAllValidatorStats);
router.get(API.RewardsNominatorTotal, Rewards.getRewardsNominatorTotal);
router.get(API.RewardsAllNominatorsTotal, Rewards.getRewardsAllNominatorsTotal);

router.get(API.BlockIndex, Block.getBlockIndex);

router.get(API.StatsTotalReqeusts, Stats.getTotalRequests);
router.get(API.StatsEndpointCounts, Stats.getEndpointCounts);

// router.get("/stats/totalRequests", (ctx) => {
//   ctx.body = { totalRequests: requestEmitter.listenerCount("requestReceived") };
// });
//
// // Endpoint to retrieve the count of requests per endpoint
// router.get("/stats/endpointCounts", (ctx) => {
//   const endpointCounts = {};
//
//   // Iterate over all registered endpoints
//   requestEmitter.eventNames().forEach((endpoint) => {
//     endpointCounts[endpoint] = requestEmitter.listenerCount(endpoint);
//   });
//
//   ctx.body = { endpointCounts };
// });

export default router;
