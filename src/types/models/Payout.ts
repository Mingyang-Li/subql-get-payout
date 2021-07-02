// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';

export class Payout implements Entity {

    constructor(id: string) {
        this.id = id;
    }

    public id: string;
    public eraId: string;
    public eraPayout: bigint;
    public totalValidatorRewardPoints: number;
    public remaining: number;
    public nominatorStakingPayout: string;
    public validatorCommission: string;
    public claimed: boolean;
    public claimedAtBlock: bigint;

    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Payout entity without an ID");
        await store.set('Payout', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Payout entity without an ID");
        await store.remove('Payout', id.toString());
    }

    static async get(id:string): Promise<Payout | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Payout entity without an ID");
        const record = await store.get('Payout', id.toString());
        if (record){
            return Payout.create(record);
        }else{
            return;
        }
    }

    static create(record){
        let entity = new Payout(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
