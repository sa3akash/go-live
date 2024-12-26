
import mongoose from 'mongoose';
import { config } from './config';


export const connectDb = async () => {
    try{
    const db = await mongoose.connect(config.database);
    console.log('database connected =', db.connection.host, db.connection.port);
    }catch(err){
        console.log(err)
    }
}