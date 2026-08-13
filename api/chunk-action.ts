import { withAuth } from './_helpers.js';
import { runChunkAction } from '../server/lib.js';

export default withAuth((user, body) => runChunkAction(user, body));
