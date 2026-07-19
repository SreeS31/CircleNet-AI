'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchCircles, fetchMilestones, fetchPeople, fetchPermissions, fetchProjects, fetchRelationships, fetchTasks, fetchUsers } from './lib/api';

export default function HomePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchPeople(), fetchCircles(), fetchRelationships(), fetchPermissions(), fetchProjects(), fetchTasks(), fetchMilestones()])
      .then(([usersData, peopleData, circlesData, relationshipsData, permissionsData, projectsData, tasksData, milestonesData]) => {
        setUsers(usersData);
        setPeople(peopleData);
        setCircles(circlesData);
        setRelationships(relationshipsData);
        setPermissions(permissionsData);
        setProjects(projectsData);
        setTasks(tasksData);
        setMilestones(milestonesData);
      })
      .catch(() => {
        setUsers([]);
        setPeople([]);
        setCircles([]);
        setRelationships([]);
        setPermissions([]);
        setProjects([]);
        setTasks([]);
        setMilestones([]);
      });
  }, []);

  return (
    <main className="container">
      <nav className="nav">
        <div style={{ fontWeight: 800 }}>CircleNet-AI</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/auth">Sign In</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="grid" style={{ gridTemplateColumns: '1.3fr 0.9fr' }}>
          <div className="card">
            <p style={{ color: '#2563eb', fontWeight: 700, marginBottom: 8 }}>Live API Connected</p>
            <h1 style={{ fontSize: '2.4rem', marginTop: 0 }}>Build the future of collaborative intelligence.</h1>
            <p style={{ color: '#64748b', lineHeight: 1.7 }}>
              The landing experience now pulls categories from the Spring Boot backend, including users, people,
              circles, relationships, and permissions.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <Link href="/auth" className="btn btn-primary">Get Started</Link>
              <Link href="/dashboard" className="btn btn-secondary">View Dashboard</Link>
            </div>
          </div>

          <div className="card">
            <h3>Connected data</h3>
            <ul>
              <li>{users.length} users</li>
              <li>{people.length} people</li>
              <li>{circles.length} circles</li>
              <li>{tasks.length} tasks</li>
              <li>{milestones.length} milestones</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <h3>Users</h3>
          <ul>{users.slice(0, 3).map((user) => <li key={user.id || user.username}>{user.username || user.email}</li>)}</ul>
        </div>
        <div className="card">
          <h3>People</h3>
          <ul>{people.slice(0, 3).map((person) => <li key={person.id || person.fullName}>{person.fullName || person.email}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Circles</h3>
          <ul>{circles.slice(0, 3).map((circle) => <li key={circle.id || circle.name}>{circle.name}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Relationships & Permissions</h3>
          <ul>
            <li>{relationships.length} relationships</li>
            <li>{permissions.length} permissions</li>
          </ul>
        </div>
        <div className="card">
          <h3>Projects</h3>
          <ul>{projects.slice(0, 3).map((project) => <li key={project.id || project.name}>{project.name} • {project.status}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Tasks</h3>
          <ul>{tasks.slice(0, 3).map((task) => <li key={task.id || task.title}>{task.title} • {task.status}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Milestones</h3>
          <ul>{milestones.slice(0, 3).map((milestone) => <li key={milestone.id || milestone.name}>{milestone.name} • {milestone.status}</li>)}</ul>
        </div>
      </section>
    </main>
  );
}
