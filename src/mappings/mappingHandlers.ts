import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { EraRewardPoints } from '@polkadot/types/interfaces';
import { Era } from './../types/models/Era';
import { NominatorValidator } from '../types/models/NominatorValidator';
import { ValidatorPayout } from '../types/models/ValidatorPayout';
import { PayoutDetail } from '../types/models/PayoutDetail';

export async function handleRewards(event: SubstrateEvent, eraNumber: number): Promise<void> {
    const bn = event.block.block.header.number.toBigInt();
    const totalRewards = (await api.query.staking.erasRewardPoints<EraRewardPoints>(eraNumber));
    // destructure data, manipulate, update entity, send to db, gql will work
    
}