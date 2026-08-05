'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMemberToMyCircle, addMyRelationship, addPersonToMyNetwork, ApiError, createMyCircle, fetchMyCircles,
  fetchMyRelationships, fetchRelationshipTypes, fetchUserProfile, logout, NetworkCircle, NetworkPerson, NetworkRelationship,
  createCirclePost, fetchCircleAttachment, fetchCirclePosts, demoteCircleAdmin, promoteCircleAdmin, removeMemberFromMyCircle, removeMyRelationship, searchNetworkPeople, updateMyRelationship, updateMyCircle,
  fetchDirectMessages, sendDirectMessage, fetchDirectMessageAttachment } from '../lib/api';
import { startDirectCall, fetchIncomingCalls, fetchDirectCall, acceptDirectCall, rejectDirectCall, endDirectCall } from '../lib/api';
import type { CirclePost, CirclePostingPermission, DirectCall, DirectMessage, VisibilityScope } from '../lib/api';
import CountryPhoneInput from '../components/CountryPhoneInput';

const defaultRelationshipTypes = ['Friend', 'Spouse', 'Parent', 'Child', 'Sibling', 'Colleague', 'Relative', 'Other'];
const circleAttachmentLimit=25*1024*1024;
const circleAttachmentTypes=new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
const formatFileSize=(bytes:number)=>bytes>=1024*1024?`${(bytes/(1024*1024)).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
const waitForIceGathering=(connection:RTCPeerConnection)=>new Promise<void>(resolve=>{if(connection.iceGatheringState==='complete'){resolve();return;}const finish=()=>{connection.removeEventListener('icegatheringstatechange',check);resolve();};const check=()=>{if(connection.iceGatheringState==='complete')finish();};connection.addEventListener('icegatheringstatechange',check);window.setTimeout(finish,5000);});
const visibilityOptions: { value: VisibilityScope; label: string }[] = [
  { value: 'PUBLIC', label: 'Public' }, { value: 'FRIENDS', label: 'Friends' },
  { value: 'RELATIVES', label: 'Relatives' }, { value: 'COLLEAGUES', label: 'Colleagues' },
];

function CircleAttachment({post}:{post:CirclePost}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{let active=true;let objectUrl='';fetchCircleAttachment(post.circleId,post.id).then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(()=>setUrl(''));return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[post.circleId,post.id]);
  if(!post.attachmentUrl)return null;
  if(!url)return <span className="circle-attachment-loading">Loading attachment…</span>;
  if(post.attachmentType?.startsWith('image/'))return <a href={url} target="_blank" rel="noreferrer"><img className="circle-post-image" src={url} alt={post.attachmentName||'Circle photo'}/></a>;
  if(post.attachmentType?.startsWith('video/'))return <video className="circle-post-video" src={url} controls preload="metadata"/>;
  return <a className="circle-document" href={url} download={post.attachmentName||'attachment'}><span>▤</span><strong>{post.attachmentName||'Download document'}</strong></a>;
}
function DirectMessageAttachment({message,otherUserId}:{message:DirectMessage;otherUserId:number}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{let active=true;let objectUrl='';fetchDirectMessageAttachment(otherUserId,message.id).then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(()=>setUrl(''));return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[message.id,otherUserId]);
  if(!message.attachmentUrl)return null;
  if(!url)return <span className="circle-attachment-loading">Loading attachment…</span>;
  if(message.attachmentType?.startsWith('image/'))return <a href={url} target="_blank" rel="noreferrer"><img className="circle-post-image" src={url} alt={message.attachmentName||'Private message photo'}/></a>;
  if(message.attachmentType?.startsWith('video/'))return <video className="circle-post-video" src={url} controls preload="metadata"/>;
  return <a className="circle-document" href={url} download={message.attachmentName||'attachment'}><span>▤</span><strong>{message.attachmentName||'Download document'}</strong></a>;
}
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
  const [editingCircle, setEditingCircle] = useState<{ id: number; name: string; description: string; postingPermission: CirclePostingPermission } | null>(null);
  const [expandedCircles,setExpandedCircles]=useState<Record<number,boolean>>({});
  const [expandedCircleMembers,setExpandedCircleMembers]=useState<Record<number,boolean>>({});
  const [addingCircleMembers,setAddingCircleMembers]=useState<Record<number,boolean>>({});
  const [circleMemberQueries,setCircleMemberQueries]=useState<Record<number,string>>({});
  const [circlePosts,setCirclePosts]=useState<Record<number,CirclePost[]>>({});
  const [circleDrafts,setCircleDrafts]=useState<Record<number,string>>({});
  const [circleFiles,setCircleFiles]=useState<Record<number,File|undefined>>({});
  const [circleUploadProgress,setCircleUploadProgress]=useState<Record<number,number|undefined>>({});
  const [circleComposerErrors,setCircleComposerErrors]=useState<Record<number,string>>({});
  const [replyingTo,setReplyingTo]=useState<Record<number,CirclePost|undefined>>({});
  const [directChatPerson,setDirectChatPerson]=useState<NetworkPerson|null>(null);
  const [directMessages,setDirectMessages]=useState<DirectMessage[]>([]);
  const [directDraft,setDirectDraft]=useState('');
  const [directFile,setDirectFile]=useState<File|undefined>();
  const [directUploadProgress,setDirectUploadProgress]=useState<number|undefined>();
  const [directChatError,setDirectChatError]=useState('');
  const [directChatLoading,setDirectChatLoading]=useState(false);
  const [directCall,setDirectCall]=useState<DirectCall|null>(null);
  const [directCallPerson,setDirectCallPerson]=useState<NetworkPerson|null>(null);
  const [directCallPhase,setDirectCallPhase]=useState<'idle'|'preparing'|'ringing'|'incoming'|'connected'>('idle');
  const [directCallError,setDirectCallError]=useState('');
  const [localCallStream,setLocalCallStream]=useState<MediaStream|null>(null);
  const [remoteCallStream,setRemoteCallStream]=useState<MediaStream|null>(null);
  const callConnectionRef=useRef<RTCPeerConnection|null>(null);
  const localVideoRef=useRef<HTMLVideoElement|null>(null);
  const remoteVideoRef=useRef<HTMLVideoElement|null>(null);
  const remoteAudioRef=useRef<HTMLAudioElement|null>(null);
  const [inviteMobile, setInviteMobile] = useState('');
  const [communication, setCommunication] = useState<{ name: string; mobile: string; email: string; relationship: string; ownerName: string; existing: boolean } | null>(null);
  const [addingRelativeTo, setAddingRelativeTo] = useState<NetworkPerson | null>(null);
  const [message, setMessage] = useState('Search by person name, surname, mobile number, or location.');
  const [busy, setBusy] = useState(false);
  const [treeView, setTreeView] = useState<'modern' | 'heritage' | 'compact'>('modern');

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
  useEffect(() => { const saved = window.localStorage.getItem('circlenet-family-view'); if (saved === 'modern' || saved === 'heritage' || saved === 'compact') setTreeView(saved); }, []);
  useEffect(()=>{if(directCall)return;let active=true;const check=async()=>{try{const incoming=await fetchIncomingCalls();if(active&&incoming.length){const call=incoming[0];setDirectCall(call);setDirectCallPerson({id:call.callerId,displayName:call.callerName,accountStatus:'ACTIVE',profilePhoto:call.callerPhoto,identityType:'ACCOUNT'});setDirectCallPhase('incoming');}}catch{}};void check();const timer=window.setInterval(check,3000);return()=>{active=false;window.clearInterval(timer);};},[directCall]);
  useEffect(()=>{if(localVideoRef.current)localVideoRef.current.srcObject=localCallStream;},[localCallStream,directCallPhase]);
  useEffect(()=>{if(remoteVideoRef.current)remoteVideoRef.current.srcObject=remoteCallStream;if(remoteAudioRef.current)remoteAudioRef.current.srcObject=remoteCallStream;},[remoteCallStream,directCallPhase]);
  useEffect(()=>{if(!directCall||!directCall.currentUserCaller||directCall.status!=='RINGING')return;let active=true;const check=async()=>{try{const current=await fetchDirectCall(directCall.id);if(!active)return;setDirectCall(current);if(current.status==='ACCEPTED'&&current.answerSdp){await callConnectionRef.current?.setRemoteDescription(JSON.parse(current.answerSdp));setDirectCallPhase('connected');}else if(current.status==='REJECTED'||current.status==='ENDED'){setDirectCallError(current.status==='REJECTED'?'Call declined.':'Call ended.');void closeDirectCall(false);}}catch(error){if(active)setDirectCallError(errorMessage(error));}};const timer=window.setInterval(check,2000);return()=>{active=false;window.clearInterval(timer);};},[directCall?.id,directCall?.status,directCall?.currentUserCaller]);
  const selectTreeView = (view: 'modern' | 'heritage' | 'compact') => { setTreeView(view); window.localStorage.setItem('circlenet-family-view',view); };

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
    const relationshipOwnerName = addingRelativeTo?.displayName || username;
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
      setCommunication(identityType === 'ACCOUNT' ? { name: fullNameToAdd.trim() || relationship.person.displayName, mobile: mobileToAdd.trim(), email: emailToAdd.trim(), relationship: directRelationshipType, ownerName: relationshipOwnerName, existing } : null);
      setMobileToAdd('');
      setFullNameToAdd('');
      setEmailToAdd('');
      setDirectRelationshipType('');
      setDirectVisibility('');
      setDirectCompany('');
      setManagedDateOfBirth(''); setManagedDateOfDeath(''); setManagedNotes('');
      setAddingRelativeTo(null);
      setMessage(identityType === 'MANAGED'
        ? `${relationship.person.displayName} was added as ${relationshipOwnerName}'s ${directRelationshipType.toLowerCase()}. It can be used in relationships and circles but cannot sign in.`
        : existing
        ? `${relationship.person.displayName} already exists. Only the ${directRelationshipType.toLowerCase()} relationship to ${relationshipOwnerName} was added—no duplicate user was created.`
        : `${relationship.person.displayName} was added as ${relationshipOwnerName}'s ${directRelationshipType.toLowerCase()}. Send the registration invitation so they can claim the account.`);
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
    return `Hello ${target.name}, ${target.ownerName} ${action} on CircleNet-AI. Please log in to the application and create your own circles: ${window.location.origin}/auth`;
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
      await updateMyCircle(editingCircle.id, editingCircle.name, editingCircle.description,editingCircle.postingPermission);
      setEditingCircle(null);
      await refresh();
      setMessage('Circle information updated successfully.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const toggleCircle=async(circleId:number)=>{const opening=!expandedCircles[circleId];setExpandedCircles(current=>({...current,[circleId]:opening}));if(opening){try{const loaded=await fetchCirclePosts(circleId);setCirclePosts(current=>({...current,[circleId]:loaded}));}catch(error){setMessage(errorMessage(error));}}};
  const selectCircleFile=(circleId:number,file?:File)=>{setCircleComposerErrors(current=>({...current,[circleId]:''}));if(!file){setCircleFiles(current=>({...current,[circleId]:undefined}));return;}if(file.size>circleAttachmentLimit){setCircleFiles(current=>({...current,[circleId]:undefined}));setCircleComposerErrors(current=>({...current,[circleId]:`${file.name} is ${formatFileSize(file.size)}. Maximum attachment size is 25 MB.`}));return;}if(!circleAttachmentTypes.has(file.type)){setCircleFiles(current=>({...current,[circleId]:undefined}));setCircleComposerErrors(current=>({...current,[circleId]:`“${file.name}” is not a supported file type. Choose a JPG, PNG, WebP, MP4, WebM, PDF, Office document, or text file.`}));return;}setCircleFiles(current=>({...current,[circleId]:file}));};
  const sendCirclePost=async(circleId:number)=>{const draft=circleDrafts[circleId]||'';const file=circleFiles[circleId];setCircleComposerErrors(current=>({...current,[circleId]:''}));if(!draft.trim()&&!file){setCircleComposerErrors(current=>({...current,[circleId]:'Write a message or choose a file before posting.'}));return;}setBusy(true);if(file)setCircleUploadProgress(current=>({...current,[circleId]:0}));try{await createCirclePost(circleId,draft,file,replyingTo[circleId]?.id,file?percentage=>setCircleUploadProgress(current=>({...current,[circleId]:percentage})):undefined);setCircleDrafts(current=>({...current,[circleId]:''}));setCircleFiles(current=>({...current,[circleId]:undefined}));setReplyingTo(current=>({...current,[circleId]:undefined}));const loaded=await fetchCirclePosts(circleId);setCirclePosts(current=>({...current,[circleId]:loaded}));}catch(error){setCircleComposerErrors(current=>({...current,[circleId]:errorMessage(error)}));}finally{setBusy(false);setCircleUploadProgress(current=>({...current,[circleId]:undefined}));}};
  const refreshCirclePosts=async(circleId:number)=>{try{const loaded=await fetchCirclePosts(circleId);setCirclePosts(current=>({...current,[circleId]:loaded}));}catch(error){setMessage(errorMessage(error));}};
  const openDirectChat=async(person:NetworkPerson)=>{setDirectChatPerson(person);setDirectMessages([]);setDirectDraft('');setDirectFile(undefined);setDirectUploadProgress(undefined);setDirectChatError('');setDirectChatLoading(true);try{setDirectMessages(await fetchDirectMessages(person.id));}catch(error){setDirectChatError(errorMessage(error));}finally{setDirectChatLoading(false);}};
  const chooseDirectFile=(file?:File)=>{setDirectChatError('');if(!file){setDirectFile(undefined);return;}if(file.size>circleAttachmentLimit){setDirectFile(undefined);setDirectChatError(`${file.name} is ${formatFileSize(file.size)}. Maximum attachment size is 25 MB.`);return;}if(!circleAttachmentTypes.has(file.type)){setDirectFile(undefined);setDirectChatError(`“${file.name}” is not a supported file type. Choose an image, video, PDF, Office document, or text file.`);return;}setDirectFile(file);};
  const submitDirectMessage=async()=>{if(!directChatPerson)return;setDirectChatError('');if(!directDraft.trim()&&!directFile){setDirectChatError('Write a message or choose a file before sending.');return;}setBusy(true);if(directFile)setDirectUploadProgress(0);try{await sendDirectMessage(directChatPerson.id,directDraft,directFile,directFile?setDirectUploadProgress:undefined);setDirectDraft('');setDirectFile(undefined);setDirectMessages(await fetchDirectMessages(directChatPerson.id));}catch(error){setDirectChatError(errorMessage(error));}finally{setBusy(false);setDirectUploadProgress(undefined);}};
  const createCallConnection=(stream:MediaStream)=>{const connection=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});stream.getTracks().forEach(track=>connection.addTrack(track,stream));connection.ontrack=event=>setRemoteCallStream(event.streams[0]||new MediaStream([event.track]));connection.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(connection.connectionState))setDirectCallError('Call connection was interrupted.');};callConnectionRef.current=connection;return connection;};
  const beginDirectCall=async(person:NetworkPerson,type:'AUDIO'|'VIDEO')=>{setDirectCallPerson(person);setDirectCallPhase('preparing');setDirectCallError('');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==='VIDEO'});setLocalCallStream(stream);const connection=createCallConnection(stream);await connection.setLocalDescription(await connection.createOffer());await waitForIceGathering(connection);const call=await startDirectCall(person.id,type,JSON.stringify(connection.localDescription));setDirectCall(call);setDirectCallPhase('ringing');}catch(error){setDirectCallError(error instanceof DOMException&&error.name==='NotAllowedError'?'Microphone or camera permission was denied. Allow access in your browser and try again.':errorMessage(error));setDirectCallPhase('idle');localCallStream?.getTracks().forEach(track=>track.stop());}};
  const answerIncomingCall=async()=>{if(!directCall)return;setDirectCallError('');setDirectCallPhase('preparing');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:directCall.callType==='VIDEO'});setLocalCallStream(stream);const connection=createCallConnection(stream);await connection.setRemoteDescription(JSON.parse(directCall.offerSdp));await connection.setLocalDescription(await connection.createAnswer());await waitForIceGathering(connection);setDirectCall(await acceptDirectCall(directCall.id,JSON.stringify(connection.localDescription)));setDirectCallPhase('connected');}catch(error){setDirectCallError(error instanceof DOMException&&error.name==='NotAllowedError'?'Microphone or camera permission was denied. Allow access in your browser and try again.':errorMessage(error));setDirectCallPhase('incoming');}};
  const closeDirectCall=async(notify=true)=>{const call=directCall;if(notify&&call){try{await endDirectCall(call.id);}catch{}}callConnectionRef.current?.close();callConnectionRef.current=null;localCallStream?.getTracks().forEach(track=>track.stop());remoteCallStream?.getTracks().forEach(track=>track.stop());setLocalCallStream(null);setRemoteCallStream(null);setDirectCall(null);setDirectCallPerson(null);setDirectCallPhase('idle');};
  const declineIncomingCall=async()=>{if(directCall)try{await rejectDirectCall(directCall.id);}finally{await closeDirectCall(false);}};
  const addRelationshipToCircle=async(circleId:number,person:NetworkPerson)=>{setBusy(true);try{await addMemberToMyCircle(circleId,person.id);await refresh();setMessage(`${person.displayName} was added to the circle.`);}catch(error){setMessage(errorMessage(error));}finally{setBusy(false);}};

  const renderCircle=(circle:NetworkCircle)=>{const visibleMembers=circle.members.filter(member=>!member.creator);const expanded=Boolean(expandedCircles[circle.id]);const membersExpanded=Boolean(expandedCircleMembers[circle.id]);const uploadProgress=circleUploadProgress[circle.id];const posts=circlePosts[circle.id]||[];const rootPosts=posts.filter(post=>!post.parentPostId);const memberIds=new Set(circle.members.map(member=>member.person.id));const memberQuery=(circleMemberQueries[circle.id]||'').trim().toLowerCase();const availablePeople=relationships.map(relationship=>relationship.person).filter((person,index,all)=>!memberIds.has(person.id)&&all.findIndex(candidate=>candidate.id===person.id)===index&&(!memberQuery||person.displayName.toLowerCase().includes(memberQuery)));return <article className={`circle-tree circle-card-compact ${expanded?'is-expanded':''}`} key={circle.id}>
    <div className="circle-root" role="button" tabIndex={0} onClick={event=>{if(!(event.target as HTMLElement).closest('button,input,textarea,label'))void toggleCircle(circle.id);}} onKeyDown={event=>{if(event.key==='Enter')void toggleCircle(circle.id);}}><PersonAvatar name={circle.ownerName} photo={circle.ownerPhoto}/><div className="circle-root-copy"><h3>{circle.name}</h3><p>{circle.description||'Private circle'}</p><small>{circle.ownedByCurrentUser?'Created by you':`Created by ${circle.ownerName}`} · {circle.members.length} {circle.members.length===1?'member':'members'} · {circle.postingPermission==='ADMINS_ONLY'?'Admins post':'All members post'}</small></div><div className="circle-root-actions">{circle.currentUserAdmin&&<button className="action-tag circle-edit-trigger" onClick={()=>setEditingCircle(current=>current?.id===circle.id?null:{id:circle.id,name:circle.name,description:circle.description||'',postingPermission:circle.postingPermission||'ALL_MEMBERS'})}>{editingCircle?.id===circle.id?'Close settings':'Circle settings'}</button>}<button className="action-tag action-tag-admin" onClick={()=>setExpandedCircleMembers(current=>({...current,[circle.id]:!current[circle.id]}))}>{membersExpanded?`Close members`:`Members (${circle.members.length})`}</button><button className="action-tag action-tag-admin" onClick={()=>void toggleCircle(circle.id)}>{expanded?'Close':'Open circle'}</button></div></div>
    {editingCircle?.id===circle.id&&<div className="circle-edit-panel"><label><span>Circle name</span><input required value={editingCircle.name} onChange={event=>setEditingCircle({...editingCircle,name:event.target.value})}/></label><label><span>Description</span><textarea value={editingCircle.description} onChange={event=>setEditingCircle({...editingCircle,description:event.target.value})}/></label><fieldset className="circle-posting-setting"><legend>Who can post messages?</legend><label><input type="radio" name={`posting-${circle.id}`} checked={editingCircle.postingPermission==='ALL_MEMBERS'} onChange={()=>setEditingCircle({...editingCircle,postingPermission:'ALL_MEMBERS'})}/><span>All members</span></label><label><input type="radio" name={`posting-${circle.id}`} checked={editingCircle.postingPermission==='ADMINS_ONLY'} onChange={()=>setEditingCircle({...editingCircle,postingPermission:'ADMINS_ONLY'})}/><span>Only admins</span></label></fieldset><div><button className="action-tag action-tag-admin" disabled={busy||!editingCircle.name.trim()} onClick={saveCircleEdit}>Save</button><button className="action-tag action-tag-danger" disabled={busy} onClick={()=>setEditingCircle(null)}>Cancel</button></div></div>}
    {expanded&&<div className="circle-expanded-content"><section className="circle-conversation"><div className="circle-conversation-heading"><div><h4>Circle conversation</h4><span>{posts.length} {posts.length===1?'message':'messages'}</span></div><button className="action-tag action-tag-admin" onClick={()=>void refreshCirclePosts(circle.id)}>Refresh</button></div>{circle.currentUserCanPost?<div className="circle-composer">{replyingTo[circle.id]&&<div className="circle-replying">Replying to <strong>{replyingTo[circle.id]!.authorName}</strong><button onClick={()=>setReplyingTo(current=>({...current,[circle.id]:undefined}))}>×</button></div>}<textarea value={circleDrafts[circle.id]||''} onChange={event=>setCircleDrafts(current=>({...current,[circle.id]:event.target.value}))} placeholder="Write a message to everyone in this circle…" maxLength={4000}/><div><label className="action-tag action-tag-admin circle-file-button"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={event=>{selectCircleFile(circle.id,event.target.files?.[0]);event.currentTarget.value='';}}/>Attach file</label>{circleFiles[circle.id]&&<span className="circle-selected-file">{circleFiles[circle.id]!.name} · {formatFileSize(circleFiles[circle.id]!.size)}</span>}<span className="circle-file-limit">Maximum 25 MB</span>{uploadProgress!==undefined&&<span className="circle-upload-progress" style={{background:`conic-gradient(#705bd1 ${uploadProgress*3.6}deg,#e8e2f4 0deg)`}}><strong>{uploadProgress}%</strong></span>}<button className="btn btn-primary" disabled={busy} onClick={()=>void sendCirclePost(circle.id)}>Post</button>{circleComposerErrors[circle.id]&&<p className="circle-composer-error" role="alert">{circleComposerErrors[circle.id]}</p>}</div></div>:<p className="circle-post-restricted">Only circle admins can post. You can still read messages in this circle.</p>}<div className="circle-post-list">{rootPosts.map(post=><article className={`circle-post ${post.currentUserAuthor?'mine':''}`} key={post.id}><header><PersonAvatar name={post.authorName} photo={post.authorPhoto}/><div><strong>{post.authorName}</strong><time>{new Date(post.createdAt).toLocaleString()}</time></div></header>{post.message&&<p>{post.message}</p>}<CircleAttachment post={post}/>{circle.currentUserCanPost&&<button className="circle-reply-button" onClick={()=>setReplyingTo(current=>({...current,[circle.id]:post}))}>Reply</button>}<div className="circle-replies">{posts.filter(reply=>reply.parentPostId===post.id).map(reply=><article className="circle-post-reply" key={reply.id}><header><PersonAvatar name={reply.authorName} photo={reply.authorPhoto}/><div><strong>{reply.authorName}</strong><time>{new Date(reply.createdAt).toLocaleString()}</time></div></header>{reply.message&&<p>{reply.message}</p>}<CircleAttachment post={reply}/></article>)}</div></article>)}{!posts.length&&<p className="circle-no-posts">No messages yet. Start the conversation.</p>}</div></section>{membersExpanded&&<section className="circle-members-compact is-open"><div className="circle-members-heading"><button type="button" onClick={()=>setExpandedCircleMembers(current=>({...current,[circle.id]:!membersExpanded}))}><span>Members <strong>{circle.members.length}</strong></span><i>{membersExpanded?'▴':'▾'}</i></button>{circle.currentUserAdmin&&<button type="button" className="action-tag action-tag-admin" onClick={()=>{setAddingCircleMembers(current=>({...current,[circle.id]:!current[circle.id]}));setExpandedCircleMembers(current=>({...current,[circle.id]:true}));}}>+ Add member</button>}</div>{circle.currentUserAdmin&&addingCircleMembers[circle.id]&&<div className="circle-add-member-panel"><input type="search" value={circleMemberQueries[circle.id]||''} onChange={event=>setCircleMemberQueries(current=>({...current,[circle.id]:event.target.value}))} placeholder="Search your relationships…"/><div>{availablePeople.map(person=><button type="button" key={person.id} disabled={busy} onClick={()=>void addRelationshipToCircle(circle.id,person)}><PersonAvatar name={person.displayName} photo={person.profilePhoto}/><span>{person.displayName}</span><strong>Add</strong></button>)}{!availablePeople.length&&<p>No matching relationships available to add.</p>}</div></div>}{membersExpanded&&<div className="circle-member-list">{visibleMembers.map(member=>{const canHaveAdminRole=member.person.accountStatus==='ACTIVE'&&member.person.identityType!=='MANAGED';return <article className="circle-member-node" key={member.person.id}><PersonAvatar name={member.person.displayName} photo={member.person.profilePhoto}/><div className="circle-member-copy"><strong>{member.person.displayName}</strong><div className="member-status-tags"><PersonStatus person={member.person}/>{member.admin&&canHaveAdminRole&&<span className="status-tag status-admin">Admin</span>}</div></div>{circle.currentUserAdmin&&<div className="member-admin-actions">{canHaveAdminRole&&<button className="action-tag action-tag-admin" onClick={async()=>{if(member.admin)await demoteCircleAdmin(circle.id,member.person.id);else await promoteCircleAdmin(circle.id,member.person.id);await refresh();}}>{member.admin?'Remove admin':'Make admin'}</button>}<button className="action-tag action-tag-danger" onClick={async()=>{await removeMemberFromMyCircle(circle.id,member.person.id);await refresh();}}>Remove</button></div>}</article>;})}</div>}</section>}</div>}
  </article>;};

  const directRelationships = relationships.filter(item => !item.relativeToUserId);
  const spouseRelationships = directRelationships.filter(item => ['spouse','husband','wife'].includes(relationKey(item)));
  const grandparentRelationships = directRelationships.filter(item => ['grandparent','grandfather','grandmother'].includes(relationKey(item)));
  const parentRelationships = directRelationships.filter(item => ['parent','father','mother'].includes(relationKey(item)));
  const siblingRelationships = directRelationships.filter(item => ['sibling','brother','sister'].includes(relationKey(item)));
  const childRelationships = directRelationships.filter(item => ['child','son','daughter'].includes(relationKey(item)));
  const grandchildRelationships = directRelationships.filter(item => ['grandchild','grandson','granddaughter'].includes(relationKey(item)));
  const familyIds = new Set([...spouseRelationships,...grandparentRelationships,...parentRelationships,...siblingRelationships,...childRelationships,...grandchildRelationships].map(item => item.id));
  const otherRelationships = directRelationships.filter(item => !familyIds.has(item.id));
  const anchoredNonSpouseRelationships = relationships.filter(item => item.relativeToUserId && !['spouse','husband','wife','child','son','daughter'].includes(relationKey(item)));
  const anchoredRelationshipGroups = Array.from(new Set(anchoredNonSpouseRelationships.map(item => item.relativeToUserId!))).map(ownerId => ({
    owner: relationships.find(item => item.person.id === ownerId)?.person,
    relationships: anchoredNonSpouseRelationships.filter(item => item.relativeToUserId === ownerId),
  })).filter(group => group.owner);
  const ownedCircles = circles.filter(circle => circle.ownedByCurrentUser);
  const administeredCircles = circles.filter(circle => circle.currentUserAdmin);

  const relationshipNode = (item: NetworkRelationship, paired = false, treeRole = '') => {
    const nodeRelations = relationships.filter(relationship => relationship.relativeToUserId === item.person.id && !['spouse','husband','wife'].includes(relationKey(relationship)));
    const availableCircles = administeredCircles.filter(circle => !circle.members.some(member => member.person.id === item.person.id));
    const allCirclesContainPerson = administeredCircles.length > 0 && availableCircles.length === 0;
    const circleQuery = (circleSearch[item.id] || '').trim().toLowerCase();
    const filteredCircles = administeredCircles.filter(circle => !circleQuery || circle.name.toLowerCase().includes(circleQuery));
    const expanded = Boolean(expandedRelationships[item.id]) || editingRelationship?.id === item.id;
    const toggleExpanded = () => setExpandedRelationships(current => ({...current,[item.id]:!current[item.id]}));
    return <article className={`relationship-node relationship-node-compact ${expanded ? 'is-expanded' : ''} ${paired ? 'spouse-node' : ''} ${genderClass(item.person, item.type)}`} key={item.id} data-tree-role={treeRole || undefined} tabIndex={0} aria-label={`${item.person.displayName}, ${item.type}. Click to ${expanded ? 'collapse' : 'show details'}.`} onClick={event => { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea,summary')) toggleExpanded(); }} onKeyDown={event => { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea,summary') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggleExpanded(); } }}>
    <span className="compact-relationship-label">{item.type}</span><div className="relationship-node-main"><PersonAvatar name={item.person.displayName} photo={item.person.profilePhoto}/><div className="relationship-identity"><strong>{item.person.displayName}</strong><div className="private-contact-display">{item.contactPhone && <span><i aria-hidden="true">☎</i>{item.contactPhone}</span>}{item.contactEmail && <span><i aria-hidden="true">✉</i>{item.contactEmail}</span>}</div><div><span className="relationship-badge">{item.type}</span><span className="status-tag status-view">{visibilityOptions.find(option => option.value === item.visibilityScope)?.label || 'Friends'}{item.visibilityCompany ? ` · ${item.visibilityCompany}` : ''}</span><PersonStatus person={item.person}/></div></div><div className="relationship-actions"><button className="action-tag action-tag-admin" onClick={() => setEditingRelationship({ id:item.id, contactName:item.person.displayName, contactPhone:item.contactPhone || '', contactEmail:item.contactEmail || '', type:item.type, visibilityScope:item.visibilityScope || 'FRIENDS', visibilityCompany:item.visibilityCompany || '' })}>Edit</button><button className="action-tag action-tag-danger" onClick={async () => { await removeMyRelationship(item.id); await refresh(); }}>Remove</button></div></div>
    {editingRelationship?.id === item.id && <div className="relationship-edit-panel"><label><span>Person name</span><input required value={editingRelationship.contactName} onChange={e => setEditingRelationship({...editingRelationship,contactName:e.target.value})}/></label><label><span>Mobile number</span><CountryPhoneInput value={editingRelationship.contactPhone} onChange={contactPhone => setEditingRelationship({...editingRelationship,contactPhone})} placeholder="Private contact mobile"/></label><label><span>Email address</span><input type="email" value={editingRelationship.contactEmail} onChange={e => setEditingRelationship({...editingRelationship,contactEmail:e.target.value})} placeholder="Private contact email"/></label><label><span>Relationship</span><SearchableSelect value={editingRelationship.type} placeholder="Relation" options={relationshipTypes} onChange={type => setEditingRelationship({...editingRelationship,type})}/></label><label><span>View</span><SearchableSelect value={visibilityLabel(editingRelationship.visibilityScope)} placeholder="View" options={visibilityLabels} onChange={label => setEditingRelationship({...editingRelationship,visibilityScope:visibilityValue(label) as VisibilityScope})}/></label>{editingRelationship.visibilityScope === 'COLLEAGUES' && <label><span>Company</span><SearchableSelect value={editingRelationship.visibilityCompany} placeholder="Company" options={employmentCompanies} onChange={visibilityCompany => setEditingRelationship({...editingRelationship,visibilityCompany})}/></label>}<p className="private-contact-note">Mobile and email are private to your relationship record and are never shown to other users.</p><div className="relationship-edit-actions"><button type="button" className="action-tag action-tag-admin" disabled={busy || !editingRelationship.contactName.trim()} onClick={saveRelationshipEdit}>Save</button><button type="button" className="action-tag action-tag-danger" disabled={busy} onClick={() => setEditingRelationship(null)}>Cancel</button></div></div>}
    <div className="relationship-bottom-actions">{item.person.accountStatus==='ACTIVE'&&item.person.identityType!=='MANAGED'&&<details className="direct-connect-menu"><summary className="action-tag action-tag-message">Connect</summary><div><button type="button" onClick={event=>{void openDirectChat(item.person);event.currentTarget.closest('details')?.removeAttribute('open');}}><span>✉</span>Text message</button><button type="button" onClick={event=>{void beginDirectCall(item.person,'AUDIO');event.currentTarget.closest('details')?.removeAttribute('open');}}><span>☎</span>Audio call</button><button type="button" onClick={event=>{void beginDirectCall(item.person,'VIDEO');event.currentTarget.closest('details')?.removeAttribute('open');}}><span>▣</span>Video call</button></div></details>}<button className="action-tag action-tag-admin" onClick={() => { setAddingRelativeTo(item.person); document.getElementById('add-network-person')?.scrollIntoView({behavior:'smooth',block:'center'}); }}>+ Relation</button><details className="circle-picker"><summary className={`action-tag action-tag-admin ${!administeredCircles.length || allCirclesContainPerson ? 'disabled' : ''}`}>{allCirclesContainPerson ? '✓ In all circles' : 'Add to circle'}</summary><div className="circle-picker-menu"><input className="circle-picker-search" type="search" value={circleSearch[item.id] || ''} onChange={e => setCircleSearch({...circleSearch,[item.id]:e.target.value})} placeholder="Search circles…" aria-label="Search circles"/>{filteredCircles.map(circle => { const alreadyAdded = circle.members.some(member => member.person.id === item.person.id); return <button type="button" className={alreadyAdded ? 'circle-already-added' : ''} key={circle.id} disabled={busy || alreadyAdded} onClick={event => { void addToCircle(item.person, circle.id); event.currentTarget.closest('details')?.removeAttribute('open'); }}><span>{circle.name}</span>{alreadyAdded && <strong aria-label="Already in this circle">✓ Added</strong>}</button>; })}{!administeredCircles.length && <span>No circles you administer</span>}{administeredCircles.length > 0 && filteredCircles.length === 0 && <span>No matching circles</span>}</div></details></div>
    {expanded && nodeRelations.length > 0 && <div className="node-relative-list"><strong>Relations of {item.person.displayName}</strong>{nodeRelations.map(relation => <div key={relation.id}><PersonAvatar name={relation.person.displayName} photo={relation.person.profilePhoto}/><span>{relation.person.displayName}<small>{relation.type}</small></span><button type="button" className="action-tag action-tag-admin" onClick={() => { setAddingRelativeTo(relation.person); document.getElementById('add-network-person')?.scrollIntoView({behavior:'smooth',block:'center'}); }}>+ Relation</button></div>)}</div>}
  </article>;
  };

  const relationshipUnit = (item: NetworkRelationship, treeRole = '') => {
    const anchoredSpouses = relationships.filter(relationship => relationship.relativeToUserId === item.person.id && ['spouse','husband','wife'].includes(relationKey(relationship)));
    return <div className={`anchored-partnership ${anchoredSpouses.length ? 'has-anchored-spouse' : ''}`}>{relationshipNode(item,false,treeRole)}{anchoredSpouses.map(spouse => <div className="spouse-pair anchored-spouse" key={spouse.id}><span className="partner-connector"><i>♥</i></span>{relationshipNode(spouse,true)}</div>)}</div>;
  };

  const anchoredChildren = (ownerId: number) => relationships.filter(relationship => relationship.relativeToUserId === ownerId && ['child','son','daughter'].includes(relationKey(relationship)));
  const descendantTree = (children: NetworkRelationship[], depth = 0): ReactNode => children.length ? <div className={`lineage-descendants lineage-depth-${Math.min(depth,3)}`}><div className="lineage-children">{children.map(child => <div className="lineage-child" key={child.id}>{relationshipUnit(child)}{descendantTree(anchoredChildren(child.person.id),depth + 1)}</div>)}</div></div> : null;
  const siblingHousehold = (item: NetworkRelationship) => <div className="family-household" key={item.id}><div className="household-couple">{relationshipUnit(item,'sibling')}</div>{descendantTree(anchoredChildren(item.person.id))}</div>;

  const graphLevelDelta = (type: string) => {
    const key = type.trim().toLowerCase().replace(/[\s_-]+/g,'');
    if (['grandparent','grandfather','grandmother'].includes(key)) return -2;
    if (['parent','father','mother'].includes(key)) return -1;
    if (['child','son','daughter'].includes(key)) return 1;
    if (['grandchild','grandson','granddaughter'].includes(key)) return 2;
    return 0;
  };
  const selfGraphId = -1;
  // Older relationship rows were created before a relation could be anchored to
  // another person. Recover the missing parent anchor for the family graph only:
  // e.g. an additional direct Mother belongs with a direct Father who already
  // has a recorded father but no recorded mother.
  const effectiveGraphAnchors = new Map<number,number | null>(relationships.map(relationship => [relationship.id,relationship.relativeToUserId || null]));
  const directParentRelationships = relationships.filter(relationship => !relationship.relativeToUserId && ['parent','father','mother'].includes(relationKey(relationship)));
  const usedLegacyParentAnchors = new Set<number>();
  const inferLegacyParentAnchors = (extras: NetworkRelationship[],presentType: 'father' | 'mother',missingType: 'father' | 'mother') => {
    extras.forEach(extra => {
      const candidate = directParentRelationships.find(parent => {
        if (parent.id===extra.id || usedLegacyParentAnchors.has(parent.person.id)) return false;
        const anchoredParents=relationships.filter(relationship => relationship.relativeToUserId===parent.person.id && ['father','mother'].includes(relationKey(relationship)));
        return anchoredParents.some(relationship => relationKey(relationship)===presentType) && !anchoredParents.some(relationship => relationKey(relationship)===missingType);
      });
      if (candidate) { effectiveGraphAnchors.set(extra.id,candidate.person.id); usedLegacyParentAnchors.add(candidate.person.id); }
    });
  };
  const directFathers=directParentRelationships.filter(relationship => relationKey(relationship)==='father');
  const directMothers=directParentRelationships.filter(relationship => relationKey(relationship)==='mother');
  inferLegacyParentAnchors(directMothers.slice(1),'father','mother');
  inferLegacyParentAnchors(directFathers.slice(1),'mother','father');
  const graphAnchor = (relationship: NetworkRelationship) => effectiveGraphAnchors.get(relationship.id) || selfGraphId;
  const graphLevels = new Map<number,number>([[selfGraphId,0]]);
  relationships.filter(relationship => graphAnchor(relationship)===selfGraphId).forEach(relationship => graphLevels.set(relationship.person.id,graphLevelDelta(relationship.type)));
  for (let pass=0; pass<relationships.length + 2; pass++) relationships.forEach(relationship => {
    const ownerId=graphAnchor(relationship);
    if (ownerId===selfGraphId || graphLevels.has(relationship.person.id) && graphLevels.has(ownerId)) return;
    const ownerLevel = graphLevels.get(ownerId);
    if (ownerLevel !== undefined) graphLevels.set(relationship.person.id,ownerLevel + graphLevelDelta(relationship.type));
  });
  relationships.forEach(relationship => { if (!graphLevels.has(relationship.person.id)) graphLevels.set(relationship.person.id,0); });
  const graphPeople = [{ id:selfGraphId, name:username, photo:selfPhoto, self:true, relationship:null as NetworkRelationship | null },...relationships.map(relationship => ({ id:relationship.person.id,name:relationship.person.displayName,photo:relationship.person.profilePhoto || null,self:false,relationship }))];
  const uniqueGraphPeople = Array.from(new Map(graphPeople.map(person => [person.id,person])).values());
  const minGraphLevel = Math.min(...Array.from(graphLevels.values()));
  const maxGraphLevel = Math.max(...Array.from(graphLevels.values()));
  const graphNodeWidth = treeView === 'compact' ? 112 : 142;
  const spouseGap = treeView === 'compact' ? 18 : 24;
  const householdGap = treeView === 'compact' ? 38 : 70;
  const graphLevelHeight = treeView === 'compact' ? 122 : 152;
  const peopleByLevel = new Map<number,typeof uniqueGraphPeople>();
  uniqueGraphPeople.forEach(person => { const level=graphLevels.get(person.id) || 0; peopleByLevel.set(level,[...(peopleByLevel.get(level)||[]),person]); });
  const spouseRelationshipsForGraph = relationships.filter(relationship => ['spouse','husband','wife'].includes(relationKey(relationship)));
  const parentRelationshipGroups = new Map<number,NetworkRelationship[]>();
  relationships.filter(relationship => ['parent','father','mother'].includes(relationKey(relationship))).forEach(relationship => { const childId=graphAnchor(relationship); parentRelationshipGroups.set(childId,[...(parentRelationshipGroups.get(childId)||[]),relationship]); });
  const inferredCouples:{source:number;target:number}[]=[];
  parentRelationshipGroups.forEach(parents => { const fathers=parents.filter(parent => ['father'].includes(relationKey(parent))); const mothers=parents.filter(parent => ['mother'].includes(relationKey(parent))); fathers.forEach((father,index) => { const mother=mothers[Math.min(index,mothers.length-1)]; if(mother) inferredCouples.push({source:father.person.id,target:mother.person.id}); }); });
  const spouseNeighbours = new Map<number,number[]>();
  spouseRelationshipsForGraph.forEach(relationship => { const source=graphAnchor(relationship),target=relationship.person.id; spouseNeighbours.set(source,[...(spouseNeighbours.get(source)||[]),target]); spouseNeighbours.set(target,[...(spouseNeighbours.get(target)||[]),source]); });
  inferredCouples.forEach(couple => { spouseNeighbours.set(couple.source,[...(spouseNeighbours.get(couple.source)||[]),couple.target]); spouseNeighbours.set(couple.target,[...(spouseNeighbours.get(couple.target)||[]),couple.source]); });
  const householdsByLevel = new Map<number,(typeof uniqueGraphPeople)[]>();
  peopleByLevel.forEach((people,level) => {
    const peopleMap=new Map(people.map(person => [person.id,person]));
    const visited=new Set<number>();
    const households:(typeof uniqueGraphPeople)[]=[];
    people.forEach(person => { if (visited.has(person.id)) return; const members:typeof uniqueGraphPeople=[]; const queue=[person.id]; while(queue.length){ const id=queue.shift()!; if(visited.has(id)||!peopleMap.has(id)) continue; visited.add(id); members.push(peopleMap.get(id)!); (spouseNeighbours.get(id)||[]).forEach(neighbour => queue.push(neighbour)); } members.sort((left,right) => { const leftIsTarget=spouseRelationshipsForGraph.some(relation => relation.person.id===left.id); const rightIsTarget=spouseRelationshipsForGraph.some(relation => relation.person.id===right.id); return Number(leftIsTarget)-Number(rightIsTarget); }); households.push(members); });
    households.sort((left,right) => { const leftSelf=left.some(person => person.self),rightSelf=right.some(person => person.self); if(leftSelf!==rightSelf) return leftSelf?1:-1; const leftAnchor=left[0].relationship ? graphAnchor(left[0].relationship) : selfGraphId; const rightAnchor=right[0].relationship ? graphAnchor(right[0].relationship) : selfGraphId; return leftAnchor-rightAnchor || left[0].name.localeCompare(right[0].name); });
    householdsByLevel.set(level,households);
  });
  const widestGraphRow = Math.max(...Array.from(householdsByLevel.values()).map(households => households.reduce((width,household) => width+household.length*graphNodeWidth+Math.max(0,household.length-1)*spouseGap,0)+Math.max(0,households.length-1)*householdGap),1);
  const graphCanvasWidth = Math.max(1400,widestGraphRow+320);
  const graphCanvasHeight = (maxGraphLevel-minGraphLevel+1)*graphLevelHeight+130;
  const graphPositions = new Map<number,{x:number;y:number}>();
  householdsByLevel.forEach((households,level) => { const rowWidth=households.reduce((width,household) => width+household.length*graphNodeWidth+Math.max(0,household.length-1)*spouseGap,0)+Math.max(0,households.length-1)*householdGap; let cursor=(graphCanvasWidth-rowWidth)/2; households.forEach(household => { household.forEach(person => { graphPositions.set(person.id,{x:cursor,y:55+(level-minGraphLevel)*graphLevelHeight}); cursor+=graphNodeWidth+spouseGap; }); cursor+=householdGap-spouseGap; }); });
  const graphEdges = relationships.map(relationship => ({ relationship,source:graphAnchor(relationship),target:relationship.person.id,inferredCouple:false })).filter(edge => graphPositions.has(edge.source)&&graphPositions.has(edge.target));
  const inferredGraphEdges = inferredCouples.map(couple => ({relationship:relationships.find(relationship => relationship.person.id===couple.target)!,source:couple.source,target:couple.target,inferredCouple:true})).filter(edge => edge.relationship&&graphPositions.has(edge.source)&&graphPositions.has(edge.target));
  const displayGraphEdges=[...graphEdges,...inferredGraphEdges];
  const descendantGraphEdges = graphEdges.filter(edge => graphLevelDelta(edge.relationship.type)>0);
  const descendantEdgeGroups = Array.from(new Set(descendantGraphEdges.map(edge => edge.source))).map(source => ({source,edges:descendantGraphEdges.filter(edge => edge.source===source)}));
  const descendantGroupsByLevel = new Map<number,typeof descendantEdgeGroups>();
  descendantEdgeGroups.forEach(group => { const targetLevel=graphLevels.get(group.edges[0].target); if(targetLevel!==undefined) descendantGroupsByLevel.set(targetLevel,[...(descendantGroupsByLevel.get(targetLevel)||[]),group]); });
  Array.from(descendantGroupsByLevel.entries()).sort(([left],[right])=>left-right).forEach(([,groups]) => {
    const packed=groups.map(group => { const source=graphPositions.get(group.source)!; const partners=(spouseNeighbours.get(group.source)||[]).map(id=>graphPositions.get(id)).filter((position):position is {x:number;y:number}=>Boolean(position)); const sourceCenter=[source,...partners].reduce((sum,position)=>sum+position.x+graphNodeWidth/2,0)/(partners.length+1); const memberIds=Array.from(new Set(group.edges.flatMap(edge => [edge.target,...(spouseNeighbours.get(edge.target)||[])]))); const width=memberIds.length*graphNodeWidth+Math.max(0,memberIds.length-1)*spouseGap; return {group,memberIds,width,desired:sourceCenter-width/2}; }).sort((left,right)=>left.desired-right.desired);
    let cursor=70;
    packed.forEach(item => { const start=Math.max(item.desired,cursor); item.memberIds.forEach((id,index) => { const current=graphPositions.get(id); if(current) graphPositions.set(id,{x:start+index*(graphNodeWidth+spouseGap),y:current.y}); }); cursor=start+item.width+householdGap; });
  });
  const descendantLaneBySource = new Map(descendantEdgeGroups.map((group,index) => [group.source,index]));

  return <main className="container user-network-dashboard">
    <header className="network-header">
      <div><p className="eyebrow">MY CIRCLENET</p><h1>Welcome, {username}</h1><p>Find people you know, define the relationship, and organize them into circles.</p></div>
      <div className="network-actions"><Link href="/profile" className="btn btn-secondary">My profile</Link><Link href="/session" className="btn btn-secondary">Session</Link><button className="btn btn-secondary" onClick={async () => { await logout(); router.replace('/auth'); }}>Sign out</button></div>
    </header>

    <p className="network-message" role="status">{message}</p>

    <section className="card quick-add-card" id="add-network-person">
      <div><p className="eyebrow">{addingRelativeTo ? 'ADD TO SELECTED PERSON' : 'ADD TO MY NETWORK'}</p><h2>{addingRelativeTo ? `Add a relation to ${addingRelativeTo.displayName}` : 'Add a friend, relative, or family member'}</h2><p>{addingRelativeTo ? `The selected relationship will belong to ${addingRelativeTo.displayName}, not directly to ${username}.` : 'Choose a CircleNet account for someone who can sign in, or Managed person for a child, dependent, memorial, or someone without contact details. Contact details remain private.'}</p></div>
      <form onSubmit={addByMobile} className={`quick-add-form ${addingRelativeTo ? 'has-relative-target' : ''}`}>
        {addingRelativeTo && <div className="relative-to-banner"><span>Relationship owner: <strong>{addingRelativeTo.displayName}</strong></span><button type="button" className="action-tag action-tag-danger" onClick={() => setAddingRelativeTo(null)}>Use me instead</button></div>}
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

    <section className="network-section relationship-tree-section"><div className="section-heading"><div><p className="eyebrow">MY FAMILY TREE</p><h2>My relationships</h2><p className="family-tree-help">One connected tree that grows automatically in every direction.</p></div><div className="family-view-toolbar" role="group" aria-label="Family tree view"><button type="button" className={treeView === 'modern' ? 'selected' : ''} onClick={() => selectTreeView('modern')}><i>◇</i><span>Modern</span></button><button type="button" className={treeView === 'heritage' ? 'selected' : ''} onClick={() => selectTreeView('heritage')}><i>♧</i><span>Heritage</span></button><button type="button" className={treeView === 'compact' ? 'selected' : ''} onClick={() => selectTreeView('compact')}><i>▦</i><span>Compact</span></button></div><span>{relationships.length}</span></div>{relationships.length ? <div className={`family-tree family-view-${treeView} unified-family-tree`} ref={familyTreeRef}><div className="family-graph-canvas" style={{width:graphCanvasWidth,height:graphCanvasHeight}}><svg className="family-graph-edges" width={graphCanvasWidth} height={graphCanvasHeight} aria-hidden="true"><defs><marker id="family-edge-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>{displayGraphEdges.map(edge => { const source=graphPositions.get(edge.source)!; const target=graphPositions.get(edge.target)!; const spouse=edge.inferredCouple||['spouse','husband','wife'].includes(relationKey(edge.relationship)); let sx=source.x+graphNodeWidth/2; const tx=target.x+graphNodeWidth/2, sy=source.y+52, ty=target.y+52; const descendant=!spouse&&graphLevelDelta(edge.relationship.type)>0; if(descendant){ const partnerPositions=(spouseNeighbours.get(edge.source)||[]).map(id=>graphPositions.get(id)).filter((position):position is {x:number;y:number}=>Boolean(position)); if(partnerPositions.length) sx=([source,...partnerPositions].reduce((sum,position)=>sum+position.x+graphNodeWidth/2,0))/(partnerPositions.length+1); } let middle=(sy+ty)/2; if(descendant) middle+=(descendantLaneBySource.get(edge.source)||0)%4*12; const path=spouse?`M ${sx} ${sy} H ${tx}`:`M ${sx} ${sy} V ${middle} H ${tx} V ${ty}`; return <g key={`${edge.inferredCouple?'couple':'relation'}-${edge.source}-${edge.target}`} className={spouse?'graph-edge graph-edge-spouse':'graph-edge'}><path d={path} markerEnd={spouse?undefined:'url(#family-edge-arrow)'}/><text x={(sx+tx)/2} y={spouse?sy-7:middle-6}>{spouse?'♥':edge.relationship.type}</text></g>; })}</svg>{uniqueGraphPeople.map(person => { const position=graphPositions.get(person.id)!; return <div className="family-graph-node" style={{left:position.x,top:position.y,width:graphNodeWidth}} key={person.id}>{person.self?<article className={`self-node ${genderClass({gender:selfGender} as NetworkPerson)}`}><PersonAvatar name={username} photo={selfPhoto} self/><div><strong>{username}</strong><small>You</small></div></article>:relationshipNode(person.relationship!)}</div>; })}</div>
      {grandparentRelationships.length > 0 && <section className="family-generation family-generation-ancestors"><p className="family-level-label">Grandparents · 2 levels above</p><div className="family-generation-row family-couple-row">{grandparentRelationships.map((item,index) => <div className="family-couple-member" key={item.id}>{index > 0 && <span className="family-heart-connector" aria-label="Couple">♥</span>}{relationshipUnit(item,'grandparent')}</div>)}</div></section>}
      {parentRelationships.length > 0 && <section className={`family-generation family-generation-parents ${grandparentRelationships.length ? 'connected-from-above' : ''}`}><p className="family-level-label">Parents · 1 level above</p>{grandparentRelationships.length > 0 && <FamilyBranch targets={parentRelationships.length}/>}<div className="family-generation-row family-couple-row">{parentRelationships.map((item,index) => <div className="family-couple-member" key={item.id}>{index > 0 && <span className="family-heart-connector" aria-label="Couple">♥</span>}{relationshipNode(item,false,'parent')}</div>)}</div></section>}
      <section className={`family-generation family-generation-current family-lineage-generation ${parentRelationships.length || grandparentRelationships.length ? 'connected-from-above' : ''}`}><p className="family-level-label">Your generation and households</p>{(parentRelationships.length > 0 || grandparentRelationships.length > 0) && <FamilyBranch targets={siblingRelationships.length + 1}/>}<div className="family-generation-row family-peer-row family-household-row">{siblingRelationships.slice(0,Math.ceil(siblingRelationships.length / 2)).map(siblingHousehold)}<div className="family-household family-self-household"><div className="family-self-family"><div className={`partnership-row ${spouseRelationships.length ? 'has-spouse' : ''}`}><article className={`self-node ${genderClass({gender:selfGender} as NetworkPerson)}`} data-tree-role="current"><PersonAvatar name={username} photo={selfPhoto} self/><div><strong>{username}</strong><small>You</small></div></article>{spouseRelationships.map(item => <div className="spouse-pair" key={item.id}><span className="partner-connector"><i>♥</i></span>{relationshipNode(item,true,'current-spouse')}</div>)}</div></div>{descendantTree(childRelationships)}</div>{siblingRelationships.slice(Math.ceil(siblingRelationships.length / 2)).map(siblingHousehold)}</div></section>
      {grandchildRelationships.length > 0 && <section className="family-generation family-generation-descendants connected-from-above"><p className="family-level-label">Grandchildren · 2 levels below</p><FamilyBranch targets={grandchildRelationships.length}/><div className="family-generation-row">{grandchildRelationships.map(item => <div className="family-descendant" key={item.id}>{relationshipUnit(item,'grandchild')}</div>)}</div></section>}
      {anchoredRelationshipGroups.length > 0 && <section className="anchored-family-section"><p className="family-level-label">Extended family connections</p><div className="anchored-family-groups">{anchoredRelationshipGroups.map(group => <article className="anchored-family-group" key={group.owner!.id}><div className="anchored-family-owner"><PersonAvatar name={group.owner!.displayName} photo={group.owner!.profilePhoto}/><div><strong>{group.owner!.displayName}</strong><small>The relationships below belong to this person</small></div></div><div className="anchored-family-branches">{group.relationships.map(relation => <div className="anchored-family-branch" key={relation.id}>{relationshipUnit(relation)}</div>)}</div></article>)}</div></section>}
      {otherRelationships.length > 0 && <section className="family-other-connections"><p className="family-level-label">Other connections</p><div className="family-generation-row">{otherRelationships.map(item => <div className="family-peer" key={item.id}>{relationshipNode(item)}</div>)}</div></section>}
    </div> : <p className="circle-empty-state">Add someone above to start your family tree.</p>}</section>

    <section className="network-section circle-tree-section"><div className="section-heading"><div><p className="eyebrow">MY CIRCLES</p><h2>My circles</h2><p className="circle-summary">{ownedCircles.length} created by me · {circles.length-ownedCircles.length} added by others</p></div><span>{circles.length}</span></div><div className="circle-forest circle-forest-compact">{circles.map(renderCircle)}</div>{!circles.length&&<p className="circle-empty-state">You have not created or joined any circles yet.</p>}</section>
    {directCallPerson&&<div className="direct-call-backdrop"><section className={`direct-call-panel ${directCall?.callType==='VIDEO'?'is-video':'is-audio'}`} role="dialog" aria-modal="true" aria-label={`${directCall?.callType==='VIDEO'?'Video':'Audio'} call with ${directCallPerson.displayName}`}><div className="direct-call-stage">{directCall?.callType==='VIDEO'&&<video ref={remoteVideoRef} autoPlay playsInline/>}<audio ref={remoteAudioRef} autoPlay/><div className="direct-call-identity"><PersonAvatar name={directCallPerson.displayName} photo={directCallPerson.profilePhoto}/><h3>{directCallPerson.displayName}</h3><p>{directCallPhase==='incoming'?`Incoming ${(directCall?.callType||'AUDIO').toLowerCase()} call`:directCallPhase==='preparing'?'Preparing devices…':directCallPhase==='ringing'?'Ringing…':directCallPhase==='connected'?'Connected':'Call ended'}</p></div>{directCall?.callType==='VIDEO'&&<video className="direct-call-local" ref={localVideoRef} autoPlay muted playsInline/>}</div>{directCallError&&<p className="direct-call-error" role="alert">{directCallError}</p>}<footer>{directCallPhase==='incoming'?<><button type="button" className="call-control accept" onClick={()=>void answerIncomingCall()}>Accept</button><button type="button" className="call-control end" onClick={()=>void declineIncomingCall()}>Decline</button></>:<button type="button" className="call-control end" onClick={()=>void closeDirectCall()}>End call</button>}</footer></section></div>}
    {directChatPerson&&<div className="direct-chat-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setDirectChatPerson(null);}}><section className="direct-chat-panel" role="dialog" aria-modal="true" aria-label={`Private conversation with ${directChatPerson.displayName}`}><header><PersonAvatar name={directChatPerson.displayName} photo={directChatPerson.profilePhoto}/><div><strong>{directChatPerson.displayName}</strong><small>Private conversation</small></div><button type="button" className="action-tag action-tag-danger" onClick={()=>setDirectChatPerson(null)}>Close</button></header><div className="direct-chat-messages">{directChatLoading?<p className="circle-no-posts">Loading conversation…</p>:directMessages.length?directMessages.map(item=><article className={`direct-chat-message ${item.currentUserAuthor?'mine':''}`} key={item.id}><header>{!item.currentUserAuthor&&<PersonAvatar name={item.senderName} photo={item.senderPhoto}/>}<div><strong>{item.currentUserAuthor?'You':item.senderName}</strong><time>{new Date(item.createdAt).toLocaleString()}</time></div></header>{item.message&&<p>{item.message}</p>}<DirectMessageAttachment message={item} otherUserId={directChatPerson.id}/></article>):<p className="circle-no-posts">No messages yet. Say hello to {directChatPerson.displayName}.</p>}</div><div className="direct-chat-composer"><textarea value={directDraft} onChange={event=>{setDirectDraft(event.target.value);setDirectChatError('');}} placeholder={`Message ${directChatPerson.displayName}…`} maxLength={4000}/><div><label className="action-tag action-tag-admin circle-file-button"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={event=>{chooseDirectFile(event.target.files?.[0]);event.currentTarget.value='';}}/>Attach file</label>{directFile&&<span className="circle-selected-file">{directFile.name} · {formatFileSize(directFile.size)}</span>}<span className="circle-file-limit">Maximum 25 MB</span>{directUploadProgress!==undefined&&<span className="circle-upload-progress" style={{background:`conic-gradient(#705bd1 ${directUploadProgress*3.6}deg,#e8e2f4 0deg)`}}><strong>{directUploadProgress}%</strong></span>}<button type="button" className="btn btn-primary" disabled={busy} onClick={()=>void submitDirectMessage()}>Send</button></div>{directChatError&&<p className="circle-composer-error" role="alert">{directChatError}</p>}</div></section></div>}
  </main>;
}
