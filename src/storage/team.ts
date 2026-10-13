import { emptyTeam, parseTeamText, type Team } from '../core/team';
import { nowIso } from '../core/time';
import type { Kv } from './idb';

/**
 * The team is kept beside your data, never inside it, so your exports carry
 * only your own work. Same store as the data: IndexedDB, else localStorage.
 */

const KV_KEY = 'team';
const LOCAL_KEY = 'magica:v1:team';
const CHANNEL = 'magica:team';

export type TeamStore = {
  load(): Promise<{ team: Team; notice?: string }>;
  /** Rejects or throws when the write fails. */
  save(team: Team): Promise<void>;
  /** Another tab changed the team. */
  onExternalChange(handler: (team: Team) => void): void;
};

export function teamStore(kv: Kv | null): TeamStore {
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null;
  const read = async (): Promise<unknown> => (kv ? kv.get(KV_KEY) : globalThis.localStorage.getItem(LOCAL_KEY));
  const write = async (key: string, text: string) => {
    if (kv) await kv.put(key, text);
    else globalThis.localStorage.setItem(key === KV_KEY ? LOCAL_KEY : `magica:${key}`, text);
  };

  return {
    async load() {
      let raw: unknown;
      try {
        raw = await read();
      } catch {
        return { team: emptyTeam() };
      }
      if (typeof raw !== 'string') return { team: emptyTeam() };
      const team = parseTeamText(raw);
      if (team) return { team };
      // Unreadable: keep it aside rather than save over it.
      const key = `corrupt-team:${nowIso()}`;
      try {
        await write(key, raw);
      } catch {
        // Nothing more to do; the team starts empty either way.
      }
      return { team: emptyTeam(), notice: `Your team list couldn't be read. It was kept under “${key}”, and the team started empty.` };
    },
    async save(team) {
      const text = JSON.stringify(team);
      await write(KV_KEY, text);
      channel?.postMessage(text);
    },
    onExternalChange(handler) {
      if (!channel) return;
      channel.onmessage = (e: MessageEvent) => {
        const team = typeof e.data === 'string' ? parseTeamText(e.data) : null;
        if (team) handler(team);
      };
    },
  };
}
