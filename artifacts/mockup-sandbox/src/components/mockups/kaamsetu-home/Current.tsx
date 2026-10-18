import './_group.css';
import { ArrowRight, BriefcaseBusiness, ClipboardList, Handshake, House, Search, ShieldAlert, UserRound, UsersRound } from 'lucide-react';

const metrics = [
  ['Job listings', '5', 'Across the local marketplace'],
  ['Worker profiles', '2', 'Across the local marketplace'],
  ['Applications', '2', 'Across the local marketplace'],
  ['Connections made', '1', 'Across the local marketplace'],
  ['Awaiting review', '0', 'For a person to check'],
];

export function Current() {
  return (
    <div className="ks-current">
      <div className="frame">
        <aside className="sidebar">
          <a className="brand" href="#">
            <span className="mark"><Handshake size={23} /></span>
            <span><strong>KaamSetu</strong><small>Local work, fair pay</small></span>
          </a>
          <nav className="side-links" aria-label="Main navigation">
            <a href="#"><House size={18} />Overview</a>
            <a href="#"><BriefcaseBusiness size={18} />Find work</a>
            <a href="#"><UserRound size={18} />Worker profile</a>
            <a href="#"><UsersRound size={18} />Hire workers</a>
            <a href="#"><ClipboardList size={18} />My applications</a>
            <a href="#"><ShieldAlert size={18} />Safety review</a>
          </nav>
          <div className="side-note">Marketplace available<br />Local work, fair pay, clear expectations.</div>
        </aside>
        <div className="main">
          <header className="topbar"><span>KaamSetu / <strong>Overview</strong></span><span>Welcome to KaamSetu　●</span></header>
          <main className="content">
            <section className="welcome">
              <p className="eyebrow">Connect Skills. Create Opportunities.</p>
              <h1>Good work starts with a fair connection.</h1>
              <p className="welcome-copy">Find nearby opportunities that fit your skills, or meet dependable workers in your community. Clear details. Respectful choices. No middleman.</p>
              <div className="actions"><a className="button" href="#">Find Work <ArrowRight size={17} /></a><a className="button light" href="#">Hire Workers</a></div>
            </section>
            <div className="notice"><strong>Demo experience:</strong> Demo workspace: no sign-in or identity verification is active. New profiles, listings and applications are saved here and shared with other demo users.</div>
            <section className="metrics" aria-label="Marketplace summary">
              {metrics.map(([label, value, foot]) => <div className="metric" key={label}><small>{label}</small><strong>{value}</strong><span>{foot}</span></div>)}
            </section>
            <section>
              <h2>What would you like to do?</h2>
              <div className="actions-grid">
                <a href="#" className="action-card"><span className="action-icon"><Search size={20} /></span><span><strong>Find work near you</strong><p>Browse local jobs and see why each may suit you.</p></span></a>
                <a href="#" className="action-card"><span className="action-icon"><UserRound size={20} /></span><span><strong>Build your worker profile</strong><p>Share your skills, experience and expected daily wage.</p></span></a>
                <a href="#" className="action-card"><span className="action-icon"><UsersRound size={20} /></span><span><strong>Hire for a job</strong><p>Post clear work details and find workers who fit.</p></span></a>
              </div>
            </section>
            <section><h2>Recently posted work</h2><div className="job"><strong>Painter for a 2BHK home</strong><p>Pune · ₹600–₹800 / day · Sample listing</p></div></section>
          </main>
        </div>
        <nav className="bottom" aria-label="Mobile navigation">
          <a href="#"><House size={18} />Home</a><a href="#"><BriefcaseBusiness size={18} />Find</a><a href="#"><UserRound size={18} />Profile</a><a href="#"><UsersRound size={18} />Hire</a><a href="#"><ClipboardList size={18} />Applied</a><a href="#"><ShieldAlert size={18} />Review</a>
        </nav>
      </div>
    </div>
  );
}
