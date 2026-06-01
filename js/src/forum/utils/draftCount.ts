import app from 'flarum/forum/app';

function normalizedDraftCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getDraftCount(): number {
  return normalizedDraftCount(app.session.user?.draftCount?.());
}

export function setDraftCount(count: number): void {
  const user = app.session.user as any;

  if (!user?.data?.attributes) {
    return;
  }

  user.data.attributes.draftCount = normalizedDraftCount(count);
}

export function adjustDraftCount(delta: number): void {
  setDraftCount(getDraftCount() + delta);
}
