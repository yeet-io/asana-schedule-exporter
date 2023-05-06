import PDFDocument from 'pdfkit-table';
import moment from 'moment-timezone';
import asanaClient from '../asanaClient';
import express, { Response} from 'express';
import asana from 'asana';

const router = express.Router();

async function fetchAllTasksByProject(client: asana.Client, projectId: string) {
  let allTasks: asana.resources.Tasks.Type[] = [];
  let currentPage: asana.resources.ResourceList<asana.resources.Tasks.Type> | null = 
    await client.tasks.findByProject(projectId, {
      opt_fields: 'gid,tags.gid,tags.name',
    });

  const tasksWithTagsIds: string[] = [];

  while (currentPage) {
    tasksWithTagsIds.push(
      ...currentPage.data
        .filter(task =>
          task.tags.some(tag => tag.name === process.env.ASANA_TIMELINE_TAG)
        )
        .map(task => task.gid)
    );

    currentPage = await currentPage.nextPage();
  }

  for (const taskId of tasksWithTagsIds) {
    let subtasksPage: asana.resources.ResourceList<asana.resources.Tasks.Type> | null = 
      await client.tasks.subtasks(taskId, {
        opt_fields: 'name,notes,start_at,start_on,due_at,due_on',
      });

    while (subtasksPage) {
      allTasks = allTasks.concat(
        subtasksPage.data.filter(subtask => subtask.start_at || subtask.start_on || subtask.due_at || subtask.due_on)
      );
      subtasksPage = await subtasksPage.nextPage();
    }
  }

  return allTasks;
}

function formatTaskRow(task: asana.resources.Tasks.Type, timezone: string) : string[] {
  const startAt = task.start_at
    ? moment(task.start_at).tz(timezone)
    : task.start_on
    ? moment(task.start_on)
    : null;

  const dueAt = task.due_at
    ? moment(task.due_at).tz(timezone)
    : task.due_on
    ? moment(task.due_on)
    : null;

  const dateFormat = 'ddd, MMMM Do';
  const timeFormat = 'h:mm a';
  const sameDate = startAt && dueAt && startAt.isSame(dueAt, 'day');
  const startTimeString = task.start_at && startAt ? startAt.format(timeFormat) : '';
  const endTimeString = task.due_at && dueAt ? dueAt.format(timeFormat) : '';

  let dateRange = '-';
  if (startAt || dueAt) {
    if (sameDate) {
      dateRange = `${startAt!.format(dateFormat)} ${startTimeString}${endTimeString ? ` - ${endTimeString}` : ''}`;
    } else {
      const startDateString = startAt ? `${startAt.format(dateFormat)}${startTimeString ? ` ${startTimeString}` : ''}` : '';
      const endDateString = dueAt ? `${dueAt.format(dateFormat)}${endTimeString ? ` ${endTimeString}` : ''}` : '';
      dateRange = `${startDateString} - ${endDateString}`;
    }
  }

  return [task.name, dateRange, task.notes || '-'];
}

function generatePDF(tasks:asana.resources.Tasks.Type[], project: asana.resources.Projects.Type, res: Response) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=pre-market timeline ${project.name}.pdf`
  );

  const doc = new PDFDocument({
    size: "LETTER",
    margin: 40,
  })
  doc.pipe(res);

  const timezone = process.env.TZ || "UTC";

  const rows = tasks.map(task => formatTaskRow(task, timezone));
  const headerOptions = {
    headerColor: '#FFFFFF',
    headerOpacity: 1,
    headerAlign: 'left',
  };

  doc.table({
    headers: [{
      ...headerOptions,
      label: 'EVENT',
    }, {
      ...headerOptions,
      label: 'TIME',
    }, {
      ...headerOptions,
      label: 'NOTES',
    }],
    rows,
  },
  {
    title: {
      label: `Pre-Market Timeline`,
      fontFamily: 'Helvetica-Bold',
      color: '#1F1F1F',
      fontSize: 16,
    },
    subtitle: {
      label: project.name,
      fontFamily: 'Helvetica',
      fontSize: 14,
      color: '#000000',
    },
    padding: [10, 0, 10, 0],
    columnSpacing: 8,
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
    console.log(error);
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