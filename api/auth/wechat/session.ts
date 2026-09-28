import { createSessionResponse } from '../../../server/wechatHandlers';
import { runtime, unavailable } from '../../../server/wechatRuntime';
export async function POST() { try { return await createSessionResponse(runtime()); } catch (error) { return unavailable(error); } }
