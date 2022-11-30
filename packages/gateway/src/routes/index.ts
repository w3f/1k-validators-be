import Router from "@koa/router";
import Accounting from "../controllers/Accounting";
import Candidate from "../controllers/Candidate";
import Nominator from "../controllers/Nominator";
import Nomination from "../controllers/Nomination";
import EraPoints from "../controllers/EraPoints";
import Democracy from "../controllers/Democracy";
import Score from "../controllers/Score";
import Stats from "../controllers/Stats";
import Location from "../controllers/Location";
import Validator from "../controllers/Validators";

const router = new Router();

const API = {
  BullBoard: "/bull",
  Accounting: "/accounting/:address",
  Candidate: "/candidate/:address",
  GetCandidates: "/candidates",
  GetValidCandidates: "/candidates/valid",
  GetInvalidCandidates: "/candidates/invalid",
  GetNodes: "/nodes",
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
  SessionLocationStats: "/locationstats/:session",
  Councillors: "/councillor",
  Councillor: "/councillor/:address",
  Voters: "/voters",
  ElectionStats: "/electionstats",
  EraPaid: "/erapaid",
  EraRewards: "/erareward/:stash/:limit",
  EraReward: "/erareward/:stash/:era",
  Referenda: "/referenda",
  Referendum: "/referendum/:index",
  LastReferendum: "/lastreferendum",
  LastReferendums: "/lastreferendums",
  ReferendumIndexVotes: "/referendumvotes/index/:index",
  ReferendumAccountVotes: "/referendumvotes/account/:address",
  LastNominatorStake: "/nominatorstake/:address/last/:limit",
  LatestNominatorStake: "/nominatorstake/:address",
  EraNominatorStake: "/nominatorstake/:address/:era",
  Delegations: "/delegations/:address",
  AllDelegations: "/delegations",
  CurrentValidatorSet: "/validators/current",
  AddressConvictionVotes: "/opengov/votes/address/:address",
  AddressTrackConvictionVotes: "/opengov/votes/address/:address/track/:track",
  TrackConvictionVotes: "/opengov/votes/track/:track",
  ReferendumConvictionVotes: "/opengov/votes/referendum/:index",
};

router.get(API.Accounting, Accounting.getAccounting);

router.get(API.Candidate, Candidate.getCandidate);
router.get(API.GetCandidates, Candidate.getCandidates);
router.get(API.GetValidCandidates, Candidate.getValidCandidates);
router.get(API.GetInvalidCandidates, Candidate.getInvalidCandidates);
router.get(API.GetNodes, Candidate.getNodes);
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

router.get(API.ElectionStats, Democracy.getElectionStats);
router.get(API.Councillors, Democracy.getCouncillors);
router.get(API.Councillor, Democracy.getCouncillor);
router.get(API.Voters, Democracy.getVoters);
router.get(API.Referenda, Democracy.getAllReferenda);
router.get(API.Referendum, Democracy.getReferendum);
router.get(API.LastReferendum, Democracy.getLastReferendum);
router.get(API.LastReferendums, Democracy.getLastReferendums);
router.get(API.ReferendumIndexVotes, Democracy.getReferendumIndexVotes);
router.get(API.ReferendumAccountVotes, Democracy.getReferendumAccountVotes);
router.get(API.Delegations, Democracy.getDelegations);
router.get(API.AllDelegations, Democracy.getAllDelegations);

router.get(API.AddressConvictionVotes, Democracy.getAddressConvictionVotes);
router.get(
  API.AddressTrackConvictionVotes,
  Democracy.getAddressTrackConvictionVotes
);
router.get(API.TrackConvictionVotes, Democracy.getTrackConvictionVotes);
router.get(
  API.ReferendumConvictionVotes,
  Democracy.getReferendumConvictionVotes
);

router.get(API.Score, Score.getScore);
router.get(API.SessionScore, Score.getSessionScore);
router.get(API.ScoreMetadata, Score.getLatestScoreMetadata);
router.get(API.SessionScoreMetadata, Score.getSessionScoreMetadata);

router.get(API.CurrentValidatorSet, Validator.getLatestValidatorSet);

router.get(
  API.LocationsCurrentValidatorSet,
  Location.getLocationCurrentValidatorSet
);
router.get(API.LocationValidator, Location.getValidatorLocation);

router.get(API.EraStats, Stats.getEraStats);
router.get(API.LocationStats, Stats.getLocationStats);
router.get(API.SessionLocationStats, Stats.getSessionLocationStats);

export default router;
