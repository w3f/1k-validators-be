import { ChainData, Config, Constants } from "../index";
import ApiHandler from "../ApiHandler";
import { setScoreMetadata } from "./ScoreMetadata";
import { checkAllCandidates, checkCandidate } from "./CheckCandidates";
import {
  scoreAllCandidates,
  scoreCandidate,
  scoreCandidates,
} from "./ScoreCandidates";
import { processCandidates } from "./ProcessCandidates";
import { Candidate } from "../db";

export interface Constraints {
  processCandidates(candidates: Set<Candidate>): Promise<[Set<any>, Set<any>]>;
}

export const constraintsLabel = { label: "Constraints" };

export class OTV implements Constraints {
  public chaindata: ChainData;

  // configurable constants
  public minSelfStake: number;
  public commission: number;
  public unclaimedEraThreshold: number;

  public config: Config.ConfigSchema;

  // Weighted scores
  public WEIGHT_CONFIG = {
    INCLUSION_WEIGHT: Constants.INCLUSION_WEIGHT,
    SPAN_INCLUSION_WEIGHT: Constants.SPAN_INCLUSION_WEIGHT,
    DISCOVERED_WEIGHT: Constants.DISCOVERED_WEIGHT,
    NOMINATED_WEIGHT: Constants.NOMINATED_WEIGHT,
    RANK_WEIGHT: Constants.RANK_WEIGHT,
    UNCLAIMED_WEIGHT: Constants.UNCLAIMED_WEIGHT,
    BONDED_WEIGHT: Constants.BONDED_WEIGHT,
    FAULTS_WEIGHT: Constants.FAULTS_WEIGHT,
    OFFLINE_WEIGHT: Constants.OFFLINE_WEIGHT,
    LOCATION_WEIGHT: Constants.LOCATION_WEIGHT,
    REGION_WEIGHT: Constants.REGION_WEIGHT,
    COUNTRY_WEIGHT: Constants.COUNTRY_WEIGHT,
    PROVIDER_WEIGHT: Constants.PROVIDER_WEIGHT,
    NOMINATIONS_WEIGHT: Constants.NOMINATIONS_WEIGHT,
    RPC_WEIGHT: Constants.RPC_WEIGHT,
    CLIENT_WEIGHT: Constants.CLIENT_WEIGHT,
  };

  constructor(handler: ApiHandler, config: Config.ConfigSchema) {
    this.chaindata = new ChainData(handler);
    this.config = config;

    // Constraints
    this.minSelfStake =
      this.config?.constraints?.minSelfStake || 10000000000000000000;
    this.commission = this.config?.constraints?.commission || 150000000;
    this.unclaimedEraThreshold =
      this.config?.constraints?.unclaimedEraThreshold || 4;

    // Set Weights if they are specified in the config
    this.WEIGHT_CONFIG = {
      INCLUSION_WEIGHT:
        Number(this.config?.score?.inclusion) || Constants.INCLUSION_WEIGHT,
      SPAN_INCLUSION_WEIGHT:
        Number(this.config?.score?.spanInclusion) ||
        Constants.SPAN_INCLUSION_WEIGHT,
      DISCOVERED_WEIGHT:
        Number(this.config?.score?.discovered) || Constants.DISCOVERED_WEIGHT,
      NOMINATED_WEIGHT:
        Number(this.config?.score?.nominated) || Constants.NOMINATED_WEIGHT,
      RANK_WEIGHT: Number(this.config?.score?.rank) || Constants.RANK_WEIGHT,
      UNCLAIMED_WEIGHT:
        Number(this.config?.score?.unclaimed) || Constants.UNCLAIMED_WEIGHT,
      BONDED_WEIGHT:
        Number(this.config?.score?.bonded) || Constants.BONDED_WEIGHT,
      FAULTS_WEIGHT:
        Number(this.config?.score?.faults) || Constants.FAULTS_WEIGHT,
      OFFLINE_WEIGHT:
        Number(this.config?.score?.offline) || Constants.OFFLINE_WEIGHT,
      LOCATION_WEIGHT:
        Number(this.config?.score?.location) || Constants.LOCATION_WEIGHT,
      REGION_WEIGHT:
        Number(this.config?.score?.region) || Constants.REGION_WEIGHT,
      COUNTRY_WEIGHT:
        Number(this.config?.score?.country) || Constants.COUNTRY_WEIGHT,
      PROVIDER_WEIGHT:
        Number(this.config?.score?.provider) || Constants.PROVIDER_WEIGHT,
      NOMINATIONS_WEIGHT:
        Number(this.config?.score?.nominations) || Constants.NOMINATIONS_WEIGHT,
      RPC_WEIGHT: Number(this.config?.score?.rpc) || Constants.RPC_WEIGHT,
      CLIENT_WEIGHT:
        Number(this.config?.score?.client) || Constants.CLIENT_WEIGHT,
    };
  }

  // Set the score metadata: the ranges of values for valid candidates + statistics on values
  async setScoreMetadata() {
    await setScoreMetadata(this);
  }

  // Checks the validity of all candidates
  async checkAllCandidates() {
    return await checkAllCandidates(this);
  }

  // Check the candidate and set any invalidity fields
  async checkCandidate(candidate: Candidate): Promise<boolean> {
    return await checkCandidate(this, candidate);
  }

  async scoreAllCandidates() {
    return await scoreAllCandidates(this);
  }

  async scoreCandidate(candidate: Candidate, scoreMetadata: any) {
    return await scoreCandidate(this, candidate, scoreMetadata);
  }

  async scoreCandidates(candidates: Candidate[]) {
    return await scoreCandidates(this, candidates);
  }

  /// At the end of a nomination round this is the logic that separates the
  /// candidates that did good from the ones that did badly.
  /// - We have two sets, a 'good' set, and a 'bad' set
  ///     - We go through all the candidates and if they meet all constraints, they get called to the 'good' set
  ///     - If they do not meet all the constraints, they get added to the bad set
  async processCandidates(
    candidates: Set<Candidate>,
  ): Promise<[Set<Candidate>, Set<{ candidate: Candidate; reason: string }>]> {
    return await processCandidates(this, candidates);
  }
}
