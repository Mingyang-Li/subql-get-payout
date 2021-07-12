// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';


export class ValidatorPayout implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public eraId: string;

    public eraPayout: bigint;

    public claimed: boolean;

    public claimedAtBlock: bigint;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save ValidatorPayout entity without an ID");
        await store.set('ValidatorPayout', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove ValidatorPayout entity without an ID");
        await store.remove('ValidatorPayout', id.toString());
    }

    static async get(id:string): Promise<ValidatorPayout | undefined>{
        assert((id !== null && id !== undefined), "Cannot get ValidatorPayout entity without an ID");
        const record = await store.get('ValidatorPayout', id.toString());
        if (record){
            return ValidatorPayout.create(record);
        }else{
            return;
        }
    }



    static create(record){
        let entity = new ValidatorPayout(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
