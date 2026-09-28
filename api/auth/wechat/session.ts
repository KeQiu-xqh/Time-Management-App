import { createSessionResponse } from '../../../server/wechatHandlers.js';
import { runtime, unavailable } from '../../../server/wechatRuntime.js';
export async function POST() { try { return await createSessionResponse(runtime()); } catch (error) { return unavailable(error); } }
