'use client';

import Link from 'next/link';
import { FormEvent, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMemberToMyCircle, addMyRelationship, addPersonToMyNetwork, ApiError, createMyCircle, fetchMyCircles,
  fetchMyRelationships, fetchRelationshipTypes, fetchUserProfile, logout, NetworkCircle, NetworkPerson, NetworkRelationship,
  demoteCircleAdmin, promoteCircleAdmin, removeMemberFromMyCircle, removeMyRelationship, searchNetworkPeople, updateMyRelationship, updateMyCircle } from '../lib/api';
import type { VisibilityScope } from '../lib/api';
import CountryPhoneInput from '../components/CountryPhoneInput';

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
function PersonStatus({ person }: { person: NetworkPerson }) {
  if (person.identityType === 'MANAGED' || person.accountStatus === 'MANAGED') {
    const label = person.managedCategory === 'MEMORIAL' ? 'Memorial profile' : person.managedCategory === 'CHILD' ? 'Child profile' : 'Managed profile';
    return <span className={`status-tag ${person.managedCategory === 'MEMORIAL' ? 'status-memorial' : 'status-managed'}`}>{label}</span>;
  }
  const invited = person.accountStatus === 'INVITED';
  return <span className={`status-tag ${invited ? 'status-not-verified' : 'status-verified'}`}>{invited ? 'Not Verified' : 'Verified'}</span>;
}

function genderClass(person: NetworkPerson, relationshipType = '') {
  const stored = (person.gender || '').trim().toLowerCase();
  if (stored === 'male' || stored === 'man') return 'family-gender-male';
  if (stored === 'female' || stored === 'woman') return 'family-gender-female';
  const relation = relationshipType.trim().toLowerCase();
  if (['father', 'brother', 'son', 'husband', 'grandfather', 'grandson'].includes(relation)) return 'family-gender-male';
  if (['mother', 'sister', 'daughter', 'wife', 'grandmother', 'granddaughter'].includes(relation)) return 'family-gender-female';
  return 'family-gender-other';
}

const relationKey = (relationship: NetworkRelationship) => relationship.type.trim().toLowerCase().replace(/[\s_-]+/g, '');

function FamilyConnectors({ rootRef, version }: { rootRef: RefObject<HTMLDivElement | null>; version: string }) {
  const [drawing, setDrawing] = useState({ width:0, height:0, paths:[] as { d:string; arrow:boolean }[] });
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer = 0;
    const draw = () => {
      const rootBox = root.getBoundingClientRect();
      const point = (element: Element, edge: 'top' | 'bottom') => { const box = element.getBoundingClientRect(); return { x:box.left - rootBox.left + root.scrollLeft + box.width / 2, y:(edge === 'top' ? box.top : box.bottom) - rootBox.top + root.scrollTop }; };
      const paths: { d:string; arrow:boolean }[] = [];
      const connect = (sourceSelector: string, targetSelector: string) => {
        const sources = Array.from(root.querySelectorAll(sourceSelector)).map(node => point(node,'bottom'));
        const targets = Array.from(root.querySelectorAll(targetSelector)).map(node => point(node,'top'));
        if (!sources.length || !targets.length) return;
        const sourceBottom = Math.max(...sources.map(item => item.y));
        const targetTop = Math.min(...targets.map(item => item.y));
        if (targetTop <= sourceBottom) return;
        const centerX = sources.reduce((sum,item) => sum + item.x,0) / sources.length;
        const joinY = sourceBottom + Math.max(18,(targetTop - sourceBottom) * .32);
        const branchY = targetTop - Math.max(18,(targetTop - sourceBottom) * .28);
        sources.forEach(source => {
          const direction = source.x <= centerX ? 1 : -1;
          const radius = Math.min(12,Math.abs(centerX - source.x) / 2);
          paths.push({d:`M ${source.x} ${source.y} V ${joinY - radius} Q ${source.x} ${joinY} ${source.x + direction * radius} ${joinY} H ${centerX}`,arrow:false});
        });
        paths.push({d:`M ${centerX} ${joinY} V ${branchY}`,arrow:false});
        if (targets.length > 1) paths.push({d:`M ${Math.min(...targets.map(item => item.x))} ${branchY} H ${Math.max(...targets.map(item => item.x))}`,arrow:false});
        targets.forEach(target => paths.push({d:`M ${target.x} ${branchY} V ${target.y - 7}`,arrow:true}));
      };
      connect('[data-tree-role="grandparent"]','[data-tree-role="parent"]');
      connect('[data-tree-role="parent"]','[data-tree-role="current"],[data-tree-role="sibling"]');
      connect('[data-tree-role="current"],[data-tree-role="current-spouse"]','[data-tree-role="child"]');
      connect('[data-tree-role="child"]','[data-tree-role="grandchild"]');
      setDrawing({width:root.scrollWidth,height:root.scrollHeight,paths});
    };
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(draw,40); };
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    root.querySelectorAll('[data-tree-role]').forEach(node => observer.observe(node));
    root.addEventListener('transitionend',schedule);
    root.addEventListener('click',schedule);
    root.addEventListener('pointerover',schedule);
    root.addEventListener('pointerout',schedule);
    window.addEventListener('resize',schedule);
    draw();
    return () => { window.clearTimeout(timer); observer.disconnect(); root.removeEventListener('transitionend',schedule); root.removeEventListener('click',schedule); root.removeEventListener('pointerover',schedule); root.removeEventListener('pointerout',schedule); window.removeEventListener('resize',schedule); };
  }, [rootRef,version]);
  return <svg className="family-connector-layer" width={drawing.width} height={drawing.height} aria-hidden="true"><g>{drawing.paths.map((path,index) => <path d={path.d} key={`${index}-${path.d}`}/>)}</g></svg>;
}

