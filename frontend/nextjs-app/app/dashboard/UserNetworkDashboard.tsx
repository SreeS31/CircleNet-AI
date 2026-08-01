'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMemberToMyCircle, addMyRelationship, addPersonToMyNetwork, ApiError, createMyCircle, fetchMyCircles,
  fetchMyRelationships, fetchRelationshipTypes, fetchUserProfile, logout, NetworkCircle, NetworkPerson, NetworkRelationship,
  demoteCircleAdmin, promoteCircleAdmin, removeMemberFromMyCircle, removeMyRelationship, searchNetworkPeople, updateMyRelationship, updateMyCircle } from '../lib/api';
import type { VisibilityScope } from '../lib/api';

const defaultRelationshipTypes = ['Friend', 'Spouse', 'Parent', 'Child', 'Sibling', 'Colleague', 'Relative', 'Other'];
const visibilityOptions: { value: VisibilityScope; label: string }[] = [
  { value: 'PUBLIC', label: 'Public' }, { value: 'FRIENDS', label: 'Friends' },
  { value: 'RELATIVES', label: 'Relatives' }, { value: 'COLLEAGUES', label: 'Colleagues' },
];
const visibilityLabels = visibilityOptions.map(option => option.label);
const visibilityLabel = (scope: VisibilityScope | '') => visibilityOptions.find(option => option.value === scope)?.label || '';
const visibilityValue = (label: string) => visibilityOptions.find(option => option.label === label)?.value || '';

function PersonAvatar({ name, photo, self = false }: { name: string; photo?: string | null; self?: boolean }) {
  return <span className={self ? 'self-avatar avatar-photo' : 'person-avatar avatar-photo'} style={photo ? { backgroundImage: `url(${photo})` } : undefined}>{photo ? '' : name.charAt(0).toUpperCase()}</span>;
}

