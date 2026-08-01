'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMemberToMyCircle, addMyRelationship, ApiError, createMyCircle, fetchMyCircles,
  fetchMyRelationships, logout, NetworkCircle, NetworkPerson, NetworkRelationship,
  removeMemberFromMyCircle, removeMyRelationship, searchNetworkPeople } from '../lib/api';

const relationshipTypes = ['Friend', 'Spouse', 'Parent', 'Child', 'Sibling', 'Colleague', 'Relative', 'Other'];

export default function UserNetworkDashboard({ username }: { username: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NetworkPerson[]>([]);
  const [relationships, setRelationships] = useState<NetworkRelationship[]>([]);
  const [circles, setCircles] = useState<NetworkCircle[]>([]);
  const [relationshipType, setRelationshipType] = useState<Record<number, string>>({});
  const [circleChoice, setCircleChoice] = useState<Record<number, string>>({});
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [mobileToAdd, setMobileToAdd] = useState('');
  const [fullNameToAdd, setFullNameToAdd] = useState('');
  const [emailToAdd, setEmailToAdd] = useState('');
  const [directRelationshipType, setDirectRelationshipType] = useState('Friend');
  const [inviteMobile, setInviteMobile] = useState('');
  const [communication, setCommunication] = useState<{ name: string; mobile: string; email: string; relationship: string; existing: boolean } | null>(null);
  const [message, setMessage] = useState('Search by name, surname, mobile number, username, or location.');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [relationshipData, circleData] = await Promise.all([fetchMyRelationships(), fetchMyCircles()]);
    setRelationships(relationshipData);
    setCircles(circleData);
  }, []);

  useEffect(() => { refresh().catch(() => setMessage('Could not load your network.')); }, [refresh]);

  const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await searchNetworkPeople(query);
      setResults(data);
      setMessage(data.length ? `${data.length} people found.` : 'No existing user found. Ask them to create an account with their unique mobile number.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const connect = async (person: NetworkPerson) => {
    setBusy(true);
    try {
      await addMyRelationship(person.id, relationshipType[person.id] || 'Friend');
      await refresh();
      setMessage(`${person.displayName} already exists, so only the relationship was added.`);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const addToCircle = async (person: NetworkPerson) => {
    const circleId = Number(circleChoice[person.id]);
    if (!circleId) { setMessage('Choose a circle first.'); return; }
    setBusy(true);
    try {
      await addMemberToMyCircle(circleId, person.id);
      await refresh();
      setMessage(`${person.displayName} was added to the circle.`);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const createCircle = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await createMyCircle(circleName, circleDescription);
      setCircleName(''); setCircleDescription('');
      await refresh();
      setMessage('Circle created. You can now add your relationships to it.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const addByMobile = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setInviteMobile('');
    setCommunication(null);
    try {
      const normalized = mobileToAdd.replace(/[\s()-]/g, '');
      const matches = await searchNetworkPeople(normalized);
      const existing = matches.find(person => person.phoneNumber.replace(/[\s()-]/g, '') === normalized);
      if (!existing) {
        setInviteMobile(normalized);
        setCommunication({ name: fullNameToAdd.trim(), mobile: normalized, email: emailToAdd.trim(), relationship: directRelationshipType, existing: false });
        setMessage('No CircleNet account uses this mobile number yet. Invite this person to register; their mobile number will remain unique.');
        return;
      }
      await addMyRelationship(existing.id, directRelationshipType);
      await refresh();
      setCommunication({ name: fullNameToAdd.trim() || existing.displayName, mobile: existing.phoneNumber, email: emailToAdd.trim(), relationship: directRelationshipType, existing: true });
      setMobileToAdd('');
      setFullNameToAdd('');
      setEmailToAdd('');
      setMessage(`${existing.displayName} already exists. Only the ${directRelationshipType.toLowerCase()} relationship was added—no duplicate user was created.`);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const copyInvitation = async () => {
    const invitation = communicationMessage(communication);
    await navigator.clipboard.writeText(invitation);
    setMessage('Invitation copied. Send it to your contact so they can create their account.');
  };

  const communicationMessage = (target: typeof communication) => {
    if (!target) return '';
    const action = target.existing ? `added you as their ${target.relationship}` : `invited you as their ${target.relationship}`;
    return `Hello ${target.name}, ${username} ${action} on CircleNet-AI. Please log in to the application and create your own circles: ${window.location.origin}/auth`;
  };

  return <main className="container user-network-dashboard">
    <header className="network-header">
      <div><p className="eyebrow">MY CIRCLENET</p><h1>Welcome, {username}</h1><p>Find people you know, define the relationship, and organize them into circles.</p></div>
      <div className="network-actions"><Link href="/session" className="btn btn-secondary">Session</Link><button className="btn btn-secondary" onClick={async () => { await logout(); router.replace('/auth'); }}>Sign out</button></div>
    </header>

    <p className="network-message" role="status">{message}</p>

    <section className="card quick-add-card">
      <div><p className="eyebrow">ADD TO MY NETWORK</p><h2>Add a friend, relative, or family member</h2><p>Full name, mobile number, and relationship are required. Email is optional. Mobile is checked first to prevent duplicate users.</p></div>
      <form onSubmit={addByMobile} className="quick-add-form">
        <input type="text" required value={fullNameToAdd} onChange={e => setFullNameToAdd(e.target.value)} placeholder="Full name" />
        <input type="tel" required value={mobileToAdd} onChange={e => setMobileToAdd(e.target.value)} placeholder="Mobile number, e.g. +919876543210" />
        <input type="email" value={emailToAdd} onChange={e => setEmailToAdd(e.target.value)} placeholder="Email (optional)" />
        <select value={directRelationshipType} onChange={e => setDirectRelationshipType(e.target.value)}>{relationshipTypes.map(type => <option key={type}>{type}</option>)}</select>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Add person'}</button>
      </form>
      {communication && <div className="invite-callout"><span>{communication.existing ? `${communication.name} was added. Send them a notification:` : `No user found for ${inviteMobile}. Send a registration invitation:`}</span><div className="communication-actions"><a className="btn btn-secondary" href={`sms:${communication.mobile}?body=${encodeURIComponent(communicationMessage(communication))}`}>Send SMS</a>{communication.email && <a className="btn btn-secondary" href={`mailto:${communication.email}?subject=${encodeURIComponent('CircleNet-AI relationship notification')}&body=${encodeURIComponent(communicationMessage(communication))}`}>Send email</a>}<button type="button" className="btn btn-secondary" onClick={copyInvitation}>Copy message</button></div></div>}
    </section>

    <section className="network-layout">
      <article className="card network-search-card">
        <p className="eyebrow">PEOPLE DISCOVERY</p><h2>Find someone</h2>
        <form className="network-search" onSubmit={search}>
          <input required value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, surname, mobile, username, location…" />
          <button className="btn btn-primary" disabled={busy}>Search</button>
        </form>
        <div className="search-results">
          {results.map(person => {
            const relationship = relationships.find(item => item.person.id === person.id);
            return <div className="people-result" key={person.id}>
              <span className="person-avatar">{person.displayName.charAt(0).toUpperCase()}</span>
              <div className="people-identity"><strong>{person.displayName}</strong><span>@{person.username} · {person.phoneNumber}</span><small>{person.location || 'Location not provided'}</small></div>
              {!relationship ? <div className="people-controls">
                <select value={relationshipType[person.id] || 'Friend'} onChange={e => setRelationshipType({...relationshipType, [person.id]: e.target.value})}>{relationshipTypes.map(type => <option key={type}>{type}</option>)}</select>
                <button className="btn btn-primary" disabled={busy} onClick={() => connect(person)}>Add relationship</button>
              </div> : <div className="people-controls"><span className="relationship-badge">{relationship.type}</span><select value={circleChoice[person.id] || ''} onChange={e => setCircleChoice({...circleChoice, [person.id]: e.target.value})}><option value="">Choose circle</option>{circles.map(circle => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select><button className="btn btn-secondary" disabled={busy || !circles.length} onClick={() => addToCircle(person)}>Add to circle</button></div>}
            </div>;
          })}
        </div>
      </article>

      <aside className="card create-circle-card"><p className="eyebrow">ORGANIZE</p><h2>Create a circle</h2><form onSubmit={createCircle}><input required value={circleName} onChange={e => setCircleName(e.target.value)} placeholder="Family, Close friends…" /><textarea value={circleDescription} onChange={e => setCircleDescription(e.target.value)} placeholder="Optional description" /><button className="btn btn-primary" disabled={busy}>Create circle</button></form></aside>
    </section>

    <section className="network-section"><div className="section-heading"><div><p className="eyebrow">CONNECTIONS</p><h2>My relationships</h2></div><span>{relationships.length}</span></div><div className="relationship-grid">{relationships.map(item => <article className="relationship-card" key={item.id}><span className="person-avatar">{item.person.displayName.charAt(0)}</span><div><strong>{item.person.displayName}</strong><p>{item.person.phoneNumber}</p><span className="relationship-badge">{item.type}</span></div><button className="text-button danger" onClick={async () => { await removeMyRelationship(item.id); await refresh(); }}>Remove</button></article>)}</div>{!relationships.length && <p className="empty-state">Search for someone above to start your network.</p>}</section>

    <section className="network-section"><div className="section-heading"><div><p className="eyebrow">MY GROUPS</p><h2>My circles</h2></div><span>{circles.length}</span></div><div className="circle-grid">{circles.map(circle => <article className="circle-card" key={circle.id}><h3>{circle.name}</h3><p>{circle.description || 'Your private circle'}</p><div className="circle-members">{circle.members.map(member => <div key={member.id}><span>{member.displayName}</span><button className="text-button danger" onClick={async () => { await removeMemberFromMyCircle(circle.id, member.id); await refresh(); }}>Remove</button></div>)}</div>{!circle.members.length && <small>No members yet. Add one from search results.</small>}</article>)}</div></section>
  </main>;
}
