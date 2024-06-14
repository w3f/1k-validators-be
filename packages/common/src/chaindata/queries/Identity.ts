import Chaindata, { handleError, HandlerType } from "../chaindata";
import { Identity } from "../../types";

export const hasIdentity = async (
  chaindata: Chaindata,
  account: string,
): Promise<[boolean, boolean]> => {
  try {
    const api = await chaindata.peopleHandler.getApi();

    if (!api?.isConnected) {
      return [false, false];
    }
    let identity = await api.query.identity.identityOf(account);
    if (!identity || !identity.isSome) {
      // check if it's a sub
      const superOf = await api.query.identity.superOf(account);
      if (superOf && superOf.isSome) {
        identity = await api.query.identity.identityOf(superOf.unwrap()[0]);
      }
    }
    const identityInfo = await api.derive.accounts.identity(account);
    if (!identityInfo) return null;
    let verified = false;
    if (identity && identity.isSome) {
      const { judgements } = identityInfo;
      for (const judgement of judgements) {
        const status = judgement[1];
        verified = status.isReasonable || status.isKnownGood;
        if (verified) break;
      }
    }

    return [identity ? identity.isSome : false, verified];
  } catch (e) {
    await handleError(chaindata, e, "hasIdentity", HandlerType.PeopleHandler);
    return [false, true];
  }
};

export const getFormattedIdentity = async (
  chaindata: Chaindata,
  addr: string,
): Promise<Identity | null> => {
  try {
    const api = await chaindata.peopleHandler.getApi();

    if (!api?.isConnected) {
      return null;
    }
    let identity: Identity | null = null;
    let verified = false;
    const subAccounts: { name: string; address: string }[] = [];

    const hasId = await api.derive.accounts.hasIdentity(addr);
    if (!hasId || !hasId.hasIdentity) return null;

    const identityInfo = await api.derive.accounts.identity(addr);
    if (!identityInfo) return null;

    const hasSubs = await api.query.identity.subsOf(addr);
    if (hasSubs && hasSubs[1].length > 0) {
      for (const subaccountAddress of hasSubs[1]) {
        const subAccountIdentity = await api.derive.accounts.identity(
          subaccountAddress.toString(),
        );
        if (subAccountIdentity) {
          const subAccount: { name: string; address: string } = {
            name: subAccountIdentity.display || "",
            address: subaccountAddress.toString(),
          };
          subAccounts.push(subAccount);
        }
      }
    }

    const {
      display,
      email,
      image,
      judgements,
      legal,
      pgp,
      riot,
      twitter,
      web,
      parent,
      displayParent,
    } = identityInfo;

    const judgementKinds = [];
    for (const judgement of judgements) {
      const status = judgement[1];
      if (status.isReasonable || status.isKnownGood) {
        judgementKinds.push(status.toString());
        verified = status.isReasonable || status.isKnownGood;
      }
    }

    if (parent) {
      const superIdentity = await api.derive.accounts.identity(parent);
      if (superIdentity) {
        const superAccount: { name: string; address: string } = {
          name: superIdentity.display || "",
          address: parent.toString(),
        };
        const subIdentities = await api.query.identity.subsOf(parent);
        if (subIdentities && subIdentities[1].length > 0) {
          for (const subaccountAddress of subIdentities[1]) {
            const subAccountIdentity = await api.derive.accounts.identity(
              subaccountAddress.toString(),
            );
            if (subAccountIdentity) {
              const subAccount: { name: string; address: string } = {
                name: subAccountIdentity.display || "",
                address: subaccountAddress.toString(),
              };
              subAccounts.push(subAccount);
            }
          }
        }

        identity = {
          address: superAccount.address,
          name: superAccount.name,
          subIdentities: subAccounts,
          display,
          email,
          image,
          verified,
          judgements: judgementKinds,
          legal,
          pgp,
          riot,
          twitter,
          web,
        };
      }
    } else {
      identity = {
        name: display || "",
        address: addr,
        verified,
        subIdentities: subAccounts,
        display,
        email,
        image,
        judgements: judgementKinds,
        legal,
        pgp,
        riot,
        twitter,
        web,
      };
    }

    return identity;
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getFormattedIdentity",
      HandlerType.PeopleHandler,
    );
    return null;
  }
};