function SearchableSelect({ value, placeholder, options, onChange, className = '' }: { value: string; placeholder: string; options: string[]; onChange: (value: string) => void; className?: string }) {
  const [query, setQuery] = useState('');
  const filtered = options.filter(option => option.toLowerCase().includes(query.trim().toLowerCase()));
  return <details className={`searchable-select ${className}`}>
    <summary className={!value ? 'placeholder' : ''}>{value || placeholder}</summary>
    <div className="searchable-select-menu">
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${placeholder.toLowerCase()}…`} aria-label={`Search ${placeholder.toLowerCase()}`} />
      <div>{filtered.map(option => <button type="button" className={option === value ? 'selected' : ''} key={option} onClick={event => { onChange(option); setQuery(''); event.currentTarget.closest('details')?.removeAttribute('open'); }}><span>{option}</span>{option === value && <strong>✓</strong>}</button>)}{!filtered.length && <p>No matching options</p>}</div>
    </div>
  </details>;
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
  const [visibilityChoice, setVisibilityChoice] = useState<Record<number, VisibilityScope>>({});
  const [companyChoice, setCompanyChoice] = useState<Record<number, string>>({});
  const [circleSearch, setCircleSearch] = useState<Record<number, string>>({});
  const [circleChoice, setCircleChoice] = useState<Record<number, string>>({});
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [mobileToAdd, setMobileToAdd] = useState('');
  const [fullNameToAdd, setFullNameToAdd] = useState('');
  const [emailToAdd, setEmailToAdd] = useState('');
  const [directRelationshipType, setDirectRelationshipType] = useState('');
  const [directVisibility, setDirectVisibility] = useState<VisibilityScope | ''>('');
  const [directCompany, setDirectCompany] = useState('');
  const [employmentCompanies, setEmploymentCompanies] = useState<string[]>([]);
  const [editingRelationship, setEditingRelationship] = useState<{ id: number; contactName: string; contactPhone: string; contactEmail: string; type: string; visibilityScope: VisibilityScope; visibilityCompany: string } | null>(null);
  const [editingCircle, setEditingCircle] = useState<{ id: number; name: string; description: string } | null>(null);
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
    const companies = String(profileData.employer || '').split(/[,;|\n]/).map(item => item.trim()).filter(Boolean);
    setEmploymentCompanies(Array.from(new Set(companies)));
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
    const selectedRelation = relationshipType[person.id];
    const scope = visibilityChoice[person.id];
    if (!selectedRelation || !scope) { setMessage('Relation and View are mandatory. Please select both.'); return; }
    setBusy(true);
    try {
      await addMyRelationship(person.id, selectedRelation, scope,
        scope === 'COLLEAGUES' ? companyChoice[person.id] : undefined);
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
    if (!directRelationshipType || !directVisibility) { setMessage('Relation and View are mandatory. Please select both.'); return; }
    setBusy(true);
    setInviteMobile('');
    setCommunication(null);
    try {
      const relationship = await addPersonToMyNetwork({ fullName: fullNameToAdd, phoneNumber: mobileToAdd, email: emailToAdd || undefined,
        type: directRelationshipType, visibilityScope: directVisibility,
        visibilityCompany: directVisibility === 'COLLEAGUES' ? directCompany : undefined });
      const existing = relationship.person.accountStatus === 'ACTIVE';
      await refresh();
      setInviteMobile(existing ? '' : mobileToAdd.trim());
      setCommunication({ name: fullNameToAdd.trim() || relationship.person.displayName, mobile: mobileToAdd.trim(), email: emailToAdd.trim(), relationship: directRelationshipType, existing });
      setMobileToAdd('');
      setFullNameToAdd('');
      setEmailToAdd('');
      setDirectRelationshipType('');
      setDirectVisibility('');
      setDirectCompany('');
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

  const saveRelationshipEdit = async () => {
    if (!editingRelationship) return;
    setBusy(true);
    try {
      await updateMyRelationship(editingRelationship.id, {
        contactName: editingRelationship.contactName, contactPhone: editingRelationship.contactPhone || undefined,
        contactEmail: editingRelationship.contactEmail || undefined, type: editingRelationship.type,
        visibilityScope: editingRelationship.visibilityScope,
        visibilityCompany: editingRelationship.visibilityScope === 'COLLEAGUES' ? editingRelationship.visibilityCompany : undefined,
      });
      setEditingRelationship(null);
      await refresh();
      setMessage('Relationship updated successfully.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const saveCircleEdit = async () => {
    if (!editingCircle) return;
    setBusy(true);
    try {
      await updateMyCircle(editingCircle.id, editingCircle.name, editingCircle.description);
      setEditingCircle(null);
      await refresh();
      setMessage('Circle information updated successfully.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const spouseRelationships = relationships.filter(item => item.type.toLowerCase() === 'spouse');
  const otherRelationships = relationships.filter(item => item.type.toLowerCase() !== 'spouse');
  const ownedCircles = circles.filter(circle => circle.ownedByCurrentUser);
  const administeredCircles = circles.filter(circle => circle.currentUserAdmin);

  const relationshipNode = (item: NetworkRelationship, paired = false) => {
    const availableCircles = administeredCircles.filter(circle => !circle.members.some(member => member.person.id === item.person.id));
    const allCirclesContainPerson = administeredCircles.length > 0 && availableCircles.length === 0;
    const circleQuery = (circleSearch[item.id] || '').trim().toLowerCase();
    const filteredCircles = administeredCircles.filter(circle => !circleQuery || circle.name.toLowerCase().includes(circleQuery));
    return <article className={`relationship-node ${paired ? 'spouse-node' : ''}`} key={item.id}>
    <div className="relationship-node-main"><PersonAvatar name={item.person.displayName} photo={item.person.profilePhoto}/><div className="relationship-identity"><strong>{item.person.displayName}</strong><div className="private-contact-display">{item.contactPhone && <span><i aria-hidden="true">☎</i>{item.contactPhone}</span>}{item.contactEmail && <span><i aria-hidden="true">✉</i>{item.contactEmail}</span>}</div><div><span className="relationship-badge">{item.type}</span><span className="status-tag status-view">{visibilityOptions.find(option => option.value === item.visibilityScope)?.label || 'Friends'}{item.visibilityCompany ? ` · ${item.visibilityCompany}` : ''}</span><span className={`status-tag ${item.person.accountStatus === 'INVITED' ? 'status-not-verified' : 'status-verified'}`}>{item.person.accountStatus === 'INVITED' ? 'Not Verified' : 'Verified'}</span></div></div><div className="relationship-actions"><button className="action-tag action-tag-admin" onClick={() => setEditingRelationship({ id:item.id, contactName:item.person.displayName, contactPhone:item.contactPhone || '', contactEmail:item.contactEmail || '', type:item.type, visibilityScope:item.visibilityScope || 'FRIENDS', visibilityCompany:item.visibilityCompany || '' })}>Edit</button><button className="action-tag action-tag-danger" onClick={async () => { await removeMyRelationship(item.id); await refresh(); }}>Remove</button></div></div>
    {editingRelationship?.id === item.id && <div className="relationship-edit-panel"><label><span>Person name</span><input required value={editingRelationship.contactName} onChange={e => setEditingRelationship({...editingRelationship,contactName:e.target.value})}/></label><label><span>Mobile number</span><input type="tel" value={editingRelationship.contactPhone} onChange={e => setEditingRelationship({...editingRelationship,contactPhone:e.target.value})} placeholder="Private contact mobile"/></label><label><span>Email address</span><input type="email" value={editingRelationship.contactEmail} onChange={e => setEditingRelationship({...editingRelationship,contactEmail:e.target.value})} placeholder="Private contact email"/></label><label><span>Relationship</span><SearchableSelect value={editingRelationship.type} placeholder="Relation" options={relationshipTypes} onChange={type => setEditingRelationship({...editingRelationship,type})}/></label><label><span>View</span><SearchableSelect value={visibilityLabel(editingRelationship.visibilityScope)} placeholder="View" options={visibilityLabels} onChange={label => setEditingRelationship({...editingRelationship,visibilityScope:visibilityValue(label) as VisibilityScope})}/></label>{editingRelationship.visibilityScope === 'COLLEAGUES' && <label><span>Company</span><SearchableSelect value={editingRelationship.visibilityCompany} placeholder="Company" options={employmentCompanies} onChange={visibilityCompany => setEditingRelationship({...editingRelationship,visibilityCompany})}/></label>}<p className="private-contact-note">Mobile and email are private to your relationship record and are never shown to other users.</p><div className="relationship-edit-actions"><button type="button" className="action-tag action-tag-admin" disabled={busy || !editingRelationship.contactName.trim()} onClick={saveRelationshipEdit}>Save</button><button type="button" className="action-tag action-tag-danger" disabled={busy} onClick={() => setEditingRelationship(null)}>Cancel</button></div></div>}
    <details className="circle-picker"><summary className={`action-tag action-tag-admin ${!administeredCircles.length || allCirclesContainPerson ? 'disabled' : ''}`}>{allCirclesContainPerson ? '✓ In all circles' : 'Add to circle'}</summary><div className="circle-picker-menu"><input className="circle-picker-search" type="search" value={circleSearch[item.id] || ''} onChange={e => setCircleSearch({...circleSearch,[item.id]:e.target.value})} placeholder="Search circles…" aria-label="Search circles"/>{filteredCircles.map(circle => { const alreadyAdded = circle.members.some(member => member.person.id === item.person.id); return <button type="button" className={alreadyAdded ? 'circle-already-added' : ''} key={circle.id} disabled={busy || alreadyAdded} onClick={event => { void addToCircle(item.person, circle.id); event.currentTarget.closest('details')?.removeAttribute('open'); }}><span>{circle.name}</span>{alreadyAdded && <strong aria-label="Already in this circle">✓ Added</strong>}</button>; })}{!administeredCircles.length && <span>No circles you administer</span>}{administeredCircles.length > 0 && filteredCircles.length === 0 && <span>No matching circles</span>}</div></details>
  </article>;
  };

  return <main className="container user-network-dashboard">
    <header className="network-header">
      <div><p className="eyebrow">MY CIRCLENET</p><h1>Welcome, {username}</h1><p>Find people you know, define the relationship, and organize them into circles.</p></div>
      <div className="network-actions"><Link href="/profile" className="btn btn-secondary">My profile</Link><Link href="/session" className="btn btn-secondary">Session</Link><button className="btn btn-secondary" onClick={async () => { await logout(); router.replace('/auth'); }}>Sign out</button></div>
    </header>

    <p className="network-message" role="status">{message}</p>

    <section className="card quick-add-card">
      <div><p className="eyebrow">ADD TO MY NETWORK</p><h2>Add a friend, relative, or family member</h2><p>Full name, mobile number, relationship, and View are required. Mobile is checked only to prevent duplicates and is never shown to other users.</p></div>
      <form onSubmit={addByMobile} className="quick-add-form">
        <input className="quick-add-name" type="text" required value={fullNameToAdd} onChange={e => setFullNameToAdd(e.target.value)} placeholder="Full name" />
        <input className="quick-add-mobile" type="tel" required value={mobileToAdd} onChange={e => setMobileToAdd(e.target.value)} placeholder="Mobile number, e.g. +919876543210" />
        <input className="quick-add-email" type="email" value={emailToAdd} onChange={e => setEmailToAdd(e.target.value)} placeholder="Email address (optional)" />
        <SearchableSelect className="quick-add-relationship" value={directRelationshipType} placeholder="Relation" options={relationshipTypes} onChange={setDirectRelationshipType}/>
        <SearchableSelect className="quick-add-visibility" value={visibilityLabel(directVisibility)} placeholder="View" options={visibilityLabels} onChange={label => setDirectVisibility(visibilityValue(label) as VisibilityScope)}/>
        {directVisibility === 'COLLEAGUES' && <SearchableSelect className="quick-add-company" value={directCompany} placeholder="Company" options={employmentCompanies} onChange={setDirectCompany}/>}
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
              <div className="people-identity"><strong>{person.displayName}</strong><small>{person.location || 'Location not provided'}</small><span className={`status-tag ${person.accountStatus === 'INVITED' ? 'status-not-verified' : 'status-verified'}`}>{person.accountStatus === 'INVITED' ? 'Not Verified' : 'Verified'}</span></div>
              {!relationship ? <div className="people-controls">
                <SearchableSelect value={relationshipType[person.id] || ''} placeholder="Relation" options={relationshipTypes} onChange={type => setRelationshipType({...relationshipType,[person.id]:type})}/>
                <SearchableSelect value={visibilityLabel(visibilityChoice[person.id] || '')} placeholder="View" options={visibilityLabels} onChange={label => setVisibilityChoice({...visibilityChoice,[person.id]:visibilityValue(label) as VisibilityScope})}/>
                {visibilityChoice[person.id] === 'COLLEAGUES' && <SearchableSelect value={companyChoice[person.id] || ''} placeholder="Company" options={employmentCompanies} onChange={company => setCompanyChoice({...companyChoice,[person.id]:company})}/>}
                <button className="btn btn-primary" disabled={busy} onClick={() => connect(person)}>Add relationship</button>
              </div> : <div className="people-controls"><span className="relationship-badge">{relationship.type}</span><select value={circleChoice[person.id] || ''} onChange={e => setCircleChoice({...circleChoice, [person.id]: e.target.value})}><option value="">Choose circle</option>{administeredCircles.map(circle => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select><button className="btn btn-secondary" disabled={busy || !administeredCircles.length} onClick={() => addToCircle(person)}>Add to circle</button></div>}
            </div>;
          })}
        </div>
      </article>

      <aside className="card create-circle-card"><p className="eyebrow">ORGANIZE</p><h2>Create a circle</h2><form onSubmit={createCircle}><input required value={circleName} onChange={e => setCircleName(e.target.value)} placeholder="Family, Close friends…" /><textarea value={circleDescription} onChange={e => setCircleDescription(e.target.value)} placeholder="Optional description" /><button className="btn btn-primary" disabled={busy}>Create circle</button></form></aside>
    </section>

    <section className="network-section relationship-tree-section"><div className="section-heading"><div><p className="eyebrow">MY RELATIONSHIP MAP</p><h2>My relationships</h2></div><span>{relationships.length}</span></div>{relationships.length ? <div className="relationship-tree"><div className={`partnership-row ${spouseRelationships.length ? 'has-spouse' : ''}`}><article className="self-node"><PersonAvatar name={username} photo={selfPhoto} self/><div><strong>{username}</strong><small>You</small></div></article>{spouseRelationships.map(item => <div className="spouse-pair" key={item.id}><span className="partner-connector"><i>♥</i></span>{relationshipNode(item, true)}</div>)}</div>{otherRelationships.length > 0 && <div className={`relationship-branches ${spouseRelationships.length ? 'from-paired-self' : ''}`}>{otherRelationships.map(item => <div className="relationship-branch" key={item.id}><span className="relationship-branch-line" />{relationshipNode(item)}</div>)}</div>}</div> : <p className="circle-empty-state">Add someone above to start your relationship tree.</p>}</section>

    <section className="network-section circle-tree-section"><div className="section-heading"><div><p className="eyebrow">MY NETWORK MAP</p><h2>My circles</h2><p className="circle-summary">{ownedCircles.length} created by me · {circles.length - ownedCircles.length} added by others</p></div><span>{circles.length}</span></div><div className="circle-forest">{circles.map(circle => { const visibleMembers = circle.members.filter(member => !member.creator); return <article className="circle-tree" key={circle.id}>
      <div className="circle-root"><PersonAvatar name={circle.ownerName} photo={circle.ownerPhoto}/><div className="circle-root-copy"><h3>{circle.name}</h3><p>{circle.description || 'Private circle'}</p><small>{circle.ownedByCurrentUser ? 'Created by you' : `Created by ${circle.ownerName}`} · {circle.members.length} {circle.members.length === 1 ? 'member' : 'members'}{circle.currentUserAdmin ? ' · You are an admin' : ''}</small></div>{circle.currentUserAdmin && <button className="action-tag circle-edit-trigger" onClick={() => setEditingCircle({id:circle.id,name:circle.name,description:circle.description || ''})}>Edit circle</button>}</div>
      {editingCircle?.id === circle.id && <div className="circle-edit-panel"><label><span>Circle name</span><input required value={editingCircle.name} onChange={e => setEditingCircle({...editingCircle,name:e.target.value})}/></label><label><span>Description</span><textarea value={editingCircle.description} onChange={e => setEditingCircle({...editingCircle,description:e.target.value})}/></label><div><button className="action-tag action-tag-admin" disabled={busy || !editingCircle.name.trim()} onClick={saveCircleEdit}>Save</button><button className="action-tag action-tag-danger" disabled={busy} onClick={() => setEditingCircle(null)}>Cancel</button></div></div>}
      {visibleMembers.length > 0 && <div className="circle-branches">{visibleMembers.map(member => <div className="circle-branch" key={member.person.id}><span className="branch-line" /><div className="circle-member-node"><PersonAvatar name={member.person.displayName} photo={member.person.profilePhoto}/><div><strong>{member.person.displayName}</strong><div className="member-status-tags"><span className={`status-tag ${member.person.accountStatus === 'INVITED' ? 'status-not-verified' : 'status-verified'}`}>{member.person.accountStatus === 'INVITED' ? 'Not Verified' : 'Verified'}</span>{member.admin && <span className="status-tag status-admin">Admin</span>}</div></div>{circle.currentUserAdmin && <div className="member-admin-actions"><button className="action-tag action-tag-admin" onClick={async () => { if (member.admin) await demoteCircleAdmin(circle.id, member.person.id); else await promoteCircleAdmin(circle.id, member.person.id); await refresh(); }}>{member.admin ? 'Remove admin' : 'Make admin'}</button><button className="action-tag action-tag-danger" onClick={async () => { await removeMemberFromMyCircle(circle.id, member.person.id); await refresh(); }}>Remove</button></div>}</div></div>)}</div>}
    </article>; })}</div>{!circles.length && <p className="circle-empty-state">You have not created or joined any circles yet.</p>}</section>
  </main>;
}
