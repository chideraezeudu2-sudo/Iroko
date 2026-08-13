import { withAuth } from './_helpers.js';
import { runExtraction } from '../server/lib.js';

export default withAuth((user, body) => runExtraction(user, body));
