import { describe, expect, it } from 'vitest';
import {
  addResource,
  addTask,
  createProject,
  deleteProject,
  demote,
  promote,
  renameTask,
  setProjectDescription,
  setTaskNotes,
  updateResource,
} from '../src/core/ops';
import { T0, T1, T2, backlogItem, getTask, project, root, subtask, task } from './fixtures';

describe('projects', () => {
  it('creates and describes a project; an empty description is removed', () => {
    let r = createProject(root(), 'p', '  Aegis  ', T0);
    expect(r.projects[0]).toMatchObject({ id: 'p', name: 'Aegis', archived: false });
    r = setProjectDescription(r, 'p', 'Security work', T1);
    expect(r.projects[0]!.description).toBe('Security work');
    r = setProjectDescription(r, 'p', '   ', T2);
    expect('description' in r.projects[0]!).toBe(false);
    expect(r.projects[0]!.updatedAt).toBe(T2);
  });

  it('deleting a project clears backlog suggestions pointing at it', () => {
    const r = deleteProject(
      root({ projects: [project('p')], backlog: [backlogItem('b', { suggestedProjectId: 'p' })] }),
      'p',
    );
    expect(r.projects).toEqual([]);
    expect('suggestedProjectId' in r.backlog[0]!).toBe(false);
  });
});

describe('tasks', () => {
  it('editing a task bumps both the task and the project updatedAt', () => {
    let r = root({ projects: [project('p', { tasks: [task('t')] })] });
    r = renameTask(r, 'p', 't', 'Renamed', T2);
    expect(getTask(r, 'p', 't')).toMatchObject({ title: 'Renamed', updatedAt: T2 });
    expect(r.projects[0]!.updatedAt).toBe(T2);
  });

  it('ignores a blank rename', () => {
    const r = root({ projects: [project('p', { tasks: [task('t')] })] });
    expect(renameTask(r, 'p', 't', '  ', T2)).toBe(r);
  });

  it('adds tasks at the end', () => {
    let r = root({ projects: [project('p', { tasks: [task('a')] })] });
    r = addTask(r, 'p', 'b', 'Second', T1);
    expect(r.projects[0]!.tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('resources', () => {
  it('adds project-level and task-level resources', () => {
    let r = root({ projects: [project('p', { tasks: [task('t')] })] });
    r = addResource(r, { projectId: 'p' }, 'r1', { header: 'Spec', url: 'https://example.com/spec' }, T1);
    r = addResource(r, { projectId: 'p', taskId: 't' }, 'r2', { header: 'Notes', url: 'https://example.com/n', note: 'draft' }, T1);
    expect(r.projects[0]!.resources).toEqual([{ id: 'r1', header: 'Spec', url: 'https://example.com/spec', addedAt: T1 }]);
    expect(getTask(r, 'p', 't').resources[0]).toMatchObject({ id: 'r2', note: 'draft' });
  });

  it('updating keeps id and addedAt, and can drop the note', () => {
    let r = root({ projects: [project('p')] });
    r = addResource(r, { projectId: 'p' }, 'r1', { header: 'A', url: 'https://a.example', note: 'x' }, T0);
    r = updateResource(r, { projectId: 'p' }, 'r1', { header: 'B', url: 'https://b.example', note: '' }, T2);
    expect(r.projects[0]!.resources[0]).toEqual({ id: 'r1', header: 'B', url: 'https://b.example', addedAt: T0 });
  });
});

describe('backlog', () => {
  it('promote moves the item into the project as an open task and keeps its notes', () => {
    const r = promote(
      root({ projects: [project('p')], backlog: [backlogItem('b', { notes: 'why it matters' }), backlogItem('c')] }),
      'b',
      'p',
      T1,
    );
    expect(r.backlog.map((b) => b.id)).toEqual(['c']);
    expect(getTask(r, 'p', 'b')).toMatchObject({ title: 'Idea b', notes: 'why it matters', done: false, updatedAt: T1 });
  });

  it('promote to a missing project changes nothing', () => {
    const r = root({ backlog: [backlogItem('b')] });
    expect(promote(r, 'b', 'nope', T1)).toBe(r);
  });

  it('demote drops sub-tasks and resources, keeps notes, and remembers the project', () => {
    let r = root({
      projects: [
        project('p', {
          tasks: [task('t', { notes: 'n', subtasks: [subtask('s')], resources: [{ id: 'r', header: 'h', url: 'https://x.example', addedAt: T0 }] })],
        }),
      ],
    });
    r = demote(r, 'p', 't', T2);
    expect(r.projects[0]!.tasks).toEqual([]);
    expect(r.backlog).toEqual([
      { id: 't', title: 'Task t', notes: 'n', suggestedProjectId: 'p', createdAt: T2, updatedAt: T2 },
    ]);
  });

  it('notes can be cleared', () => {
    let r = root({ projects: [project('p', { tasks: [task('t', { notes: 'x' })] })] });
    r = setTaskNotes(r, 'p', 't', '', T1);
    expect('notes' in getTask(r, 'p', 't')).toBe(false);
  });
});
