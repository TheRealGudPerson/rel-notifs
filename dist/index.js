var RelationshipServerNotifs = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.tsx
  var index_exports = {};
  __export(index_exports, {
    onLoad: () => onLoad,
    onUnload: () => onUnload,
    settings: () => settings,
    vstorage: () => vstorage
  });
  var import_metro = __require("@vendetta/metro");
  var import_common = __require("@vendetta/metro/common");
  var import_plugin = __require("@vendetta/plugin");
  var import_storage = __require("@vendetta/storage");
  var import_components = __require("@vendetta/ui/components");
  var import_toasts = __require("@vendetta/ui/toasts");
  var import_assets = __require("@vendetta/ui/assets");
  var import_jsx_runtime = __require("react/jsx-runtime");
  var vstorage = import_plugin.storage;
  var UserStore = (0, import_metro.findByStoreName)("UserStore");
  var GuildStore = (0, import_metro.findByStoreName)("GuildStore");
  var UserProfileStore = (0, import_metro.findByStoreName)("UserProfileStore");
  var LocalNotificationUtils = (0, import_metro.findByProps)("showNotification") ?? (0, import_metro.findByProps)("createNotification") ?? (0, import_metro.findByProps)("presentLocalNotification");
  var { FormRow, FormSection, FormSwitchRow, FormText } = import_components.Forms;
  var loaded = false;
  var typeLabels = {
    friend_added: "Mutual added",
    friend_removed: "Mutual removed",
    server_added: "Server added",
    server_removed: "Server removed"
  };
  function ensureStorage() {
    vstorage.changes ?? (vstorage.changes = []);
    vstorage.maxEntries ?? (vstorage.maxEntries = 250);
    vstorage.notifyFriendRemovals ?? (vstorage.notifyFriendRemovals = true);
    vstorage.notifyServerChanges ?? (vstorage.notifyServerChanges = true);
  }
  function pushMobileNotification(title, body) {
    try {
      if (LocalNotificationUtils?.showNotification) LocalNotificationUtils.showNotification({ title, body });
      else if (LocalNotificationUtils?.createNotification) LocalNotificationUtils.createNotification({ title, body });
      else if (LocalNotificationUtils?.presentLocalNotification) LocalNotificationUtils.presentLocalNotification({ alertTitle: title, alertBody: body });
      else (0, import_toasts.showToast)(`${title}: ${body}`, (0, import_assets.getAssetIDByName)("NotificationsIcon"));
    } catch {
      (0, import_toasts.showToast)(`${title}: ${body}`, (0, import_assets.getAssetIDByName)("NotificationsIcon"));
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
    if (!userId) return;
    record("friend_added", userId, getUserName(userId, event?.user), false);
  }
  function relationshipRemove(event) {
    const userId = event?.relationship?.id ?? event?.user?.id ?? event?.id ?? event?.userId;
    if (!userId) return;
    record("friend_removed", userId, getUserName(userId, event?.user), vstorage.notifyFriendRemovals);
  }
  function guildCreate(event) {
    const guild = event?.guild ?? event;
    const guildId = guild?.id ?? event?.guildId;
    if (!guildId) return;
    record("server_added", guildId, getGuildName(guildId, guild), vstorage.notifyServerChanges);
  }
  function guildDelete(event) {
    const guild = event?.guild ?? event;
    const guildId = guild?.id ?? event?.guildId;
    if (!guildId) return;
    record("server_removed", guildId, getGuildName(guildId, guild), vstorage.notifyServerChanges);
  }
  function onLoad() {
    if (loaded) return;
    ensureStorage();
    import_common.FluxDispatcher.subscribe("RELATIONSHIP_ADD", relationshipAdd);
    import_common.FluxDispatcher.subscribe("RELATIONSHIP_REMOVE", relationshipRemove);
    import_common.FluxDispatcher.subscribe("GUILD_CREATE", guildCreate);
    import_common.FluxDispatcher.subscribe("GUILD_DELETE", guildDelete);
    loaded = true;
  }
  function onUnload() {
    if (!loaded) return;
    import_common.FluxDispatcher.unsubscribe("RELATIONSHIP_ADD", relationshipAdd);
    import_common.FluxDispatcher.unsubscribe("RELATIONSHIP_REMOVE", relationshipRemove);
    import_common.FluxDispatcher.unsubscribe("GUILD_CREATE", guildCreate);
    import_common.FluxDispatcher.unsubscribe("GUILD_DELETE", guildDelete);
    loaded = false;
  }
  function ChangeList({ filter }) {
    const rows = vstorage.changes.filter((change) => filter === "all" || change.kind === filter);
    if (!rows.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormText, { style: { marginHorizontal: 16, marginVertical: 12 }, children: "No changes recorded for this filter yet." });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: rows.map((change) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormRow, { label: change.name, subLabel: `${typeLabels[change.kind]} \u2022 ${new Date(change.timestamp).toLocaleString()}` }, change.id)) });
  }
  function Settings() {
    (0, import_storage.useProxy)(vstorage);
    const [filter, setFilter] = import_common.React.useState("all");
    const filters = [["all", "All changes"], ["friend_added", "Mutual additions"], ["friend_removed", "Mutual removals"], ["server_added", "Server additions"], ["server_removed", "Server removals"]];
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_common.ReactNative.ScrollView, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormSection, { title: "Notifications", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSwitchRow, { label: "Notify when a mutual removes you", value: vstorage.notifyFriendRemovals, onValueChange: () => vstorage.notifyFriendRemovals = !vstorage.notifyFriendRemovals }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSwitchRow, { label: "Notify when servers are added or removed", value: vstorage.notifyServerChanges, onValueChange: () => vstorage.notifyServerChanges = !vstorage.notifyServerChanges })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSection, { title: "Filter history", children: filters.map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormRow, { label, trailing: filter === value ? "\u2713" : void 0, onPress: () => setFilter(value) }, value)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormSection, { title: "Change history", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChangeList, { filter }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormRow, { label: "Clear history", destructive: true, onPress: () => vstorage.changes = [] })
      ] })
    ] });
  }
  var settings = Settings;
  return __toCommonJS(index_exports);
})();
