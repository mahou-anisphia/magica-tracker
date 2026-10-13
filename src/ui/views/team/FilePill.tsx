import { shortDay } from '../../../core/format';
import { FILE_STALE_DAYS, fileAgeDays, type Member } from '../../../core/team';

/** "File from 12 Oct", amber once it is getting old, dashed when there is none. */
export function FilePill(props: { member: Member; now: Date }) {
  const snap = props.member.snapshot;
  if (!snap) return <span class="pill pill-low">No file yet</span>;
  const age = fileAgeDays(props.member, props.now)!;
  const label = `File from ${shortDay(snap.exportedAt)}`;
  return age > FILE_STALE_DAYS ? (
    <span class="pill pill-watch">
      {label} · {age} days old
    </span>
  ) : (
    <span class="pill pill-high">{label}</span>
  );
}
