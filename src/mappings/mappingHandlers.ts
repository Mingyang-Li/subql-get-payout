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
        const currValidatorPayout = await new ValidatorPayout(`${currentEraNum.toString()}${validator.toString()}`);
        currValidatorPayout.eraId = currentEraNum.toString();
        currValidatorPayout.eraPayout = BigInt(payoutRewards.toString());
        currValidatorPayout.claimed = false; // placeholder, working it out

        // logger.info(`------ nominators: ${JSON.stringify(exposure.others)}`);
    }


    // when mapping, start from others field

    // const exposureInfos = await api.query.staking.erasStakers.multi<Exposure>(validators.map(validator=>[currentEraNum, validator]));
    // const exposure = await api.derive.staking.eraExposure(eraIndex);
    // logger.info(`nominators: ${JSON.stringify(exposureInfos)}`);

    // logger.info(`currentEraNum: ${currentEraNum}, thisEra: ${thisEra}`);

    // type validatorsType = {
    //     validatorId: string;
    //     rewardPoints: number,
    // }

    // create new era (when not found in db)
    // if (!thisEra){
    //     logger.info(`Era not found, need to add to DB`);
    //     const newEra = new Era(currentEraNum.toString());
    //     newEra.startBlock = currentBlock;
    //     await newEra.save(); 

        // once saved, start updating nominators and validators for this era one by one
        // for each reward point of the given era, calculate their actual amount staked against the id and store them into DB

        // Get total reward points
        // const totalRewards = (await api.query.staking.erasRewardPoints<EraRewardPoints>(currentEraNum));
        // const totalRewardPoints = parseInt(totalRewards.total.toString());

        // // Get the $$$ amount staked
        // const rewardAmount = await api.query.staking.erasValidatorReward(currentEraNum);
        // const totalRewardAmount = Number(rewardAmount.toString());

        // for (let i=0; i<totalRewards.individual.size; i++) {
        //     const { value, key } = totalRewards.individual[i];
        //     const payout = await new ValidatorPayout(i.toString());
        //     const isClaimed = 

        //     // Crrating entity from here
        //     payout.eraId = currentEraNum.toString();
        //     payout.eraPayout = BigInt((parseInt(value.toString()) / totalRewardPoints) * 100 * totalRewardAmount);
        //     payout.claimed =    
        //     payout.claimedAtBlock = currentBlock;
        // }
      

        // // update endblock of th
    //     const previousEraIndex =  currentEraNum-1;
    //     const previousEra = await Era.get(previousEraIndex.toString());
    //     if(previousEra){
    //         previousEra.endBlock = currentBlock - BigInt(1);
    //         await previousEra.save();
    //     }
    // }
}

