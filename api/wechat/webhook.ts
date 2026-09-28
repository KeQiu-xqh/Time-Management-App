import { webhookResponse } from '../../server/wechatHandlers.js';
import { requiredEnv, runtime, unavailable } from '../../server/wechatRuntime.js';
const handle = async (request: Request) => { try { return await webhookResponse(request, runtime(), { token: requiredEnv('WECHAT_TOKEN'), userSecret: requiredEnv('APP_USER_HMAC_SECRET') }); } catch (error) { return unavailable(error); } };
export const GET = handle;
export const POST = handle;
