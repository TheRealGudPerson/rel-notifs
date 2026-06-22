import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher, React, ReactNative as RN } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

type ChangeKind = "friend_added" | "friend_removed" | "server_added" | "server_removed";
type ChangeEntry = { id: string; kind: ChangeKind; targetId: string; name: string; timestamp: number };
type PluginStorage = { changes: ChangeEntry[]; maxEntries: number; notifyFriendRemovals: boolean; notifyServerChanges: boolean };

export const vstorage = storage as PluginStorage;

const UserStore = findByStoreName("UserStore");
const GuildStore = findByStoreName("GuildStore");
const UserProfileStore = findByStoreName("UserProfileStore");
const LocalNotificationUtils = findByProps("showNotification") ?? findByProps("createNotification") ?? findByProps("presentLocalNotification");
const { FormRow, FormSection, FormSwitchRow, FormText } = Forms;

let loaded = false;

const typeLabels: Record<ChangeKind, string> = {
  friend_added: "Mutual added",
  friend_removed: "Mutual removed",
  server_added: "Server added",
  server_removed: "Server removed"
};

function ensureStorage() {
  vstorage.changes ??= [];
  vstorage.maxEntries ??= 250;
  vstorage.notifyFriendRemovals ??= true;
  vstorage.notifyServerChanges ??= true;
}

function pushMobileNotification(title: string, body: string) {
  try {
    if (LocalNotificationUtils?.showNotification) LocalNotificationUtils.showNotification({ title, body });
    else if (LocalNotificationUtils?.createNotification) LocalNotificationUtils.createNotification({ title, body });
    else if (LocalNotificationUtils?.presentLocalNotification) LocalNotificationUtils.presentLocalNotification({ alertTitle: title, alertBody: body });
    else showToast(`${title}: ${body}`, getAssetIDByName("NotificationsIcon"));
  } catch {
    showToast(`${title}: ${body}`, getAssetIDByName("NotificationsIcon"));
  }
}

function getUserName(userId: string, eventUser?: any) {
  const user = eventUser ?? UserStore?.getUser?.(userId) ?? UserProfileStore?.getUserProfile?.(userId)?.user;
  return user?.globalName ?? user?.global_name ?? user?.username ?? userId;
}

function getGuildName(guildId: string, eventGuild?: any) {
  const guild = eventGuild ?? GuildStore?.getGuild?.(guildId);
  return guild?.name ?? guildId;
}

function record(kind: ChangeKind, targetId: string, name: string, notify: boolean) {
  ensureStorage();
  const entry: ChangeEntry = { id: `${Date.now()}-${kind}-${targetId}`, kind, targetId, name, timestamp: Date.now() };
  vstorage.changes = [entry, ...vstorage.changes].slice(0, vstorage.maxEntries);
  if (notify) pushMobileNotification(typeLabels[kind], name);
}

function relationshipAdd(event: any) {
  const userId = event?.relationship?.id ?? event?.user?.id ?? event?.id ?? event?.userId;
  if (!userId) return;
  record("friend_added", userId, getUserName(userId, event?.user), false);
}

function relationshipRemove(event: any) {
  const userId = event?.relationship?.id ?? event?.user?.id ?? event?.id ?? event?.userId;
  if (!userId) return;
  record("friend_removed", userId, getUserName(userId, event?.user), vstorage.notifyFriendRemovals);
}

function guildCreate(event: any) {
  const guild = event?.guild ?? event;
  const guildId = guild?.id ?? event?.guildId;
  if (!guildId) return;
  record("server_added", guildId, getGuildName(guildId, guild), vstorage.notifyServerChanges);
}

function guildDelete(event: any) {
  const guild = event?.guild ?? event;
  const guildId = guild?.id ?? event?.guildId;
  if (!guildId) return;
  record("server_removed", guildId, getGuildName(guildId, guild), vstorage.notifyServerChanges);
}

export function onLoad() {
  if (loaded) return;
  ensureStorage();
  FluxDispatcher.subscribe("RELATIONSHIP_ADD", relationshipAdd);
  FluxDispatcher.subscribe("RELATIONSHIP_REMOVE", relationshipRemove);
  FluxDispatcher.subscribe("GUILD_CREATE", guildCreate);
  FluxDispatcher.subscribe("GUILD_DELETE", guildDelete);
  loaded = true;
}

export function onUnload() {
  if (!loaded) return;
  FluxDispatcher.unsubscribe("RELATIONSHIP_ADD", relationshipAdd);
  FluxDispatcher.unsubscribe("RELATIONSHIP_REMOVE", relationshipRemove);
  FluxDispatcher.unsubscribe("GUILD_CREATE", guildCreate);
  FluxDispatcher.unsubscribe("GUILD_DELETE", guildDelete);
  loaded = false;
}

function ChangeList({ filter }: { filter: "all" | ChangeKind }) {
  const rows = vstorage.changes.filter(change => filter === "all" || change.kind === filter);
  if (!rows.length) return <FormText style={{ marginHorizontal: 16, marginVertical: 12 }}>No changes recorded for this filter yet.</FormText>;
  return <>{rows.map(change => <FormRow key={change.id} label={change.name} subLabel={`${typeLabels[change.kind]} • ${new Date(change.timestamp).toLocaleString()}`} />)}</>;
}

function Settings() {
  useProxy(vstorage);
  const [filter, setFilter] = React.useState<"all" | ChangeKind>("all");
  const filters: Array<["all" | ChangeKind, string]> = [["all", "All changes"], ["friend_added", "Mutual additions"], ["friend_removed", "Mutual removals"], ["server_added", "Server additions"], ["server_removed", "Server removals"]];
  return <RN.ScrollView>
    <FormSection title="Notifications">
      <FormSwitchRow label="Notify when a mutual removes you" value={vstorage.notifyFriendRemovals} onValueChange={() => (vstorage.notifyFriendRemovals = !vstorage.notifyFriendRemovals)} />
      <FormSwitchRow label="Notify when servers are added or removed" value={vstorage.notifyServerChanges} onValueChange={() => (vstorage.notifyServerChanges = !vstorage.notifyServerChanges)} />
    </FormSection>
    <FormSection title="Filter history">
      {filters.map(([value, label]) => <FormRow key={value} label={label} trailing={filter === value ? "✓" : undefined} onPress={() => setFilter(value)} />)}
    </FormSection>
    <FormSection title="Change history">
      <ChangeList filter={filter} />
      <FormRow label="Clear history" destructive onPress={() => (vstorage.changes = [])} />
    </FormSection>
  </RN.ScrollView>;
}

export const settings = Settings;
