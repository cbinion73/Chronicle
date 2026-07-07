import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import {
  PEOPLE, PLACES, findPerson, findPlace,
  incomingRelationships, placesForPerson, peopleForPlace,
  type Person, type Place, type Era,
} from '../data/knowledgeGraph';

// Explore — the first two projections of the Biblical Knowledge Graph: the
// Character Network (people and how they relate) and the Atlas (places and
// who was there). Both read the same curated graph in src/data/knowledgeGraph.ts.
// A full interactive map and a 3,000-person graph are the eventual vision;
// this is the smallest real version that establishes the right architecture —
// entities with typed relationships, each anchored to Scripture, browsable
// and linked straight into the Reader.

const ERA_LABELS: Record<Era, string> = {
  primeval: 'Primeval History',
  patriarchal: 'The Patriarchs',
  exodus: 'The Exodus',
  judges: 'The Judges',
  'united-monarchy': 'The United Monarchy',
  'divided-monarchy': 'The Divided Monarchy',
  exile: 'The Exile',
  return: 'The Return',
  gospels: 'The Gospels',
  apostolic: 'The Apostolic Church',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  'father-of': 'Father of', 'mother-of': 'Mother of', 'spouse-of': 'Spouse of',
  'sibling-of': 'Sibling of', 'descendant-of': 'Descendant of', 'ruled': 'Ruled',
  'prophet-to': 'Prophet to', 'led': 'Led', 'anointed': 'Anointed', 'mentored': 'Mentored',
  'betrayed': 'Betrayed', 'served': 'Served', 'opposed': 'Opposed',
};

