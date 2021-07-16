import { Era } from '../types/models/Era';
import { SubstrateEvent } from "@subql/types";
import { NominatorValidator } from '../types/models/NominatorValidator';
import { ValidatorPayout } from '../types/models/ValidatorPayout';
import { PayoutDetail } from '../types/models/PayoutDetail';
import { sha256 } from 'js-sha256';

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

    if(currentEra.isNone) {
      return;  
    }

    const currentEraNum = currentEra.unwrap().toNumber();
    const thisEra = currentEra.toString();
    
    const validators = await api.query.session.validators();
    for (const validator of validators){
        // logger.info(`----- validator: ${validator.toString()} at Era: ${currentEraNum}:`);
        const validatorExposure =  await api.query.staking.erasStakers(currentEraNum, validator.toString());
        const { total, own, others } = validatorExposure;
        others.forEach(nominator => {
            // To create NominatorValidator, first we need to create a compisite ID based off its 3 attributes
            const nominatorValidatorId: string = sha256(`${currentEraNum}${nominator.who.toString()}${validator.toString()}`);

            // Once hashed ID is created, we can populate NominatorValidator
            const currNominatorValidator = new NominatorValidator(nominatorValidatorId);
            currNominatorValidator.eraId = currentEraNum.toString();
            currNominatorValidator.nominatorId = nominator.who.toString();
            currNominatorValidator.validatorId = validator.toString();
            currNominatorValidator.save(); //Save to DB
        });

        // Populate ValidatorPayout
        const payoutRewards = await api.query.staking.erasValidatorReward(currentEraNum);
        const currValidatorPayout = new ValidatorPayout(sha256(`${currentEraNum.toString()}${validator.toString()}`));
        currValidatorPayout.eraId = currentEraNum.toString();
        currValidatorPayout.eraPayout = BigInt(payoutRewards.toString());
        currValidatorPayout.claimed = false; // placeholder, working it out

        // Populate PayoutDetail
        const currPayoutDetail = new PayoutDetail(sha256(`${currentEraNum.toString()}${validator.toString()}`));
        currPayoutDetail.eraId = currentEraNum.toString();
        currPayoutDetail.accountId = validator.toString();
        currPayoutDetail.claimed = false; // placeholder
        currPayoutDetail.payoutId = currValidatorPayout.id;
        currValidatorPayout.save();
    }

    // create new era (when not found in db)
    if (!thisEra){
        logger.info(`Era not found, need to add to DB`);
        const newEra = new Era(currentEraNum.toString());
        newEra.startBlock = currentBlock;
        await newEra.save(); 

        // update endblock of th
        const previousEraIndex =  currentEraNum-1;
        const previousEra = await Era.get(previousEraIndex.toString());
        if(previousEra){
            previousEra.endBlock = currentBlock - BigInt(1);
            await previousEra.save();
        }
    }
}

