const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('getAll()', () => {
    test('returns empty array when store is empty', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns created tasks', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(2);
      expect(tasks).toContainEqual(task1);
      expect(tasks).toContainEqual(task2);
    });
  });

  describe('findById()', () => {
    test('returns existing task', () => {
      const created = taskService.create({ title: 'Task' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('returns undefined for nonexistent ID', () => {
      expect(taskService.findById('invalid-id')).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    test('returns matching status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      const t2 = taskService.create({ title: 'T2', status: 'done' });
      const result = taskService.getByStatus('done');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(t2.id);
    });

    test('returns empty array if no matches', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });

    test.failing('KNOWN DEFECT (See BUG_REPORT.md): specifically test whether filtering is exact or incorrectly matches partial strings', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });
      const result = taskService.getByStatus('do');
      // If it incorrectly matches partial strings, length will be > 0.
      // We expect exact match here, so it should be 0.
      expect(result).toHaveLength(0);
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('returns first page', () => {
      const result = taskService.getPaginated(1, 10);
      expect(result).toHaveLength(10);
      expect(result[0].title).toBe('Task 1');
    });

    test('returns second page', () => {
      const result = taskService.getPaginated(2, 10);
      expect(result).toHaveLength(10);
      expect(result[0].title).toBe('Task 11');
    });

    test('page size smaller than total', () => {
      const result = taskService.getPaginated(1, 5);
      expect(result).toHaveLength(5);
    });

    test('page beyond available data', () => {
      const result = taskService.getPaginated(4, 10);
      expect(result).toEqual([]);
    });

    test('boundary values (page 0)', () => {
      const result = taskService.getPaginated(0, 10);
      expect(result).toHaveLength(10);
      expect(result[0].title).toBe('Task 1');
    });
  });

  describe('getStats()', () => {
    test('counts for todo/in_progress/done', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });
      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    test('overdue incomplete task', () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();
      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    test('completed task with an old dueDate should not count as overdue', () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();
      taskService.create({ title: 'T1', status: 'done', dueDate: pastDate });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });

    test('task without dueDate', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });
  });

  describe('create()', () => {
    test('generates an ID', () => {
      const task = taskService.create({ title: 'Task' });
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
    });

    test('default status', () => {
      const task = taskService.create({ title: 'Task' });
      expect(task.status).toBe('todo');
    });

    test('default priority', () => {
      const task = taskService.create({ title: 'Task' });
      expect(task.priority).toBe('medium');
    });

    test('createdAt is set', () => {
      const task = taskService.create({ title: 'Task' });
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).getTime()).not.toBeNaN();
    });

    test('supplied fields are preserved', () => {
      const dueDate = new Date().toISOString();
      const task = taskService.create({
        title: 'My Task',
        description: 'Desc',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
      expect(task.title).toBe('My Task');
      expect(task.description).toBe('Desc');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });
  });

  describe('update()', () => {
    test('update an existing task', () => {
      const task = taskService.create({ title: 'Old Title' });
      const updated = taskService.update(task.id, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
      expect(taskService.findById(task.id).title).toBe('New Title');
    });

    test('nonexistent task returns null', () => {
      expect(taskService.update('invalid-id', { title: 'New Title' })).toBeNull();
    });

    test.failing('KNOWN DEFECT (See BUG_REPORT.md): test whether fields such as id/createdAt can be overwritten', () => {
      const task = taskService.create({ title: 'Title' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      taskService.update(task.id, { id: 'hacked-id', createdAt: 'hacked-date' });
      
      const found = taskService.findById(originalId);
      // We expect these NOT to be overwritten in a well-designed system.
      // If it fails, that's what the test is supposed to catch.
      expect(found).toBeDefined();
      expect(found.id).toBe(originalId);
      expect(found.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('remove()', () => {
    test('existing task is removed', () => {
      const task = taskService.create({ title: 'Task' });
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('nonexistent task returns false', () => {
      const result = taskService.remove('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask()', () => {
    test('existing task becomes done', () => {
      const task = taskService.create({ title: 'Task', status: 'todo' });
      const updated = taskService.completeTask(task.id);
      expect(updated.status).toBe('done');
      expect(taskService.findById(task.id).status).toBe('done');
    });

    test('completedAt is set', () => {
      const task = taskService.create({ title: 'Task', status: 'todo' });
      const updated = taskService.completeTask(task.id);
      expect(updated.completedAt).toBeDefined();
      expect(updated.completedAt).not.toBeNull();
      expect(new Date(updated.completedAt).getTime()).not.toBeNaN();
    });

    test('nonexistent task returns null', () => {
      const result = taskService.completeTask('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask()', () => {
    test('assigns task to a user', () => {
      const task = taskService.create({ title: 'Task' });
      const updated = taskService.assignTask(task.id, 'John Doe');
      expect(updated.assignee).toBe('John Doe');
      expect(taskService.findById(task.id).assignee).toBe('John Doe');
    });

    test('trims surrounding whitespace from assignee', () => {
      const task = taskService.create({ title: 'Task' });
      const updated = taskService.assignTask(task.id, '  John Doe  ');
      expect(updated.assignee).toBe('John Doe');
    });

    test('nonexistent task returns null', () => {
      const result = taskService.assignTask('invalid-id', 'John');
      expect(result).toBeNull();
    });
  });
});
