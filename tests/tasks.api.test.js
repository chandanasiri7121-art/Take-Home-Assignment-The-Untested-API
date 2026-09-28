const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns 200 and an array', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('returns empty array when store is empty', async () => {
      const res = await request(app).get('/tasks');
      expect(res.body).toEqual([]);
    });

    test('returns created tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });
      const res = await request(app).get('/tasks');
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /tasks?status=todo', () => {
    test('returns only matching tasks', async () => {
      await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'T2', status: 'done' });
      const res = await request(app).get('/tasks?status=done');
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('done');
    });

    test.failing('KNOWN DEFECT (See BUG_REPORT.md): exact match behavior rather than partial match', async () => {
      await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'T2', status: 'done' });
      const res = await request(app).get('/tasks?status=do');
      // Should not incorrectly return "todo" or "done"
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /tasks?page=1&limit=10', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('verify first page contains the first 10 tasks', async () => {
      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 1');
    });

    test('verify second page behavior', async () => {
      const res = await request(app).get('/tasks?page=2&limit=10');
      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 11');
    });

    test('test boundary/invalid pagination values (page 0)', async () => {
      const res = await request(app).get('/tasks?page=0&limit=10');
      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 1');
    });
  });

  describe('GET /tasks/stats', () => {
    test('verify status counts', async () => {
      await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'T2', status: 'done' });
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.done).toBe(1);
    });

    test('verify overdue count', async () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();
      await request(app).post('/tasks').send({ title: 'T1', status: 'todo', dueDate: pastDate });
      const res = await request(app).get('/tasks/stats');
      expect(res.body.overdue).toBe(1);
    });
  });

  describe('POST /tasks', () => {
    test('valid task -> 201', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Valid' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Valid');
    });

    test('missing title -> 400', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.status).toBe(400);
    });

    test('invalid status -> 400', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T1', status: 'invalid' });
      expect(res.status).toBe(400);
    });

    test('invalid priority -> 400', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T1', priority: 'invalid' });
      expect(res.status).toBe(400);
    });

    test('invalid dueDate -> 400', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T1', dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('valid update -> 200', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Old' });
      const res = await request(app).put(`/tasks/${createRes.body.id}`).send({ title: 'New' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New');
    });

    test('nonexistent ID -> 404', async () => {
      const res = await request(app).put('/tasks/invalid-id').send({ title: 'New' });
      expect(res.status).toBe(404);
    });

    test('invalid update data -> 400', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Old' });
      const res = await request(app).put(`/tasks/${createRes.body.id}`).send({ status: 'invalid' });
      expect(res.status).toBe(400);
    });

    test.failing('KNOWN DEFECT (See BUG_REPORT.md): test whether protected fields such as id/createdAt can be overwritten', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Old' });
      const originalId = createRes.body.id;
      const originalCreatedAt = createRes.body.createdAt;

      await request(app).put(`/tasks/${originalId}`).send({
        id: 'hacked-id',
        createdAt: 'hacked-date'
      });

      const getRes = await request(app).get(`/tasks`);
      const updatedTask = getRes.body.find(t => t.id === originalId);
      
      expect(updatedTask).toBeDefined();
      expect(updatedTask.id).toBe(originalId);
      expect(updatedTask.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('existing task -> 204', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'To Delete' });
      const res = await request(app).delete(`/tasks/${createRes.body.id}`);
      expect(res.status).toBe(204);
      
      const getRes = await request(app).get('/tasks');
      expect(getRes.body).toHaveLength(0);
    });

    test('nonexistent task -> 404', async () => {
      const res = await request(app).delete('/tasks/invalid-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('existing task -> successful response', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/complete`);
      expect(res.status).toBe(200);
    });

    test('verify status becomes done', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/complete`);
      expect(res.body.status).toBe('done');
    });

    test('verify completedAt is set', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/complete`);
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.completedAt).not.toBeNull();
    });

    test('nonexistent ID -> 404', async () => {
      const res = await request(app).patch('/tasks/invalid-id/complete');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('valid assignment -> 200 and returned task contains assignee', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({ assignee: 'John Doe' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('John Doe');
    });

    test('nonexistent task -> 404', async () => {
      const res = await request(app).patch('/tasks/invalid-id/assign').send({ assignee: 'John Doe' });
      expect(res.status).toBe(404);
    });

    test('missing assignee -> 400', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({});
      expect(res.status).toBe(400);
    });

    test('non-string assignee -> 400', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({ assignee: 123 });
      expect(res.status).toBe(400);
    });

    test('empty string -> 400', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({ assignee: '' });
      expect(res.status).toBe(400);
    });

    test('whitespace-only string -> 400', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({ assignee: '   ' });
      expect(res.status).toBe(400);
    });

    test('reassignment of an already-assigned task -> 200 with the new assignee', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({ assignee: 'John Doe' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({ assignee: 'Jane Smith' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Smith');
    });
  });
});
