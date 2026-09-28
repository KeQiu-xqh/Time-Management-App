import { meResponse } from '../../../server/wechatHandlers.js';
import { requiredEnv, unavailable } from '../../../server/wechatRuntime.js';
export async function GET(request: Request) { try { return await meResponse(request, requiredEnv('SESSION_COOKIE_SECRET')); } catch (error) { return unavailable(error); } }
