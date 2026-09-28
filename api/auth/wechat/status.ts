import { pollSessionResponse } from '../../../server/wechatHandlers';
import { requiredEnv, runtime, unavailable } from '../../../server/wechatRuntime';
export async function GET(request: Request) { try { return await pollSessionResponse(request, runtime(), requiredEnv('SESSION_COOKIE_SECRET')); } catch (error) { return unavailable(error); } }
