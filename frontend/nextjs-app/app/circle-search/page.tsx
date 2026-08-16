'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CirclePost, fetchMyCircles, hasAuthSession, isUnauthorizedError, NetworkCircle, searchCirclePosts } from '../lib/api';

function CircleSearchContent(){
  const router=useRouter();
  const searchParams=useSearchParams();
  const [circles,setCircles]=useState<NetworkCircle[]>([]);
  const [circleId,setCircleId]=useState('');
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<CirclePost[]>([]);
  const [searched,setSearched]=useState(false);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{try{const values=await fetchMyCircles();setCircles(values);if(values.length)setCircleId(current=>current||searchParams.get('circleId')||String(values[0].id));}catch(caught){if(isUnauthorizedError(caught))router.replace('/auth');else setError((caught as Error).message);}},[router,searchParams]);
  useEffect(()=>{if(!hasAuthSession())router.replace('/auth');else void load();},[load,router]);
  const search=async(event:FormEvent)=>{event.preventDefault();if(!circleId||!query.trim())return;setError('');try{setResults(await searchCirclePosts(Number(circleId),query.trim()));setSearched(true);}catch(caught){setError((caught as Error).message);}};
  return <main className="container circle-search-page"><header className="network-header"><div><p className="eyebrow">CIRCLE SEARCH</p><h1>Find a circle message</h1><p>Search message text and attachment names inside circles you belong to.</p></div><Link href="/dashboard" className="btn btn-secondary">Dashboard</Link></header>{error&&<p className="network-message error-message">{error}</p>}<form className="card circle-search-form" onSubmit={search}><label><span>Circle</span><select required value={circleId} onChange={event=>{setCircleId(event.target.value);setResults([]);setSearched(false);}}><option value="">Choose a circle</option>{circles.map(circle=><option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label><label><span>Words or attachment name</span><input required type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search this circle"/></label><button className="btn btn-primary">Search</button></form><section className="card circle-search-results">{results.map(post=><article key={post.id}><span className="conversation-avatar">{post.authorPhoto?<img src={post.authorPhoto} alt=""/>:post.authorName.charAt(0).toUpperCase()}</span><span><strong>{post.authorName}</strong><p>{post.message||post.attachmentName||'Attachment'}</p><small>{new Date(post.createdAt).toLocaleString()}{post.editedAt?' · edited':''}</small></span><button className="btn btn-secondary" onClick={()=>router.push(`/dashboard?circleId=${post.circleId}`)}>Open circle</button></article>)}{searched&&!results.length&&<div className="social-empty"><h2>No matching messages</h2><p>Try a different word or attachment name.</p></div>}{!searched&&<div className="social-empty"><p>Choose a circle and enter a search term.</p></div>}</section></main>;
}

export default function CircleSearchPage(){return <Suspense fallback={<main className="container circle-search-page"><div className="card social-empty"><p>Loading circle search…</p></div></main>}><CircleSearchContent/></Suspense>}
