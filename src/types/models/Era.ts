// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';


export class Era implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public startBlock: bigint;

    public endBlock?: bigint;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Era entity without an ID");
        await store.set('Era', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Era entity without an ID");
        await store.remove('Era', id.toString());
    }

    static async get(id:string): Promise<Era | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Era entity without an ID");
        const record = await store.get('Era', id.toString());
        if (record){
            return Era.create(record);
        }else{
            return;
        }
    }



    static create(record){
        let entity = new Era(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
