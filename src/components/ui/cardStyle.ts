// Shared with Card.tsx and call sites that need <section> (not <div>)
// semantics — e.g. Office.tsx's Office/Examen stations — so they can apply
// the identical card shell without duplicating the values. Kept in its own
// file (not Card.tsx) so that component file can stay component-only for
// fast refresh.
export const CARD_STYLE: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  boxShadow: 'var(--shadow)',
};
