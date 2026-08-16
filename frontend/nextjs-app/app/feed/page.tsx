'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addSocialComment,
  createSocialPost,
  createSocialStory,
  deleteSocialComment,
  deleteSocialPost,
  deleteSocialStory,
  fetchMyCircles,
  fetchMyRelationships,
  fetchSocialFeed,
  fetchSavedSocialPosts,
  fetchSocialMedia,
  fetchSocialStories,
  hasAuthSession,
  isUnauthorizedError,
  NetworkCircle,
  NetworkRelationship,
  SocialPost,
  SocialStory,
  toggleSocialLike,
  toggleSocialSave,
  shareSocialPost,
  reportContent,
  updateSocialPost,
  viewSocialStory,
} from '../lib/api';

function Media({ path, type, alt, onViewed }: { path: string; type?: string | null; alt: string; onViewed?:()=>void }) {
  const [url, setUrl] = useState('');
  const onViewedRef = useRef(onViewed);
  useEffect(() => { onViewedRef.current = onViewed; }, [onViewed]);
  useEffect(() => {
    let object = '';
    fetchSocialMedia(path).then(blob => { object = URL.createObjectURL(blob); setUrl(object); onViewedRef.current?.(); }).catch(() => setUrl(''));
    return () => { if (object) URL.revokeObjectURL(object); };
  }, [path]);
  if (!url) return <div className="social-media-loading">Loading media…</div>;
  if (type?.startsWith('video/')) return <video className="social-media" src={url} controls playsInline />;
  if (type?.startsWith('image/')) return <img className="social-media" src={url} alt={alt} />;
  return <a className="btn btn-secondary" href={url} download>Download attachment</a>;
}

function Avatar({ name, src, userId }: { name: string; src?: string | null; userId?: number }) {
  const avatar = src ? <img className="social-avatar" src={src} alt="" /> : <span className="social-avatar social-avatar-text">{name.charAt(0).toUpperCase()}</span>;
  return userId ? <Link className="person-avatar-link" href={`/people/${userId}`} title={`View ${name}'s profile`}>{avatar}</Link> : avatar;
}

