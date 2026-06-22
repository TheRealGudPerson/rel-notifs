import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher, React, ReactNative as RN } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

export const vstorage = storage;
const UserStore = findByStoreName("UserStore");
const GuildStore = findByStoreName("GuildStore");
const UserProfileStore = findByStoreName("UserProfileStore");
const LocalNotificationUtils = findByProps("showNotification") ?? findByProps("createNotification") ?? findByProps("presentLocalNotification");
const { FormRow, FormSection, FormSwitchRow, FormText } = Forms;
let loaded = false;
const typeLabels = {
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
function pushMobileNotification(title, body) {
  try {
    if (LocalNotificationUtils?.showNotification) LocalNotificationUtils.showNotification({ title, body });
    else if (LocalNotificationUtils?.createNotification) LocalNotificationUtils.createNotification({ title, body });
    else if (LocalNotificationUtils?.presentLocalNotification) LocalNotificationUtils.presentLocalNotification({ alertTitle: title, alertBody: body });
    else showToast(`${title}: ${body}`, getAssetIDByName("NotificationsIcon"));
  } catch {
    showToast(`${title}: ${body}`, getAssetIDByName("NotificationsIcon"));
  }
}
function getUserName(userId, eventUser) {
  const user = eventUser ?? UserStore?.getUser?.(userId) ?? UserProfileStore?.getUserProfile?.(userId)?.user;
  return user?.globalName ?? user?.global_name ?? user?.username ?? userId;
}
function getGuildName(guildId, eventGuild) {
  const guild = eventGuild ?? GuildStore?.getGuild?.(guildId);
  return guild?.name ?? guildId;
}
function record(kind, targetId, name, notify) {
  ensureStorage();
  const entry = { id: `${Date.now()}-${kind}-${targetId}`, kind, targetId, name, timestamp: Date.now() };
  vstorage.changes = [entry, ...vstorage.changes].slice(0, vstorage.maxEntries);
  if (notify) pushMobileNotification(typeLabels[kind], name);
}
function relationshipAdd(event) {
  const userId = event?.relationship?.id ?? event?.user?.id ?? event?.id ?? event?.userId;
  if (userId) record("friend_added", userId, getUserName(userId, event?.user), false);
}
function relationshipRemove(event) {
  const userId = event?.relationship?.id ?? event?.user?.id ?? event?.id ?? event?.userId;
  if (userId) record("friend_removed", userId, getUserName(userId, event?.user), vstorage.notifyFriendRemovals);
}
function guildCreate(event) {
  const guild = event?.guild ?? event;
  const guildId = guild?.id ?? event?.guildId;
  if (guildId) record("server_added", guildId, getGuildName(guildId, guild), vstorage.notifyServerChanges);
}
function guildDelete(event) {
  const guild = event?.guild ?? event;
  const guildId = guild?.id ?? event?.guildId;
  if (guildId) record("server_removed", guildId, getGuildName(guildId, guild), vstorage.notifyServerChanges);
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
function ChangeList({ filter }) {
  const rows = vstorage.changes.filter(change => filter === "all" || change.kind === filter);
  if (!rows.length) return React.createElement(FormText, { style: { marginHorizontal: 16, marginVertical: 12 } }, "No changes recorded for this filter yet.");
  return React.createElement(React.Fragment, null, rows.map(change => React.createElement(FormRow, { key: change.id, label: change.name, subLabel: `${typeLabels[change.kind]} • ${new Date(change.timestamp).toLocaleString()}` })));
}
function Settings() {
  useProxy(vstorage);
  const [filter, setFilter] = React.useState("all");
  const filters = [["all", "All changes"], ["friend_added", "Mutual additions"], ["friend_removed", "Mutual removals"], ["server_added", "Server additions"], ["server_removed", "Server removals"]];
  return React.createElement(RN.ScrollView, null,
    React.createElement(FormSection, { title: "Notifications" },
      React.createElement(FormSwitchRow, { label: "Notify when a mutual removes you", value: vstorage.notifyFriendRemovals, onValueChange: () => vstorage.notifyFriendRemovals = !vstorage.notifyFriendRemovals }),
      React.createElement(FormSwitchRow, { label: "Notify when servers are added or removed", value: vstorage.notifyServerChanges, onValueChange: () => vstorage.notifyServerChanges = !vstorage.notifyServerChanges })),
    React.createElement(FormSection, { title: "Filter history" }, filters.map(([value, label]) => React.createElement(FormRow, { key: value, label, trailing: filter === value ? "✓" : undefined, onPress: () => setFilter(value) }))),
    React.createElement(FormSection, { title: "Change history" },
      React.createElement(ChangeList, { filter }),
      React.createElement(FormRow, { label: "Clear history", destructive: true, onPress: () => vstorage.changes = [] })));
}
export const settings = Settings;
