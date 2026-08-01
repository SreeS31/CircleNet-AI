'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMemberToMyCircle, addMyRelationship, addPersonToMyNetwork, ApiError, createMyCircle, fetchMyCircles,
  fetchMyRelationships, fetchRelationshipTypes, fetchUserProfile, logout, NetworkCircle, NetworkPerson, NetworkRelationship,
  demoteCircleAdmin, promoteCircleAdmin, removeMemberFromMyCircle, removeMyRelationship, searchNetworkPeople } from '../lib/api';

const defaultRelationshipTypes = ['Friend', 'Spouse', 'Parent', 'Child', 'Sibling', 'Colleague', 'Relative', 'Other'];

function PersonAvatar({ name, photo, self = false }: { name: string; photo?: string | null; self?: boolean }) {
  return <span className={self ? 'self-avatar avatar-photo' : 'person-avatar avatar-photo'} style={photo ? { backgroundImage: `url(${photo})` } : undefined}>{photo ? '' : name.charAt(0).toUpperCase()}</span>;
}

export default function UserNetworkDashboard({ username }: { username: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NetworkPerson[]>([]);
  const [relationships, setRelationships] = useState<NetworkRelationship[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState(defaultRelationshipTypes);
  const [circles, setCircles] = useState<NetworkCircle[]>([]);
  const [selfPhoto, setSelfPhoto] = useState<string | null>(null);
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
  const [message, setMessage] = useState('Search by person name, surname, mobile number, or location.');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [relationshipData, circleData, typeData, profileData] = await Promise.all([fetchMyRelationships(), fetchMyCircles(), fetchRelationshipTypes(), fetchUserProfile()]);
    setRelationships(relationshipData);
    setCircles(circleData);
    setRelationshipTypes(typeData.length ? typeData : defaultRelationshipTypes);
    setSelfPhoto(profileData.profilePhoto as string | null);
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

  const addToCircle = async (person: NetworkPerson, selectedCircleId?: number) => {
    const circleId = selectedCircleId || Number(circleChoice[person.id]);
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
      const relationship = await addPersonToMyNetwork({ fullName: fullNameToAdd, phoneNumber: mobileToAdd, email: emailToAdd || undefined, type: directRelationshipType });
      const existing = relationship.person.accountStatus === 'ACTIVE';
      await refresh();
      setInviteMobile(existing ? '' : relationship.person.phoneNumber);
      setCommunication({ name: fullNameToAdd.trim() || relationship.person.displayName, mobile: relationship.person.phoneNumber, email: emailToAdd.trim(), relationship: directRelationshipType, existing });
      setMobileToAdd('');
      setFullNameToAdd('');
      setEmailToAdd('');
      setMessage(existing
        ? `${relationship.person.displayName} already exists. Only the ${directRelationshipType.toLowerCase()} relationship was added—no duplicate user was created.`
        : `${relationship.person.displayName} was added to My Relationships as an invited user. Send the registration invitation so they can claim the account.`);
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

  const spouseRelationships = relationships.filter(item => item.type.toLowerCase() === 'spouse');
  const otherRelationships = relationships.filter(item => item.type.toLowerCase() !== 'spouse');
  const ownedCircles = circles.filter(circle => circle.ownedByCurrentUser);
  const administeredCircles = circles.filter(circle => circle.currentUserAdmin);

  const relationshipNode = (item: NetworkRelationship, paired = false) => <article className={`relationship-node ${paired ? 'spouse-node' : ''}`} key={item.id}>
    <div className="relationship-node-main"><PersonAvatar name={item.person.displayName} photo={item.person.profilePhoto}/><div className="relationship-identity"><strong>{item.person.displayName}</strong><p>{item.person.phoneNumber}</p><div><span className="relationship-badge">{item.type}</span><span className={`status-tag ${item.person.accountStatus === 'INVITED' ? 'status-not-verified' : 'status-verified'}`}>{item.person.accountStatus === 'INVITED' ? 'Not Verified' : 'Verified'}</span></div></div><button className="action-tag action-tag-danger" onClick={async () => { await removeMyRelationship(item.id); await refresh(); }}>Remove</button></div>
    <details className="circle-picker"><summary className={`action-tag action-tag-admin ${!administeredCircles.length ? 'disabled' : ''}`}>Add to circle</summary><div className="circle-picker-menu">{administeredCircles.map(circle => <button type="button" key={circle.id} disabled={busy} onClick={event => { void addToCircle(item.person, circle.id); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{circle.name}</button>)}{!administeredCircles.length && <span>No circles you administer</span>}</div></details>
  </article>;

  return <main className="container user-network-dashboard">
    <header className="network-header">
      <div><p className="eyebrow">MY CIRCLENET</p><h1>Welcome, {username}</h1><p>Find people you know, define the relationship, and organize them into circles.</p></div>
      <div className="network-actions"><Link href="/profile" className="btn btn-secondary">My profile</Link><Link href="/session" className="btn btn-secondary">Session</Link><button className="btn btn-secondary" onClick={async () => { await logout(); router.replace('/auth'); }}>Sign out</button></div>
    </header>

    <p className="network-message" role="status">{message}</p>

    <section className="card quick-add-card">
      <div><p className="eyebrow">ADD TO MY NETWORK</p><h2>Add a friend, relative, or family member</h2><p>Full name, mobile number, and relationship are required. Email is optional. Mobile is checked first to prevent duplicate users.</p></div>
      <form onSubmit={addByMobile} className="quick-add-form">
        <input className="quick-add-name" type="text" required value={fullNameToAdd} onChange={e => setFullNameToAdd(e.target.value)} placeholder="Full name" />
        <input className="quick-add-mobile" type="tel" required value={mobileToAdd} onChange={e => setMobileToAdd(e.target.value)} placeholder="Mobile number, e.g. +919876543210" />
        <input className="quick-add-email" type="email" value={emailToAdd} onChange={e => setEmailToAdd(e.target.value)} placeholder="Email address (optional)" />
        <select className="quick-add-relationship" value={directRelationshipType} onChange={e => setDirectRelationshipType(e.target.value)}>{relationshipTypes.map(type => <option key={type}>{type}</option>)}</select>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Add person'}</button>
      </form>
      {communication && <div className="invite-callout"><span>{communication.existing ? `${communication.name} was added. Send them a notification:` : `No user found for ${inviteMobile}. Send a registration invitation:`}</span><div className="communication-actions"><a className="btn btn-secondary" href={`sms:${communication.mobile}?body=${encodeURIComponent(communicationMessage(communication))}`}>Send SMS</a>{communication.email && <a className="btn btn-secondary" href={`mailto:${communication.email}?subject=${encodeURIComponent('CircleNet-AI relationship notification')}&body=${encodeURIComponent(communicationMessage(communication))}`}>Send email</a>}<button type="button" className="btn btn-secondary" onClick={copyInvitation}>Copy message</button></div></div>}
    </section>

    <section className="network-layout">
      <article className="card network-search-card">
        <p className="eyebrow">PEOPLE DISCOVERY</p><h2>Find someone</h2>
        <form className="network-search" onSubmit={search}>
          <input required value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Person name, surname, mobile number, or location…" />
          <button className="btn btn-primary" disabled={busy}>Search</button>
        </form>
        <div className="search-results">
          {results.map(person => {
            const relationship = relationships.find(item => item.person.id === person.id);
            return <div className="people-result" key={person.id}>
              <PersonAvatar name={person.displayName} photo={person.profilePhoto}/>
              <div className="people-identity"><strong>{person.displayName}</strong><span>{person.phoneNumber}</span><small>{person.location || 'Location not provided'}</small><span className={`status-tag ${person.accountStatus === 'INVITED' ? 'status-not-verified' : 'status-verified'}`}>{person.accountStatus === 'INVITED' ? 'Not Verified' : 'Verified'}</span></div>
              {!relationship ? <div className="people-controls">
                <select value={relationshipType[person.id] || 'Friend'} onChange={e => setRelationshipType({...relationshipType, [person.id]: e.target.value})}>{relationshipTypes.map(type => <option key={type}>{type}</option>)}</select>
                <button className="btn btn-primary" disabled={busy} onClick={() => connect(person)}>Add relationship</button>
              </div> : <div className="people-controls"><span className="relationship-badge">{relationship.type}</span><select value={circleChoice[person.id] || ''} onChange={e => setCircleChoice({...circleChoice, [person.id]: e.target.value})}><option value="">Choose circle</option>{administeredCircles.map(circle => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select><button className="btn btn-secondary" disabled={busy || !administeredCircles.length} onClick={() => addToCircle(person)}>Add to circle</button></div>}
            </div>;
          })}
        </div>
      </article>

      <aside className="card create-circle-card"><p className="eyebrow">ORGANIZE</p><h2>Create a circle</h2><form onSubmit={createCircle}><input required value={circleName} onChange={e => setCircleName(e.target.value)} placeholder="Family, Close friends…" /><textarea value={circleDescription} onChange={e => setCircleDescription(e.target.value)} placeholder="Optional description" /><button className="btn btn-primary" disabled={busy}>Create circle</button></form></aside>
    </section>

    <section className="network-section relationship-tree-section"><div className="section-heading"><div><p className="eyebrow">MY RELATIONSHIP MAP</p><h2>My relationships</h2></div><span>{relationships.length}</span></div>{relationships.length ? <div className="relationship-tree"><div className={`partnership-row ${spouseRelationships.length ? 'has-spouse' : ''}`}><article className="self-node"><PersonAvatar name={username} photo={selfPhoto} self/><div><strong>{username}</strong><small>You</small></div></article>{spouseRelationships.map(item => <div className="spouse-pair" key={item.id}><span className="partner-connector"><i>♥</i></span>{relationshipNode(item, true)}</div>)}</div>{otherRelationships.length > 0 && <div className={`relationship-branches ${spouseRelationships.length ? 'from-paired-self' : ''}`}>{otherRelationships.map(item => <div className="relationship-branch" key={item.id}><span className="relationship-branch-line" />{relationshipNode(item)}</div>)}</div>}</div> : <p className="circle-empty-state">Add someone above to start your relationship tree.</p>}</section>

    <section className="network-section circle-tree-section"><div className="section-heading"><div><p className="eyebrow">MY NETWORK MAP</p><h2>My circles</h2><p className="circle-summary">{ownedCircles.length} created by me · {circles.length - ownedCircles.length} added by others</p></div><span>{circles.length}</span></div><div className="circle-forest">{circles.map(circle => { const visibleMembers = circle.members.filter(member => !member.creator); return <article className="circle-tree" key={circle.id}><div className="circle-root"><span className="circle-root-icon">◎</span><div><h3>{circle.name}</h3><p>{circle.description || 'Private circle'}</p><small>{circle.ownedByCurrentUser ? 'Created by you' : `Created by ${circle.ownerName}`} · {circle.members.length} {circle.members.length === 1 ? 'member' : 'members'}{circle.currentUserAdmin ? ' · You are an admin' : ''}</small></div></div>{visibleMembers.length > 0 && <div className="circle-branches">{visibleMembers.map(member => <div className="circle-branch" key={member.person.id}><span className="branch-line" /><div className="circle-member-node"><PersonAvatar name={member.person.displayName} photo={member.person.profilePhoto}/><div><strong>{member.person.displayName}</strong><div className="member-status-tags"><span className={`status-tag ${member.person.accountStatus === 'INVITED' ? 'status-not-verified' : 'status-verified'}`}>{member.person.accountStatus === 'INVITED' ? 'Not Verified' : 'Verified'}</span>{member.admin && <span className="status-tag status-admin">Admin</span>}</div></div>{circle.currentUserAdmin && <div className="member-admin-actions"><button className="action-tag action-tag-admin" onClick={async () => { if (member.admin) await demoteCircleAdmin(circle.id, member.person.id); else await promoteCircleAdmin(circle.id, member.person.id); await refresh(); }}>{member.admin ? 'Remove admin' : 'Make admin'}</button><button className="action-tag action-tag-danger" onClick={async () => { await removeMemberFromMyCircle(circle.id, member.person.id); await refresh(); }}>Remove</button></div>}</div></div>)}</div>}</article>; })}</div>{!circles.length && <p className="circle-empty-state">You have not created or joined any circles yet.</p>}</section>
  </main>;
}
