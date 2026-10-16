import { calendarDay, shortDay } from '../../../core/format';
import { dayNumber } from '../../../core/period';
import type { Allocation, LoadItem } from '../../../core/progress';
import { localDateStamp } from '../../../core/time';
import { openProject } from '../../actions';

/** "Done 24 Sep", "Done 24 Sep, due 18 Sep" when late, or "Open"; "· spread" when a start date spreads it. */
function when({ task }: LoadItem): string {
  let text = 'Open';
  if (task.done && task.doneAt) {
    text = `Done ${shortDay(task.doneAt)}`;
    if (task.due && dayNumber(localDateStamp(new Date(task.doneAt))) > dayNumber(task.due)) text += `, due ${calendarDay(task.due)}`;
  }
  return task.startsOn && task.due ? `${text} · spread` : text;
}

/** What filled one period: each task, its project, when it was done, and its share, largest first. */
export function PeriodTasks(props: { allocation: Allocation }) {
  const { items, period } = props.allocation;
  if (!items.length) return <p class="text-14 text-body">Nothing was allocated this {period}.</p>;
  return (
    <table class="-mx-22 w-[calc(100%+44px)] border-collapse text-14 max-md:-mx-16 max-md:w-[calc(100%+32px)]">
      <thead>
        <tr class="text-left text-12 text-body">
          <th scope="col" class="pt-2 pr-12 pb-8 pl-22 font-medium max-md:pl-16">
            Task
          </th>
          <th scope="col" class="px-12 pt-2 pb-8 font-medium max-md:hidden">
            Project
          </th>
          <th scope="col" class="px-12 pt-2 pb-8 font-medium">
            When
          </th>
          <th scope="col" class="pt-2 pr-22 pb-8 pl-12 text-right whitespace-nowrap font-medium max-md:pr-16">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.project.id}/${item.task.id}`} class="border-t border-line">
            <td class="py-10 pr-12 pl-22 max-md:pl-16">
              <button
                type="button"
                class="cursor-pointer text-left font-medium text-ink hover:text-primary-ink"
                onClick={() => openProject(item.project.id, item.task.id)}
              >
                {item.task.title}
              </button>
              <span class="hidden text-12 text-body max-md:block">{item.project.name}</span>
            </td>
            <td class="px-12 py-10 text-body max-md:hidden">{item.project.name}</td>
            <td class="px-12 py-10">
              <span class="pill pill-plain max-md:whitespace-normal">{when(item)}</span>
            </td>
            <td class="py-10 pr-22 pl-12 text-right whitespace-nowrap font-medium text-ink tabular-nums max-md:pr-16">{Math.round(item.share)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