const TABS = [
  { id: 'people', label: 'People', path: '/explore' },
  { id: 'places', label: 'Places', path: '/explore/places' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Explore() {
  const navigate = useNavigate();
  const params = useParams<{ view?: string }>();
  const { isCompact, isPhone } = useResponsiveLayout();
  const setBibleView = useAppStore((state) => state.setBibleView);
  const [query, setQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(PEOPLE[0]?.id);
  const [selectedPlaceId, setSelectedPlaceId] = useState(PLACES[0]?.id);

  const tab: TabId = params.view === 'places' ? 'places' : 'people';

  const filteredPeople = useMemo(
    () => PEOPLE.filter((person) => person.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const filteredPlaces = useMemo(
    () => PLACES.filter((place) => place.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const selectedPerson = findPerson(selectedPersonId) || null;
  const selectedPlace = findPlace(selectedPlaceId) || null;

  const openPassage = (reference: string) => {
    const target = getBibleNavigationTarget(reference);
    if (target) {
      setBibleView({ book: target.book, chapter: target.chapter, overlayOn: false, showThemePanel: false });
    }
    navigate('/bible');
  };

  const listPanelStyle: React.CSSProperties = {
    width: isCompact ? '100%' : 260, minWidth: isCompact ? 0 : 260, maxHeight: isCompact ? 240 : undefined,
    borderRight: isCompact ? 'none' : '1px solid var(--border)', borderBottom: isCompact ? '1px solid var(--border)' : 'none',
    background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ padding: '10px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setQuery(''); navigate(t.path); }}
              aria-current={tab === t.id ? 'page' : undefined}
              style={{
                padding: '7px 16px', border: 'none', fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                background: tab === t.id ? 'var(--accent-green)' : 'transparent',
                color: tab === t.id ? 'white' : 'var(--text-sub)', cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {PEOPLE.length} people · {PLACES.length} places · a curated seed of the Biblical Knowledge Graph
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: isCompact ? 'column' : 'row', overflow: isCompact ? 'auto' : 'hidden', minHeight: 0 }}>
        {tab === 'people' ? (
          <>
            <div style={listPanelStyle}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a person..."
                  style={{ width: '100%', padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 16, background: 'var(--card-bg)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0', minHeight: 0 }}>
                {filteredPeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => setSelectedPersonId(person.id)}
                    style={{
                      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                      padding: '7px 14px', border: 'none',
                      background: selectedPersonId === person.id ? 'var(--sidebar-selected-bg)' : 'transparent',
                      color: selectedPersonId === person.id ? 'var(--sidebar-selected-text)' : 'var(--text-sub)',
                      fontWeight: selectedPersonId === person.id ? 600 : 400, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span>{person.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ERA_LABELS[person.era]}</span>
                  </button>
                ))}
                {filteredPeople.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>No one matches that search yet.</div>
                ) : null}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: isPhone ? '16px 16px 24px' : '20px 24px 32px', minHeight: 0 }}>
              {selectedPerson ? (
                <PersonDetail person={selectedPerson} onSelectPerson={setSelectedPersonId} onOpenPassage={openPassage} onGoToPlaces={() => navigate('/explore/places')} onSelectPlace={setSelectedPlaceId} />
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div style={listPanelStyle}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a place..."
                  style={{ width: '100%', padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 16, background: 'var(--card-bg)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0', minHeight: 0 }}>
                {filteredPlaces.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => setSelectedPlaceId(place.id)}
                    style={{
                      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                      padding: '7px 14px', border: 'none',
                      background: selectedPlaceId === place.id ? 'var(--sidebar-selected-bg)' : 'transparent',
                      color: selectedPlaceId === place.id ? 'var(--sidebar-selected-text)' : 'var(--text-sub)',
                      fontWeight: selectedPlaceId === place.id ? 600 : 400, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span>{place.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{place.region}</span>
                  </button>
                ))}
                {filteredPlaces.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>No place matches that search yet.</div>
                ) : null}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: isPhone ? '16px 16px 24px' : '20px 24px 32px', minHeight: 0 }}>
              {selectedPlace ? (
                <PlaceDetail place={selectedPlace} onOpenPassage={openPassage} onSelectPerson={(id) => { setSelectedPersonId(id); navigate('/explore'); }} />
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PassageChips({ passages, onOpenPassage }: { passages: string[]; onOpenPassage: (ref: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
      {passages.map((ref) => (
        <button
          key={ref}
          onClick={() => onOpenPassage(ref)}
          style={{ padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--accent-green)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          {ref}
        </button>
      ))}
    </div>
  );
}

function PersonDetail({ person, onSelectPerson, onOpenPassage, onGoToPlaces, onSelectPlace }: {
  person: Person;
  onSelectPerson: (id: string) => void;
  onOpenPassage: (ref: string) => void;
  onGoToPlaces: () => void;
  onSelectPlace: (id: string) => void;
}) {
  const incoming = incomingRelationships(person.id);
  const places = placesForPerson(person);

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-green)', marginBottom: 6 }}>
        {ERA_LABELS[person.era]}
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
        {person.name}
      </h2>
      {person.altNames?.length ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>also called {person.altNames.join(', ')}</div>
      ) : null}
      <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, marginTop: 10 }}>{person.summary}</p>

      <PassageChips passages={person.keyPassages} onOpenPassage={onOpenPassage} />

      {person.relationships.length > 0 || incoming.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Relationships</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {person.relationships.map((rel, i) => {
              const target = findPerson(rel.targetId);
              return (
                <button
                  key={`out-${i}`}
                  onClick={() => target && onSelectPerson(target.id)}
                  disabled={!target}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: target ? 'pointer' : 'default', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{RELATIONSHIP_LABELS[rel.kind]}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{target?.name || rel.targetId.replace(/-/g, ' ')}</span>
                  {rel.note ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> · {rel.note}</span> : null}
                </button>
              );
            })}
            {incoming.map(({ person: source, relationship }, i) => (
              <button
                key={`in-${i}`}
                onClick={() => onSelectPerson(source.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{source.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{RELATIONSHIP_LABELS[relationship.kind]}</span>
                <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>them</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {places.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Places</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {places.map((place) => (
              <button
                key={place.id}
                onClick={() => { onSelectPlace(place.id); onGoToPlaces(); }}
                style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                📍 {place.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlaceDetail({ place, onOpenPassage, onSelectPerson }: {
  place: Place;
  onOpenPassage: (ref: string) => void;
  onSelectPerson: (id: string) => void;
}) {
  const people = peopleForPlace(place.id);
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-green)', marginBottom: 6 }}>
        {place.region}{place.modernName ? ` · today: ${place.modernName}` : ''}
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
        {place.name}
      </h2>
      {place.altNames?.length ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>also called {place.altNames.join(', ')}</div>
      ) : null}
      <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, marginTop: 10 }}>{place.summary}</p>

      <PassageChips passages={place.keyPassages} onOpenPassage={onOpenPassage} />

      {place.lat && place.lon ? (
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
          {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}° — an interactive map is a future Atlas milestone; coordinates are captured now so it can be built without re-curating data.
        </div>
      ) : null}

      {people.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Who Was Here</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {people.map((person) => (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {person.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
