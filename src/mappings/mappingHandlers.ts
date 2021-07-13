import { Era } from './../types/models/Era';
import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { EraRewardPoints } from '@polkadot/types/interfaces';
import { Account } from './../types/models/Account';
import { NominatorValidator } from '../types/models/NominatorValidator';
import { ValidatorPayout } from '../types/models/ValidatorPayout';
import { PayoutDetail } from '../types/models/PayoutDetail';

export async function handleRewards(event: SubstrateEvent, eraNumber: number, accountId: string): Promise<void> {
    const totalRewards = (await api.query.staking.erasRewardPoints<EraRewardPoints>(eraNumber));
    // get total reward points
    const totalRewardPoints = parseInt(totalRewards.total.toString());
    const rewardAmount = await api.query.staking.erasValidatorReward(eraNumber);
    const totalRewardAmount = Number(rewardAmount.toString());


    // destructure data, manipulate, update entity, send to db, gql will work

    const account = new Account(accountId);
    const eraStr = eraNumber.toString(); // to add ids of noms and vals
    const nomStr = "noIdea";
    const ValStr = "alsoNoIdeea";

    const nominatorValidator = new NominatorValidator(account.id)
    nominatorValidator}