const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const monthOnly = new Intl.DateTimeFormat(undefined, { month: 'long' });

const firstDay = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1);

/** "October 2026". */
export const monthTitle = (month: string) => monthName.format(firstDay(month));

/** "October". */
export const monthOnlyName = (month: string) => monthOnly.format(firstDay(month));