function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [circles, setCircles] = useState<NetworkCircle[]>([]);
  const [relationships, setRelationships] = useState<NetworkRelationship[]>([]);
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<SocialPost['audience']>('RELATIONSHIPS');
  const [circleId, setCircleId] = useState('');
  const [file, setFile] = useState<File>();
  const [storyFile, setStoryFile] = useState<File>();
  const [storyCaption, setStoryCaption] = useState('');
  const [comments, setComments] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [sharePost,setSharePost]=useState<SocialPost|null>(null);
  const [shareType,setShareType]=useState<'DIRECT'|'CIRCLE'>('DIRECT');
  const [shareTarget,setShareTarget]=useState('');
  const [shareNote,setShareNote]=useState('');

  const load = useCallback(async () => {
    try {
      const [postData, storyData, circleData, relationshipData] = await Promise.all([savedOnly ? fetchSavedSocialPosts() : fetchSocialFeed(), fetchSocialStories(), fetchMyCircles(), fetchMyRelationships()]);
      setPosts(postData); setStories(storyData); setCircles(circleData); setRelationships(relationshipData);
    } catch (error) {
      if (isUnauthorizedError(error)) router.replace('/auth?reason=session-expired');
      else setMessage((error as Error).message);
    }
  }, [router, savedOnly]);

  useEffect(() => { if (!hasAuthSession()) router.replace('/auth'); else void load(); }, [load, router]);
  useEffect(() => {
    const postId = Number(searchParams.get('postId'));
    const index = posts.findIndex(post => post.id === postId);
    if (index < 0) return;
    window.setTimeout(() => document.querySelectorAll<HTMLElement>('.social-post')[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }, [posts, searchParams]);

  const publish = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await createSocialPost(caption, audience, file, audience === 'CIRCLE' ? Number(circleId) : undefined); setCaption(''); setFile(undefined); await load(); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const publishStory = async () => {
    if (!storyFile) return; setBusy(true);
    try { await createSocialStory(storyCaption, 'RELATIONSHIPS', storyFile); setStoryFile(undefined); setStoryCaption(''); await load(); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const editPost = async (post: SocialPost) => {
    const value = window.prompt('Edit post', post.caption);
    if (value === null) return;
    try { await updateSocialPost(post.id, value); await load(); }
    catch (error) { setMessage((error as Error).message); }
  };
  const reportPost=async(post:SocialPost)=>{const reason=window.prompt('Report reason: harassment, spam, impersonation, privacy, illegal content, or other','spam');if(!reason)return;const normalized=reason.trim().toUpperCase().replaceAll(' ','_');const details=window.prompt('Additional details (optional)','')||'';try{await reportContent({reportedUserId:post.authorUserId,entityType:'SOCIAL_POST',entityId:post.id,reason:normalized,details});setMessage('Report submitted for review.');}catch(error){setMessage((error as Error).message);}};

  return <main className="social-page">
    <header className="social-header"><div><small>CIRCLENET SOCIAL</small><h1>{savedOnly?'Saved moments':'Moments from your people'}</h1></div><nav><button className="btn btn-secondary" onClick={()=>setSavedOnly(value=>!value)}>{savedOnly?'All posts':'Saved posts'}</button><Link href="/reports" className="btn btn-secondary">My reports</Link><Link href="/dashboard" className="btn btn-secondary">Relationships</Link><Link href="/profile" className="btn btn-secondary">Profile</Link></nav></header>
    {message && <p className="network-message error-message" role="alert">{message}</p>}
    <section className="story-strip">
      <label className="story-create"><strong>＋ Story</strong><input hidden type="file" accept="image/*,video/*" onChange={event => setStoryFile(event.target.files?.[0])} /><input value={storyCaption} onChange={event => setStoryCaption(event.target.value)} placeholder="Caption" />{storyFile && <button disabled={busy} onClick={publishStory}>Share</button>}</label>
      {stories.map(story => <article className={`story-card ${story.viewedByMe?'story-watched':''}`} key={story.id}><Media path={story.mediaUrl} type={story.mediaType} alt={story.caption || `${story.authorName}'s story`} onViewed={story.mine?undefined:()=>{if(!story.viewedByMe)void viewSocialStory(story.id).then(updated=>setStories(current=>current.map(item=>item.id===updated.id?updated:item)));}}/><div><Avatar name={story.authorName} src={story.authorPhoto} userId={story.authorUserId}/><strong>{story.authorName}</strong>{story.mine&&<small>{story.viewCount} view{story.viewCount===1?'':'s'}</small>}{story.mine && <button aria-label="Delete story" onClick={async () => { await deleteSocialStory(story.id); await load(); }}>×</button>}</div>{story.caption && <p>{story.caption}</p>}</article>)}
    </section>
    <form className="social-composer card" onSubmit={publish}><h2>Create a post</h2><textarea value={caption} onChange={event => setCaption(event.target.value)} placeholder="Share a family moment, update, photo or video…" /><div className="social-compose-actions"><select value={audience} onChange={event => setAudience(event.target.value as SocialPost['audience'])}><option value="RELATIONSHIPS">My relationships</option><option value="PUBLIC">Public</option><option value="CIRCLE">One circle</option></select>{audience === 'CIRCLE' && <select required value={circleId} onChange={event => setCircleId(event.target.value)}><option value="">Choose circle</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select>}<label className="btn btn-secondary">{file ? file.name : 'Add media'}<input hidden type="file" accept="image/*,video/*,audio/*,.pdf" onChange={event => setFile(event.target.files?.[0])} /></label><button className="btn btn-primary" disabled={busy || (!caption.trim() && !file)}>{busy ? 'Publishing…' : 'Publish'}</button></div></form>
    <section className="social-feed">
      {posts.length === 0 && <div className="card social-empty"><h2>Your feed is ready</h2><p>Publish the first update or add relationships to see their shared moments.</p></div>}
      {posts.map(post => <article className={`social-post card ${Number(searchParams.get('postId')) === post.id ? 'is-targeted' : ''}`} key={post.id}>
        <header><Avatar name={post.authorName} src={post.authorPhoto} userId={post.authorUserId}/><div><strong>{post.authorName}</strong><small>{new Date(post.createdAt).toLocaleString()} · {post.audience === 'RELATIONSHIPS' ? 'Relationships' : post.audience.toLowerCase()}{post.updatedAt !== post.createdAt ? ' · edited' : ''}</small></div>{post.mine && <div className="social-owner-actions"><button onClick={() => void editPost(post)}>Edit</button><button className="social-delete" onClick={async () => { if (confirm('Delete this post?')) { await deleteSocialPost(post.id); await load(); } }}>Delete</button></div>}</header>
        {post.caption && <p className="social-caption">{post.caption}</p>}{post.mediaUrl && <Media path={post.mediaUrl} type={post.mediaType} alt={post.caption || 'Shared media'} />}
        <div className="social-stats"><span>{post.likeCount} like{post.likeCount === 1 ? '' : 's'}</span><span>{post.commentCount} comment{post.commentCount === 1 ? '' : 's'}</span></div>
        <div className="social-actions"><button className={post.likedByMe ? 'is-liked' : ''} onClick={async () => { await toggleSocialLike(post.id); await load(); }}>{post.likedByMe ? '♥ Liked' : '♡ Like'}</button><button className={post.savedByMe?'is-saved':''} onClick={async()=>{await toggleSocialSave(post.id);await load();}}>{post.savedByMe?'🔖 Saved':'♧ Save'}</button><button onClick={()=>{setSharePost(post);setShareTarget('');setShareNote('');}}>↗ Share</button>{!post.mine&&<button onClick={()=>void reportPost(post)}>⚑ Report</button>}</div>
        <div className="social-comments">{post.comments.map(comment => <div key={comment.id}><Avatar name={comment.authorName} src={comment.authorPhoto} userId={comment.authorUserId}/><p><strong>{comment.authorName}</strong> {comment.message}</p>{(comment.mine || post.mine) && <button aria-label="Delete comment" onClick={async () => { await deleteSocialComment(post.id, comment.id); await load(); }}>×</button>}</div>)}<form onSubmit={async event => { event.preventDefault(); const text = comments[post.id]?.trim(); if (!text) return; await addSocialComment(post.id, text); setComments(current => ({ ...current, [post.id]: '' })); await load(); }}><input value={comments[post.id] || ''} onChange={event => setComments(current => ({ ...current, [post.id]: event.target.value }))} placeholder="Write a comment…" /><button>Post</button></form></div>
      </article>)}
    </section>
    {sharePost&&<div className="direct-chat-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSharePost(null);}}><section className="card social-share-dialog" role="dialog" aria-modal="true"><header><div><small>SHARE POST</small><h2>Send privately</h2></div><button className="btn btn-secondary" onClick={()=>setSharePost(null)}>Close</button></header><label><span>Destination</span><select value={shareType} onChange={event=>{setShareType(event.target.value as 'DIRECT'|'CIRCLE');setShareTarget('');}}><option value="DIRECT">Direct conversation</option><option value="CIRCLE">Circle</option></select></label><label><span>{shareType==='DIRECT'?'Person':'Circle'}</span><select required value={shareTarget} onChange={event=>setShareTarget(event.target.value)}><option value="">Choose…</option>{shareType==='DIRECT'?relationships.filter((item,index,all)=>item.person.accountStatus==='ACTIVE'&&item.person.identityType!=='MANAGED'&&all.findIndex(candidate=>candidate.person.id===item.person.id)===index).map(item=><option key={item.person.id} value={item.person.id}>{item.person.displayName}</option>):circles.map(circle=><option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label><label><span>Message (optional)</span><textarea value={shareNote} onChange={event=>setShareNote(event.target.value)} maxLength={1000}/></label><button className="btn btn-primary" disabled={!shareTarget||busy} onClick={async()=>{setBusy(true);try{await shareSocialPost(sharePost.id,shareType,Number(shareTarget),shareNote);setMessage('Post shared successfully.');setSharePost(null);}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}}>Share post</button></section></div>}
  </main>;
}

export default function FeedPage() {
  return <Suspense fallback={<main className="social-page"><div className="card social-empty"><p>Loading your feed…</p></div></main>}><FeedContent /></Suspense>;
}
