import type { RequestHandler } from "express";
import { success } from "../../core/http/api-response.js";
import { emailTemplateService } from "./email-template.service.js";

export const emailTemplateController: Record<string, RequestHandler> = {
  async list(_req,res,next){try{res.json(success(await emailTemplateService.list()))}catch(error){next(error)}},
  async update(req,res,next){try{res.json(success(await emailTemplateService.save(String(req.params.id),req.body.subject,req.body.html)))}catch(error){next(error)}}
};
