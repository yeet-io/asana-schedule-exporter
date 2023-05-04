import PDFDocument from 'pdfkit-table';
import moment from 'moment-timezone';
import asanaClient from '../asanaClient';
import express, { Response} from 'express';
import asana from 'asana';

const router = express.Router();

async function fetchAllTasksByProject(client: asana.Client, projectId: string) {
  let allTasks: asana.resources.Tasks.Type[] = [];
  let currentPage : asana.resources.ResourceList<asana.resources.Tasks.Type> | null = 
    await client.tasks.findByProject(projectId, {
      opt_fields: 'gid,name,start_at,due_at,tags.gid,tags.name',
    });

  while(currentPage) {
    allTasks = allTasks.concat(
      currentPage.data.filter(task => 
        task.tags.some(tag => 
          tag.name === process.env.ASANA_TIMELINE_TAG
        )
      )
    );
    currentPage = await currentPage.nextPage();
  }

  return allTasks;
}

function generatePDF(tasks:asana.resources.Tasks.Type[], project: asana.resources.Projects.Type, res: Response) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${project.name}-${moment().format('YYYYMMDDHHmmss')}.pdf`
  );

  const doc = new PDFDocument({
    size: "LETTER",
    margin: 20,
    layout: 'landscape'
  })
  doc.pipe(res);

  const timezone = process.env.TZ || "UTC";

  const rows = tasks.map((task) => {
    const startDate = task.start_at
      ? moment(task.start_at).tz(timezone).format('MM/DD/YYYY hh:mm A')
      : '-';
    const endDate = task.due_at
      ? moment(task.due_at).tz(timezone).format('MM/DD/YYYY hh:mm A')
      : '-';

    return [task.name, startDate, endDate, task.notes || '-'];
  });

  doc.table({
    title: `Schedule for ${project.name}`,
    headers: ['Name', 'Start Date', 'End Date', 'Notes'],
    rows,
  });

  doc.end();
}

router.get('/', async (req, res) => {
  const code = req.query.code as string;
  const projectId = req.query.state as string;
  const client = asanaClient();

  if(!code) {
    res.status(400).send('Authorization code is missing.');
    return;
  }

  // Set the access token to the Asana client
  try {
    const token = await client.app.accessTokenFromCode(code);
    client.useOauth({ credentials: token.access_token });
  } catch (error) {
    res.status(500).send('Error during Asana OAuth authentication.');
    return;
  }

  // Fetch project information
  const project = await client.projects.findById(projectId);

  // Fetch tasks
  const tasks = await fetchAllTasksByProject(client, projectId);

  generatePDF(tasks, project, res);
});

export default router;