function FamilyBranch({ targets }: { targets: number }) {
  if (targets < 1) return null;
  const width = targets * 170 + Math.max(0,targets - 1) * 16;
  return <div className={`family-branch-connector ${targets === 1 ? 'single-target' : ''}`} style={{width}} aria-hidden="true"><span className="family-branch-stem"/><span className="family-branch-bar"/><div className="family-branch-drops" style={{gridTemplateColumns:`repeat(${targets}, 170px)`}}>{Array.from({length:targets},(_,index) => <span key={index}/>)}</div></div>;
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
  const familyTreeRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NetworkPerson[]>([]);
  const [relationships, setRelationships] = useState<NetworkRelationship[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState(defaultRelationshipTypes);
  const [circles, setCircles] = useState<NetworkCircle[]>([]);
  const [selfPhoto, setSelfPhoto] = useState<string | null>(null);
  const [selfGender, setSelfGender] = useState('');
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
  const [identityType, setIdentityType] = useState<'ACCOUNT' | 'MANAGED'>('ACCOUNT');
  const [managedCategory, setManagedCategory] = useState<'CHILD' | 'MEMORIAL' | 'OTHER'>('CHILD');
  const [managedDateOfBirth, setManagedDateOfBirth] = useState('');
  const [managedDateOfDeath, setManagedDateOfDeath] = useState('');
  const [managedNotes, setManagedNotes] = useState('');
  const [directRelationshipType, setDirectRelationshipType] = useState('');
  const [directVisibility, setDirectVisibility] = useState<VisibilityScope | ''>('');
  const [directCompany, setDirectCompany] = useState('');
  const [employmentCompanies, setEmploymentCompanies] = useState<string[]>([]);
  const [editingRelationship, setEditingRelationship] = useState<{ id: number; contactName: string; contactPhone: string; contactEmail: string; type: string; visibilityScope: VisibilityScope; visibilityCompany: string } | null>(null);
  const [expandedRelationships, setExpandedRelationships] = useState<Record<number, boolean>>({});
  const [editingCircle, setEditingCircle] = useState<{ id: number; name: string; description: string } | null>(null);
  const [inviteMobile, setInviteMobile] = useState('');
  const [communication, setCommunication] = useState<{ name: string; mobile: string; email: string; relationship: string; existing: boolean } | null>(null);
  const [addingRelativeTo, setAddingRelativeTo] = useState<NetworkPerson | null>(null);
  const [message, setMessage] = useState('Search by person name, surname, mobile number, or location.');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [relationshipData, circleData, typeData, profileData] = await Promise.all([fetchMyRelationships(), fetchMyCircles(), fetchRelationshipTypes(), fetchUserProfile()]);
    setRelationships(relationshipData);
    setCircles(circleData);
    setRelationshipTypes(typeData.length ? typeData : defaultRelationshipTypes);
    setSelfPhoto(profileData.profilePhoto as string | null);
    setSelfGender(String(profileData.gender || ''));
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
      const relationship = await addPersonToMyNetwork({ fullName: fullNameToAdd, phoneNumber: mobileToAdd || undefined, email: emailToAdd || undefined,
        type: directRelationshipType, visibilityScope: directVisibility,
        visibilityCompany: directVisibility === 'COLLEAGUES' ? directCompany : undefined, identityType,
        managedCategory: identityType === 'MANAGED' ? managedCategory : undefined,
        dateOfBirth: identityType === 'MANAGED' ? managedDateOfBirth || undefined : undefined,
        dateOfDeath: identityType === 'MANAGED' && managedCategory === 'MEMORIAL' ? managedDateOfDeath || undefined : undefined,
        notes: identityType === 'MANAGED' ? managedNotes || undefined : undefined,
        relativeToUserId: addingRelativeTo?.id });
      const existing = relationship.person.accountStatus === 'ACTIVE';
      await refresh();
      setInviteMobile(identityType === 'ACCOUNT' && !existing ? mobileToAdd.trim() : '');
      setCommunication(identityType === 'ACCOUNT' ? { name: fullNameToAdd.trim() || relationship.person.displayName, mobile: mobileToAdd.trim(), email: emailToAdd.trim(), relationship: directRelationshipType, existing } : null);
      setMobileToAdd('');
      setFullNameToAdd('');
      setEmailToAdd('');
      setDirectRelationshipType('');
      setDirectVisibility('');
      setDirectCompany('');
      setManagedDateOfBirth(''); setManagedDateOfDeath(''); setManagedNotes('');
      setAddingRelativeTo(null);
      setMessage(identityType === 'MANAGED'
        ? `${relationship.person.displayName} was added as a managed profile. It can be used in relationships and circles but cannot sign in.`
        : existing
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

  const directRelationships = relationships.filter(item => !item.relativeToUserId);
  const spouseRelationships = directRelationships.filter(item => ['spouse','husband','wife'].includes(relationKey(item)));
  const grandparentRelationships = directRelationships.filter(item => ['grandparent','grandfather','grandmother'].includes(relationKey(item)));
  const parentRelationships = directRelationships.filter(item => ['parent','father','mother'].includes(relationKey(item)));
  const siblingRelationships = directRelationships.filter(item => ['sibling','brother','sister'].includes(relationKey(item)));
  const childRelationships = directRelationships.filter(item => ['child','son','daughter'].includes(relationKey(item)));
  const grandchildRelationships = directRelationships.filter(item => ['grandchild','grandson','granddaughter'].includes(relationKey(item)));
  const familyIds = new Set([...spouseRelationships,...grandparentRelationships,...parentRelationships,...siblingRelationships,...childRelationships,...grandchildRelationships].map(item => item.id));
  const otherRelationships = directRelationships.filter(item => !familyIds.has(item.id));
  const ownedCircles = circles.filter(circle => circle.ownedByCurrentUser);
  const administeredCircles = circles.filter(circle => circle.currentUserAdmin);

  const relationshipNode = (item: NetworkRelationship, paired = false, treeRole = '') => {
    const nodeRelations = relationships.filter(relationship => relationship.relativeToUserId === item.person.id);
    const availableCircles = administeredCircles.filter(circle => !circle.members.some(member => member.person.id === item.person.id));
    const allCirclesContainPerson = administeredCircles.length > 0 && availableCircles.length === 0;
    const circleQuery = (circleSearch[item.id] || '').trim().toLowerCase();
    const filteredCircles = administeredCircles.filter(circle => !circleQuery || circle.name.toLowerCase().includes(circleQuery));
    const expanded = Boolean(expandedRelationships[item.id]) || editingRelationship?.id === item.id;
    const toggleExpanded = () => setExpandedRelationships(current => ({...current,[item.id]:!current[item.id]}));
    return <article className={`relationship-node relationship-node-compact ${expanded ? 'is-expanded' : ''} ${paired ? 'spouse-node' : ''} ${genderClass(item.person, item.type)}`} key={item.id} data-tree-role={treeRole || undefined} tabIndex={0} aria-label={`${item.person.displayName}, ${item.type}. Click to ${expanded ? 'collapse' : 'show details'}.`} onClick={event => { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea,summary')) toggleExpanded(); }} onKeyDown={event => { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea,summary') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggleExpanded(); } }}>
    <span className="compact-relationship-label">{item.type}</span><div className="relationship-node-main"><PersonAvatar name={item.person.displayName} photo={item.person.profilePhoto}/><div className="relationship-identity"><strong>{item.person.displayName}</strong><div className="private-contact-display">{item.contactPhone && <span><i aria-hidden="true">☎</i>{item.contactPhone}</span>}{item.contactEmail && <span><i aria-hidden="true">✉</i>{item.contactEmail}</span>}</div><div><span className="relationship-badge">{item.type}</span><span className="status-tag status-view">{visibilityOptions.find(option => option.value === item.visibilityScope)?.label || 'Friends'}{item.visibilityCompany ? ` · ${item.visibilityCompany}` : ''}</span><PersonStatus person={item.person}/></div></div><div className="relationship-actions"><button className="action-tag action-tag-admin" onClick={() => setEditingRelationship({ id:item.id, contactName:item.person.displayName, contactPhone:item.contactPhone || '', contactEmail:item.contactEmail || '', type:item.type, visibilityScope:item.visibilityScope || 'FRIENDS', visibilityCompany:item.visibilityCompany || '' })}>Edit</button><button className="action-tag action-tag-danger" onClick={async () => { await removeMyRelationship(item.id); await refresh(); }}>Remove</button></div></div>
    {editingRelationship?.id === item.id && <div className="relationship-edit-panel"><label><span>Person name</span><input required value={editingRelationship.contactName} onChange={e => setEditingRelationship({...editingRelationship,contactName:e.target.value})}/></label><label><span>Mobile number</span><CountryPhoneInput value={editingRelationship.contactPhone} onChange={contactPhone => setEditingRelationship({...editingRelationship,contactPhone})} placeholder="Private contact mobile"/></label><label><span>Email address</span><input type="email" value={editingRelationship.contactEmail} onChange={e => setEditingRelationship({...editingRelationship,contactEmail:e.target.value})} placeholder="Private contact email"/></label><label><span>Relationship</span><SearchableSelect value={editingRelationship.type} placeholder="Relation" options={relationshipTypes} onChange={type => setEditingRelationship({...editingRelationship,type})}/></label><label><span>View</span><SearchableSelect value={visibilityLabel(editingRelationship.visibilityScope)} placeholder="View" options={visibilityLabels} onChange={label => setEditingRelationship({...editingRelationship,visibilityScope:visibilityValue(label) as VisibilityScope})}/></label>{editingRelationship.visibilityScope === 'COLLEAGUES' && <label><span>Company</span><SearchableSelect value={editingRelationship.visibilityCompany} placeholder="Company" options={employmentCompanies} onChange={visibilityCompany => setEditingRelationship({...editingRelationship,visibilityCompany})}/></label>}<p className="private-contact-note">Mobile and email are private to your relationship record and are never shown to other users.</p><div className="relationship-edit-actions"><button type="button" className="action-tag action-tag-admin" disabled={busy || !editingRelationship.contactName.trim()} onClick={saveRelationshipEdit}>Save</button><button type="button" className="action-tag action-tag-danger" disabled={busy} onClick={() => setEditingRelationship(null)}>Cancel</button></div></div>}
    <div className="relationship-bottom-actions"><button className="action-tag action-tag-admin" onClick={() => { setAddingRelativeTo(item.person); document.getElementById('add-network-person')?.scrollIntoView({behavior:'smooth',block:'center'}); }}>+ Relation</button><details className="circle-picker"><summary className={`action-tag action-tag-admin ${!administeredCircles.length || allCirclesContainPerson ? 'disabled' : ''}`}>{allCirclesContainPerson ? '✓ In all circles' : 'Add to circle'}</summary><div className="circle-picker-menu"><input className="circle-picker-search" type="search" value={circleSearch[item.id] || ''} onChange={e => setCircleSearch({...circleSearch,[item.id]:e.target.value})} placeholder="Search circles…" aria-label="Search circles"/>{filteredCircles.map(circle => { const alreadyAdded = circle.members.some(member => member.person.id === item.person.id); return <button type="button" className={alreadyAdded ? 'circle-already-added' : ''} key={circle.id} disabled={busy || alreadyAdded} onClick={event => { void addToCircle(item.person, circle.id); event.currentTarget.closest('details')?.removeAttribute('open'); }}><span>{circle.name}</span>{alreadyAdded && <strong aria-label="Already in this circle">✓ Added</strong>}</button>; })}{!administeredCircles.length && <span>No circles you administer</span>}{administeredCircles.length > 0 && filteredCircles.length === 0 && <span>No matching circles</span>}</div></details></div>
    {expanded && nodeRelations.length > 0 && <div className="node-relative-list"><strong>Relations of {item.person.displayName}</strong>{nodeRelations.map(relation => <div key={relation.id}><PersonAvatar name={relation.person.displayName} photo={relation.person.profilePhoto}/><span>{relation.person.displayName}<small>{relation.type}</small></span><button type="button" className="action-tag action-tag-admin" onClick={() => { setAddingRelativeTo(relation.person); document.getElementById('add-network-person')?.scrollIntoView({behavior:'smooth',block:'center'}); }}>+ Relation</button></div>)}</div>}
  </article>;
  };

  return <main className="container user-network-dashboard">
    <header className="network-header">
      <div><p className="eyebrow">MY CIRCLENET</p><h1>Welcome, {username}</h1><p>Find people you know, define the relationship, and organize them into circles.</p></div>
      <div className="network-actions"><Link href="/profile" className="btn btn-secondary">My profile</Link><Link href="/session" className="btn btn-secondary">Session</Link><button className="btn btn-secondary" onClick={async () => { await logout(); router.replace('/auth'); }}>Sign out</button></div>
    </header>

    <p className="network-message" role="status">{message}</p>

    <section className="card quick-add-card" id="add-network-person">
      <div><p className="eyebrow">ADD TO MY NETWORK</p><h2>Add a friend, relative, or family member</h2><p>Choose a CircleNet account for someone who can sign in, or Managed person for a child, dependent, memorial, or someone without contact details. Contact details remain private.</p></div>
      <form onSubmit={addByMobile} className={`quick-add-form ${addingRelativeTo ? 'has-relative-target' : ''}`}>
        {addingRelativeTo && <div className="relative-to-banner"><span>Adding a relation to <strong>{addingRelativeTo.displayName}</strong></span><button type="button" className="action-tag action-tag-danger" onClick={() => setAddingRelativeTo(null)}>Cancel</button></div>}
        <fieldset className="quick-add-identity person-type-choice"><legend>Person type</legend><label><input type="radio" name="identityType" value="ACCOUNT" checked={identityType === 'ACCOUNT'} onChange={() => setIdentityType('ACCOUNT')}/><span><strong>CircleNet account</strong><small>Person can register and sign in</small></span></label><label><input type="radio" name="identityType" value="MANAGED" checked={identityType === 'MANAGED'} onChange={() => setIdentityType('MANAGED')}/><span><strong>Managed person</strong><small>Child, dependent, memorial, or no contact details</small></span></label></fieldset>
        <input className="quick-add-name" type="text" required value={fullNameToAdd} onChange={e => setFullNameToAdd(e.target.value)} placeholder="Full name" />
        <CountryPhoneInput className="quick-add-mobile" required={identityType === 'ACCOUNT'} value={mobileToAdd} onChange={setMobileToAdd} placeholder={identityType === 'ACCOUNT' ? 'Mobile number' : 'Mobile number (optional)'}/>
        <input className="quick-add-email" type="email" value={emailToAdd} onChange={e => setEmailToAdd(e.target.value)} placeholder="Email address (optional)" />
        <SearchableSelect className="quick-add-relationship" value={directRelationshipType} placeholder="Relation" options={relationshipTypes} onChange={setDirectRelationshipType}/>
        <SearchableSelect className="quick-add-visibility" value={visibilityLabel(directVisibility)} placeholder="View" options={visibilityLabels} onChange={label => setDirectVisibility(visibilityValue(label) as VisibilityScope)}/>
        {directVisibility === 'COLLEAGUES' && <SearchableSelect className="quick-add-company" value={directCompany} placeholder="Company" options={employmentCompanies} onChange={setDirectCompany}/>}
        {identityType === 'MANAGED' && <div className="managed-person-fields"><SearchableSelect value={managedCategory === 'CHILD' ? 'Child / dependent' : managedCategory === 'MEMORIAL' ? 'Memorial person' : 'Other managed person'} placeholder="Managed category" options={['Child / dependent', 'Memorial person', 'Other managed person']} onChange={value => setManagedCategory(value === 'Memorial person' ? 'MEMORIAL' : value === 'Other managed person' ? 'OTHER' : 'CHILD')}/><label><span>Date of birth (optional)</span><input type="date" value={managedDateOfBirth} onChange={event => setManagedDateOfBirth(event.target.value)}/></label>{managedCategory === 'MEMORIAL' && <label><span>Date of death (optional)</span><input type="date" value={managedDateOfDeath} onChange={event => setManagedDateOfDeath(event.target.value)}/></label>}<textarea value={managedNotes} onChange={event => setManagedNotes(event.target.value)} placeholder="Biography or guardian notes (optional)" maxLength={2000}/><p>{managedCategory === 'MEMORIAL' ? 'Memorial profiles are permanently non-claimable.' : 'This profile is managed by you. Any future account claim requires guardian approval.'}</p></div>}
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
              <div className="people-identity"><strong>{person.displayName}</strong><small>{person.location || 'Location not provided'}</small><PersonStatus person={person}/></div>
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

    <section className="network-section relationship-tree-section"><div className="section-heading"><div><p className="eyebrow">MY FAMILY TREE</p><h2>My relationships</h2><p className="family-tree-help">Generations are arranged automatically as relationships are added.</p></div><span>{relationships.length}</span></div>{relationships.length ? <div className="family-tree" ref={familyTreeRef}><FamilyConnectors rootRef={familyTreeRef} version={`${relationships.map(item => `${item.id}:${item.type}`).join('|')}:${Object.keys(expandedRelationships).filter(id => expandedRelationships[Number(id)]).join(',')}`}/>
      {grandparentRelationships.length > 0 && <section className="family-generation family-generation-ancestors"><p className="family-level-label">Grandparents · 2 levels above</p><div className="family-generation-row family-couple-row">{grandparentRelationships.map((item,index) => <div className="family-couple-member" key={item.id}>{index > 0 && <span className="family-heart-connector" aria-label="Couple">♥</span>}{relationshipNode(item,false,'grandparent')}</div>)}</div></section>}
      {parentRelationships.length > 0 && <section className={`family-generation family-generation-parents ${grandparentRelationships.length ? 'connected-from-above' : ''}`}><p className="family-level-label">Parents · 1 level above</p>{grandparentRelationships.length > 0 && <FamilyBranch targets={parentRelationships.length}/>}<div className="family-generation-row family-couple-row">{parentRelationships.map((item,index) => <div className="family-couple-member" key={item.id}>{index > 0 && <span className="family-heart-connector" aria-label="Couple">♥</span>}{relationshipNode(item,false,'parent')}</div>)}</div></section>}
      <section className={`family-generation family-generation-current ${parentRelationships.length || grandparentRelationships.length ? 'connected-from-above' : ''}`}><p className="family-level-label">Your generation</p>{(parentRelationships.length > 0 || grandparentRelationships.length > 0) && <FamilyBranch targets={siblingRelationships.length + 1}/>}<div className="family-generation-row family-peer-row">{siblingRelationships.slice(0,Math.ceil(siblingRelationships.length / 2)).map(item => <div className="family-peer" key={item.id}>{relationshipNode(item,false,'sibling')}</div>)}<div className="family-self-family"><div className={`partnership-row ${spouseRelationships.length ? 'has-spouse' : ''}`}><article className={`self-node ${genderClass({gender:selfGender} as NetworkPerson)}`} data-tree-role="current"><PersonAvatar name={username} photo={selfPhoto} self/><div><strong>{username}</strong><small>You</small></div></article>{spouseRelationships.map(item => <div className="spouse-pair" key={item.id}><span className="partner-connector"><i>♥</i></span>{relationshipNode(item,true,'current-spouse')}</div>)}</div></div>{siblingRelationships.slice(Math.ceil(siblingRelationships.length / 2)).map(item => <div className="family-peer" key={item.id}>{relationshipNode(item,false,'sibling')}</div>)}</div></section>
      {childRelationships.length > 0 && <section className="family-generation family-generation-descendants connected-from-above"><p className="family-level-label">Children · 1 level below</p><FamilyBranch targets={childRelationships.length}/><div className="family-generation-row">{childRelationships.map(item => <div className="family-descendant" key={item.id}>{relationshipNode(item,false,'child')}</div>)}</div></section>}
      {grandchildRelationships.length > 0 && <section className="family-generation family-generation-descendants connected-from-above"><p className="family-level-label">Grandchildren · 2 levels below</p><FamilyBranch targets={grandchildRelationships.length}/><div className="family-generation-row">{grandchildRelationships.map(item => <div className="family-descendant" key={item.id}>{relationshipNode(item,false,'grandchild')}</div>)}</div></section>}
      {otherRelationships.length > 0 && <section className="family-other-connections"><p className="family-level-label">Other connections</p><div className="family-generation-row">{otherRelationships.map(item => <div className="family-peer" key={item.id}>{relationshipNode(item)}</div>)}</div></section>}
    </div> : <p className="circle-empty-state">Add someone above to start your family tree.</p>}</section>

    <section className="network-section circle-tree-section"><div className="section-heading"><div><p className="eyebrow">MY NETWORK MAP</p><h2>My circles</h2><p className="circle-summary">{ownedCircles.length} created by me · {circles.length - ownedCircles.length} added by others</p></div><span>{circles.length}</span></div><div className="circle-forest">{circles.map(circle => { const visibleMembers = circle.members.filter(member => !member.creator); return <article className="circle-tree" key={circle.id}>
      <div className="circle-root"><PersonAvatar name={circle.ownerName} photo={circle.ownerPhoto}/><div className="circle-root-copy"><h3>{circle.name}</h3><p>{circle.description || 'Private circle'}</p><small>{circle.ownedByCurrentUser ? 'Created by you' : `Created by ${circle.ownerName}`} · {circle.members.length} {circle.members.length === 1 ? 'member' : 'members'}{circle.currentUserAdmin ? ' · You are an admin' : ''}</small></div>{circle.currentUserAdmin && <button className="action-tag circle-edit-trigger" onClick={() => setEditingCircle({id:circle.id,name:circle.name,description:circle.description || ''})}>Edit circle</button>}</div>
      {editingCircle?.id === circle.id && <div className="circle-edit-panel"><label><span>Circle name</span><input required value={editingCircle.name} onChange={e => setEditingCircle({...editingCircle,name:e.target.value})}/></label><label><span>Description</span><textarea value={editingCircle.description} onChange={e => setEditingCircle({...editingCircle,description:e.target.value})}/></label><div><button className="action-tag action-tag-admin" disabled={busy || !editingCircle.name.trim()} onClick={saveCircleEdit}>Save</button><button className="action-tag action-tag-danger" disabled={busy} onClick={() => setEditingCircle(null)}>Cancel</button></div></div>}
      {visibleMembers.length > 0 && <div className="circle-branches">{visibleMembers.map(member => { const canHaveAdminRole = member.person.accountStatus === 'ACTIVE' && member.person.identityType !== 'MANAGED'; return <div className="circle-branch" key={member.person.id}><span className="branch-line" /><div className="circle-member-node"><PersonAvatar name={member.person.displayName} photo={member.person.profilePhoto}/><div className="circle-member-copy"><strong>{member.person.displayName}</strong><div className="member-status-tags"><PersonStatus person={member.person}/>{member.admin && canHaveAdminRole && <span className="status-tag status-admin">Admin</span>}</div></div>{circle.currentUserAdmin && <div className="member-admin-actions">{canHaveAdminRole && <button className="action-tag action-tag-admin" onClick={async () => { if (member.admin) await demoteCircleAdmin(circle.id, member.person.id); else await promoteCircleAdmin(circle.id, member.person.id); await refresh(); }}>{member.admin ? 'Remove admin' : 'Make admin'}</button>}<button className="action-tag action-tag-danger" onClick={async () => { await removeMemberFromMyCircle(circle.id, member.person.id); await refresh(); }}>Remove</button></div>}</div></div>; })}</div>}
    </article>; })}</div>{!circles.length && <p className="circle-empty-state">You have not created or joined any circles yet.</p>}</section>
  </main>;
}
