import Router from "@koa/router";
import Accounting from "../controllers/Accounting";
import Candidate from "../controllers/Candidate";
import Nominator from "../controllers/Nominator";
import Nomination from "../controllers/Nomination";
import EraPoints from "../controllers/EraPoints";
import Democracy from "../controllers/Democracy";
import Score from "../controllers/Score";
import Stats from "../controllers/Stats";

const router = new Router();

const API = {
  BullBoard: "/bull",
  Accounting: "/accounting/:address",
  Candidate: "/candidate/:address",
  GetCandidates: "/candidates",
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
  Release: "/release",
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
  NominatorStake: "/nominatorstake/:address",
  Delegations: "/delegations/:address",
  AllDelegations: "/delegations",
};

router.get(API.Accounting, Accounting.getAccounting);

router.get(API.Candidate, Candidate.getCandidate);
router.get(API.GetCandidates, Candidate.getCandidates);
router.get(API.GetNodes, Candidate.getNodes);
router.get(API.NominatorStake, Candidate.getNominatorStake);

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

router.get(API.Score, Score.getScore);
router.get(API.SessionScore, Score.getSessionScore);
router.get(API.ScoreMetadata, Score.getScoreMetadata);

router.get(API.EraStats, Stats.getEraStats);
router.get(API.LocationStats, Stats.getLocationStats);
router.get(API.SessionLocationStats, Stats.getSessionLocationStats);

export default router;
