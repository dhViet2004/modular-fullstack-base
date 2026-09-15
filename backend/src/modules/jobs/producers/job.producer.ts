import { jobService } from "../job.service.js"; export const jobProducer={send:<T extends object>(name:string,data:T)=>jobService.send(name,data)};
