import express from 'express';
import asanaClient from '../asanaClient';
import { URL } from 'url';

const router = express.Router();

router.get('/', async (req, res) => {
  const projectId = req.query.projectId as string;
  const client = asanaClient();

  const url = client.app.asanaAuthorizeUrl();

  // need to add state params. asana client sucks.
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.append('state', projectId);

  res.redirect(parsedUrl.toString());
});

export default router
