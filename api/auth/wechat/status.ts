import { pollSessionResponse } from '../../../server/wechatHandlers.js';
import { requiredEnv, runtime, unavailable } from '../../../server/wechatRuntime.js';
export async function GET(request: Request) { try { return await pollSessionResponse(request, runtime(), requiredEnv('SESSION_COOKIE_SECRET')); } catch (error) { return unavailable(error); } }
