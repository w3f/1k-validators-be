class Subscan {
  public baseV1Url: string;
  public baseV2Url: string;
  public denom: number;

  constructor(baseV1Url: string, baseV2Url: string, denom: number) {
    this.baseV1Url = baseV1Url;
    this.baseV2Url = baseV2Url;
    this.denom = denom;
  }
}
