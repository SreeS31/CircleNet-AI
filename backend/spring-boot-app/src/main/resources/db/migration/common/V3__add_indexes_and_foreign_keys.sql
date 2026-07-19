CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_project
  FOREIGN KEY (project_id)
  REFERENCES projects(id)
  ON DELETE SET NULL;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_milestone
  FOREIGN KEY (milestone_id)
  REFERENCES milestones(id)
  ON DELETE SET NULL;

ALTER TABLE milestones
  ADD CONSTRAINT fk_milestones_project
  FOREIGN KEY (project_id)
  REFERENCES projects(id)
  ON DELETE SET NULL;
