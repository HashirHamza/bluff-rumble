import {createBlobRepository} from '../../lib/blob-repository.mjs';
import {createGameHandler} from '../../lib/function-service.mjs';

// Standard endpoint: /.netlify/functions/game. No custom route configuration.
export default async function game(request: Request): Promise<Response> {
  try {
    return await createGameHandler({repository:createBlobRepository()})(request);
  } catch {
    return Response.json({error:'Room storage is temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
