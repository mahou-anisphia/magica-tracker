import { dayHeading } from '../../../core/format';
import { localDateStamp } from '../../../core/time';

/** Overview's heading: today's date. */
export function TodayHeading(props: { now: Date }) {
  return (
    <h1 class="mb-36 text-heading leading-[1.2] tracking-[-0.015em]">
      <time dateTime={localDateStamp(props.now)}>{dayHeading(props.now)}</time>
    </h1>
  );
}
