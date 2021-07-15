import { Era } from './../types/models/Era';
import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { EraRewardPoints } from '@polkadot/types/interfaces';
// import { Account } from './../types/models/Account';
// import { NominatorValidator } from '../types/models/NominatorValidator';
// import { ValidatorPayout } from '../types/models/ValidatorPayout';
// import { PayoutDetail } from '../types/models/PayoutDetail';

export async function handleSession(event:SubstrateEvent) {

    const currentEra = await api.query.staking.currentEra();
    const currentBlock =  event.block.block.header.number.toBigInt();

    // check it era is obtained. If not, era doesn't exists in db
    // const eraInDb: boolean = dbEraValue !== null ? true : false;
    const {
        event: {
            data: [SessionIndex]
        }
    } = event;

    // logger.info(`SessionId: ${SessionIndex.toString()}, EraIndex: ${JSON.stringify(currentEra)}， currentBlock: ${currentBlock.toString()}`);
    ///
    if(currentEra.isNone) {
      return;  
    }
    const currentEraNum = currentEra.unwrap().toNumber();
    const thisEra = await Era.get(currentEraNum.toString());



    if (!thisEra){
        logger.info(`Era not found, need to add to DB`)


        const newEra = new Era(currentEraNum.toString());
        newEra.startBlock = currentBlock;
        await newEra.save();
        // // update endblock of th
        const previousEraIndex =  currentEraNum-1;
        const previousEra = await Era.get(previousEraIndex.toString());

        if(previousEra){
            previousEra.endBlock = currentBlock - BigInt(1);
            await previousEra.save();
        }

    }

    //Save
    // check if there's new era in DB, if not, create new era

}