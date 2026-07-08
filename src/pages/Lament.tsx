import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { CARD_STYLE } from '../components/ui/cardStyle';
import { lamentPsalmOfTheDay } from '../data/lamentPsalms';
import chapelStyles from '../styles/chapelRegister.module.css';

// The Lament Room (VISION.md covenant #3: "the Psalms are roughly forty
// percent lament and no product has a lament mode"). A finite, four-
// station liturgy shaped by the classic lament psalm structure: complaint,
// petition, and the turn to trust — the same ancient grammar Israel used
// to bring real anger and real grief honestly before God, without
// pretending it wasn't there. No AI anywhere in this room.

function StationLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999, background: 'var(--accent-copper-light)',
        color: 'var(--accent-copper)', fontSize: 11, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{n}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {children}
      </span>
    </div>
  );
}

export default function Lament() {
  const navigate = useNavigate();
  const { isPhone } = useResponsiveLayout();
  const { addChronicleEntry } = useAppStore();
  const { addToast } = useToastStore();
  const [complaint, setComplaint] = useState('');
  const [petition, setPetition] = useState('');
  const [trust, setTrust] = useState('');
  const [sealed, setSealed] = useState(false);

  const psalm = lamentPsalmOfTheDay();
  const card: React.CSSProperties = { ...CARD_STYLE, padding: isPhone ? '18px 16px' : '22px 24px' };
  const canSeal = complaint.trim() || petition.trim() || trust.trim();

  const sealLament = () => {
    const today = new Date().toISOString().split('T')[0];
    const body = [
      complaint.trim() && `[Complaint]\n${complaint.trim()}`,
      petition.trim() && `[Petition]\n${petition.trim()}`,
      trust.trim() && `[Trust]\n${trust.trim()}`,
    ].filter(Boolean).join('\n\n');
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: today,
      type: 'prayer',
      title: `Lament — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      body,
      autoCapture: true,
      sourceContext: { page: 'prayer', lament: { complaint: complaint.trim(), petition: petition.trim(), trust: trust.trim() } },
    });
    setSealed(true);
    addToast('The lament is kept', 'success', '🕯️');
  };

  if (sealed) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: isPhone ? '48px 18px' : '72px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, color: 'var(--accent-copper)', marginBottom: 14 }}>🕯️</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            It is kept.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 28px' }}>
            He can bear the whole of it. Nothing you brought here was too much.
          </p>
          <button onClick={() => navigate('/prayer')} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Back to the Prayer Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={chapelStyles.chapelRegister} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: isPhone ? '22px 16px 48px' : '36px 24px 64px', display: 'grid', gap: 16 }}>

        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <button
            onClick={() => navigate('/prayer')}
            style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 10, display: 'block', margin: '0 auto 10px' }}
          >
            ← Back to the Prayer Room
          </button>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-copper)' }}>The Lament Room</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontStyle: 'italic', color: 'var(--text-sub)', marginTop: 10, lineHeight: 1.7 }}>
            "{psalm.text}"
          </p>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{psalm.ref}</div>
        </div>

        <section style={card}>
          <StationLabel n={1}>The Complaint</StationLabel>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: '0 0 10px' }}>
            Tell God plainly what is wrong. He can bear it.
          </p>
          <textarea
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            placeholder="Say it honestly, without softening it."
            style={{ width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </section>

        <section style={card}>
          <StationLabel n={2}>The Petition</StationLabel>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: '0 0 10px' }}>
            Ask for what you actually need.
          </p>
          <textarea
            value={petition}
            onChange={(event) => setPetition(event.target.value)}
            placeholder="What do you want Him to do?"
            style={{ width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </section>

        <section style={card}>
          <StationLabel n={3}>The Turn to Trust</StationLabel>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: '0 0 10px' }}>
            Even so — name one thing true about God that doesn't change, whether or not this changes.
          </p>
          <textarea
            value={trust}
            onChange={(event) => setTrust(event.target.value)}
            placeholder="Even so, You are..."
            style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </section>

        <section style={card}>
          <StationLabel n={4}>Seal It</StationLabel>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: '0 0 12px' }}>
            Nothing here needs to be tidy or resolved. It is kept, as written.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={sealLament}
              disabled={!canSeal}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent-copper)', color: 'white', fontSize: 13, fontWeight: 700, cursor: canSeal ? 'pointer' : 'default', opacity: canSeal ? 1 : 0.55 }}
            >
              Keep This Lament 🕯️
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
