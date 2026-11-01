import 'dotenv/config'
import { app } from './app.js'

const start = async () =>{
    try{
        await app.listen({port: Number(process.env.PORT) || 3333})
    }catch(err){
        app.log.error(err)
        process.exit(1)
    }
}

start();
