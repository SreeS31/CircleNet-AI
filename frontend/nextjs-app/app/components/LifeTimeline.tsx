'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyRelationships, fetchUserProfile, NetworkRelationship, UserProfile } from '../lib/api';

type TimelineEvent = { date: string; label: string; title: string; detail: string; kind: string; icon:string };

function MilestoneIcon({kind}:{kind:string}){
  const common={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(kind==='Education')return <svg viewBox="0 0 32 32" aria-hidden="true"><path {...common} d="M4 8.5 16 4l12 4.5L16 13 4 8.5Zm4 3.2V20c5 3.2 11 3.2 16 0v-8.3M28 9v9"/></svg>;
  if(kind==='Marriage')return <svg viewBox="0 0 32 32" aria-hidden="true"><circle {...common} cx="12" cy="17" r="7"/><circle {...common} cx="20" cy="17" r="7"/><path {...common} d="m13 7 3-3 3 3-3 3-3-3Z"/></svg>;
  if(kind==='Family')return <svg viewBox="0 0 32 32" aria-hidden="true"><circle {...common} cx="16" cy="12" r="6"/><path {...common} d="M10 12c2 1.8 4 2.7 6 2.7s4-.9 6-2.7M8 27c.8-6 3.5-9 8-9s7.2 3 8 9M13 10h.1M19 10h.1"/></svg>;
  if(kind==='Employment')return <svg viewBox="0 0 32 32" aria-hidden="true"><rect {...common} x="4" y="9" width="24" height="17" rx="3"/><path {...common} d="M11 9V6h10v3M4 16c7 4 17 4 24 0M14 16h4"/></svg>;
  if(kind==='Remembrance')return <svg viewBox="0 0 32 32" aria-hidden="true"><path {...common} d="M16 27S6 21 6 13a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 8-10 14-10 14Z"/><path {...common} d="M16 11v8m-4-4h8"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path {...common} d="M16 27S6 21 6 13a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 8-10 14-10 14Z"/><path {...common} d="M13 14c2 2 4 2 6 0M13 11h.1M19 11h.1"/></svg>;
}

function displayDate(value: string) {
  if (/^\d{4}$/.test(value)) return value;
  const parsed = new Date(`${value}${value.length === 7 ? '-01' : ''}T00:00:00`);
  return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { day: value.length > 7 ? 'numeric' : undefined, month: 'short', year: 'numeric' }).format(parsed);
}

export default function LifeTimeline({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [relationships,setRelationships]=useState<NetworkRelationship[]>([]);
  const [parentsOpen, setParentsOpen] = useState(false);
  useEffect(() => { let active=true;const load=()=>Promise.all([fetchUserProfile(),fetchMyRelationships()]).then(([loadedProfile,loadedRelationships])=>{if(active){setProfile(loadedProfile);setRelationships(loadedRelationships);setError('');}}).catch(()=>{if(active)setError('Timeline details could not be loaded.');});void load();const timer=window.setInterval(()=>void load(),30000);const focus=()=>void load();window.addEventListener('focus',focus);return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',focus);}; }, []);
  const events = useMemo(() => {
    if (!profile) return [];
    const values: TimelineEvent[] = [];
    const birthDate = String(profile.dateOfBirth || '');
    if (birthDate) values.push({ date: birthDate, label: displayDate(birthDate), kind: 'Birth', icon:'✦', title: 'Born', detail: String(profile.location || '') });
    const graduationYear = String(profile.graduationYear || '');
    if (graduationYear) values.push({ date: `${graduationYear}-12-31`, label: graduationYear, kind: 'Education', icon:'◆', title: String(profile.highestQualification || 'Graduated'), detail: [profile.institution, profile.fieldOfStudy].filter(Boolean).join(' · ') });
    relationships.forEach(relationship=>{
      const type=relationship.type.toLowerCase();
      if (relationship.milestoneDate&&['wife','husband'].includes(type)) values.push({date:relationship.milestoneDate,label:displayDate(relationship.milestoneDate),kind:'Marriage',icon:'♥',title:`Married ${relationship.person.displayName}`,detail:`Marriage with ${relationship.person.displayName}`});
      if (relationship.dateOfBirth&&['son','daughter','grandson','granddaughter'].includes(type)) values.push({date:relationship.dateOfBirth,label:displayDate(relationship.dateOfBirth),kind:'Family',icon:'★',title:`${relationship.person.displayName} was born`,detail:`My ${relationship.type.toLowerCase()}`});
      if (relationship.dateOfDeath) values.push({date:relationship.dateOfDeath,label:displayDate(relationship.dateOfDeath),kind:'Remembrance',icon:'✧',title:`Remembering ${relationship.person.displayName}`,detail:`My ${relationship.type.toLowerCase()}`});
    });
    return values.sort((a, b) => a.date.localeCompare(b.date));
  }, [profile,relationships]);
  if (error) return <p className="network-message error-message" role="alert">{error}</p>;
  if (!profile) return <p className="timeline-empty">Loading timeline…</p>;
  return <section className={`life-timeline-card card ${compact ? 'timeline-dashboard-preview' : ''}`} aria-label="Life timeline">
    <div className="life-timeline-heading"><div><p className="eyebrow">LIFE JOURNEY</p><h2>{compact ? 'My timeline' : 'Major milestones'}</h2><p>Birth, education, employment, marriage and family milestones in date order.</p></div>{compact&&<Link className="btn btn-secondary" href="/timeline">View timeline</Link>}</div>
    {events.length ? <div className="life-timeline-track">{events.map((event,index)=><article className={`life-timeline-event timeline-node-${index%2?'below':'above'} timeline-kind-${event.kind.toLowerCase()}`} style={{'--timeline-index':index} as React.CSSProperties} key={`${event.kind}-${event.date}-${index}`}><div className="timeline-event-card"><time>{event.label}</time><small>{event.kind}</small><h3>{event.title}</h3>{event.detail&&<p>{event.detail}</p>}{event.kind==='Birth'&&!compact&&<><button type="button" className="timeline-parent-button" aria-expanded={parentsOpen} onClick={()=>setParentsOpen(value=>!value)}>{parentsOpen?'Hide parents details':'Show parents details'}</button>{parentsOpen&&<div className="timeline-parent-details">{relationships.filter(item=>['mother','father'].includes(item.type.toLowerCase())).map(parent=><p key={parent.id}><strong>{parent.type}:</strong> {parent.person.displayName}</p>)}{!relationships.some(item=>['mother','father'].includes(item.type.toLowerCase()))&&<p>No parents added yet. Add them from the dashboard.</p>}</div>}</>}</div><div className="timeline-route-point"><div className="timeline-route-marker" aria-label={`${event.kind} milestone`}><MilestoneIcon kind={event.kind}/></div><strong className="timeline-route-year">{event.date.slice(0,4)}</strong></div>{index<events.length-1&&<svg className="timeline-curve" viewBox="0 0 250 100" preserveAspectRatio="none" aria-hidden="true"><path d={index%2===0?'M 0 0 C 105 0 145 100 250 100':'M 0 100 C 105 100 145 0 250 0'}/></svg>}</article>)}</div>:<div className="timeline-empty"><strong>No dated milestones yet.</strong><p>Add dates in <Link href="/profile">My profile</Link> or while adding relationships.</p></div>}
  </section>;
}
