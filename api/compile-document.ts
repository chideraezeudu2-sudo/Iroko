import { withAuth } from './_helpers.js';
import { runCompileDocument } from '../server/lib.js';

export default withAuth((user, body) => runCompileDocument(user, body));
