/** A text field on this screen, less its border colour and background, which callers pick. */
export const FIELD_BOX =
  'min-h-34 w-full min-w-0 rounded-8 border px-10 py-4 text-14 text-ink placeholder:text-faint focus:border-accent focus:outline-none max-lg:min-h-44 max-lg:text-16';

export const FIELD = `${FIELD_BOX} border-line bg-card`;

/** A prompt's body: several lines, resized by hand. */
export const BODY_FIELD = `${FIELD} min-h-110 resize-y py-8 leading-[1.5]`;
