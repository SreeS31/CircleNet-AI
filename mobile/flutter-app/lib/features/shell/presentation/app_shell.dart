import 'dart:math' as math;
import 'dart:async';
import 'dart:convert';

import 'package:circlenet_mobile/core/models/network_models.dart';
import 'package:circlenet_mobile/core/network/circlenet_api.dart';
import 'package:circlenet_mobile/core/platform/attachment_opener.dart';
import 'package:circlenet_mobile/core/theme/app_theme.dart';
import 'package:circlenet_mobile/features/auth/data/session_store.dart';
import 'package:circlenet_mobile/features/auth/models/auth_models.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:fast_contacts/fast_contacts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.session, required this.onSignedOut});
  final AuthTokenBundle session;
  final VoidCallback onSignedOut;
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;
  late final CircleNetApi api = CircleNetApi(widget.session);
  Timer? incomingTimer;
  StreamSubscription<List<ConnectivityResult>>? connectivitySubscription;
  bool showingIncomingCall = false;
  int syncVersion = 0;
  List<Widget> get pages => <Widget>[
        NetworkHome(key: ValueKey('network-$syncVersion'), api: api),
        CirclesScreen(key: ValueKey('circles-$syncVersion'), api: api),
        NotificationsScreen(
            key: ValueKey('notifications-$syncVersion'), api: api),
        DiscoverScreen(api: api),
        ProfileScreen(key: ValueKey('profile-$syncVersion'), api: api)
      ];
  static const destinations = [
    NavigationDestination(
        icon: Icon(Icons.account_tree_outlined),
        selectedIcon: Icon(Icons.account_tree_rounded),
        label: 'Network'),
    NavigationDestination(
        icon: Icon(Icons.forum_outlined),
        selectedIcon: Icon(Icons.forum_rounded),
        label: 'Circles'),
    NavigationDestination(
        icon: Icon(Icons.notifications_outlined),
        selectedIcon: Icon(Icons.notifications_rounded),
        label: 'Alerts'),
    NavigationDestination(
        icon: Icon(Icons.person_search_outlined),
        selectedIcon: Icon(Icons.person_search_rounded),
        label: 'Discover'),
    NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person_rounded),
        label: 'Profile')
  ];
  @override
  void initState() {
    super.initState();
    incomingTimer =
        Timer.periodic(const Duration(seconds: 3), (_) => checkIncomingCalls());
    connectivitySubscription =
        Connectivity().onConnectivityChanged.listen((results) {
      if (mounted &&
          results.any((result) => result != ConnectivityResult.none)) {
        setState(() => syncVersion++);
        checkIncomingCalls();
      }
    });
    Future<void>.delayed(Duration.zero, checkIncomingCalls);
    WidgetsBinding.instance.addPostFrameCallback((_) => maybeSuggestContactOrganizer());
  }

  @override
  void dispose() {
    incomingTimer?.cancel();
    connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> checkIncomingCalls() async {
    if (!mounted || showingIncomingCall) return;
    try {
      final calls = await api.incomingCalls();
      if (!mounted || calls.isEmpty) return;
      showingIncomingCall = true;
      final call = calls.first;
      final accept = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
                  icon: Icon(
                      call.callType == 'VIDEO'
                          ? Icons.videocam_rounded
                          : Icons.call_rounded,
                      color: AppTheme.primary,
                      size: 38),
                  title: Text(call.callerName),
                  content: Text('Incoming ${call.callType.toLowerCase()} call'),
                  actionsAlignment: MainAxisAlignment.center,
                  actions: [
                    FilledButton.tonal(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Decline')),
                    FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Accept'))
                  ]));
      if (accept == true && mounted) {
        await Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) =>
                    DirectCallScreen(api: api, incomingCall: call)));
      } else if (accept == false) {
        await api.rejectCall(call.id);
      }
    } catch (_) {
      // Polling stays silent; the next cycle retries automatically.
    } finally {
      showingIncomingCall = false;
    }
  }

  Future<void> maybeSuggestContactOrganizer() async {
    if (!mounted || kIsWeb) return;
    final preferences = await SharedPreferences.getInstance();
    if (preferences.getBool('contact_organizer_prompted') == true || !mounted) return;
    await preferences.setBool('contact_organizer_prompted', true);
    if (!mounted) return;
    final open = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      icon: const Icon(Icons.auto_awesome_rounded, color: AppTheme.primary, size: 38),
      title: const Text('Organize your contacts?'),
      content: const Text('This optional step can suggest family relationships and circles after you grant contact permission. You review everything before it is added.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Later')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Review contacts')),
      ],
    ));
    if (open == true && mounted) {
      await Navigator.push(context, MaterialPageRoute(builder: (_) => ContactOrganizerScreen(api: api)));
      if (mounted) setState(() => syncVersion++);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    final content = IndexedStack(index: index, children: pages);
    return Scaffold(
      body: SafeArea(
        child: wide
            ? Row(children: [
                NavigationRail(
                  selectedIndex: index,
                  onDestinationSelected: (value) =>
                      setState(() => index = value),
                  labelType: NavigationRailLabelType.all,
                  leading: const Padding(
                    padding: EdgeInsets.only(bottom: 20),
                    child: _BrandMark(),
                  ),
                  trailing: Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: IconButton(
                        tooltip: 'Sign out',
                        onPressed: signOut,
                        icon: const Icon(Icons.logout_rounded),
                      ),
                    ),
                  ),
                  destinations: destinations
                      .map((item) => NavigationRailDestination(
                            icon: item.icon,
                            selectedIcon: item.selectedIcon,
                            label: Text(item.label),
                          ))
                      .toList(),
                ),
                const VerticalDivider(width: 1),
                Expanded(child: content),
              ])
            : content,
      ),
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              selectedIndex: index,
              onDestinationSelected: (value) => setState(() => index = value),
              destinations: destinations,
            ),
    );
  }

  Future<void> signOut() async {
    await SessionStore().clear();
    widget.onSignedOut();
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();
  @override
  Widget build(BuildContext context) =>
      const Column(mainAxisSize: MainAxisSize.min, children: [
        CircleAvatar(
            backgroundColor: AppTheme.primary,
            child: Icon(Icons.hub_rounded, color: Colors.white)),
        SizedBox(height: 6),
        Text('CircleNet',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12))
      ]);
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, required this.api});
  final CircleNetApi api;
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool loading = true;
  String? error;
  List<Map<String, dynamic>> items = [];
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.api.notifications();
      if (mounted) setState(() => items = data);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> read(Map<String, dynamic> item) async {
    if (item['readAt'] != null) return;
    await widget.api.readNotification((item['id'] as num).toInt());
    await load();
  }

  @override
  Widget build(BuildContext context) => Column(children: [
        _PageHeader(
            eyebrow: 'STAY UPDATED',
            title: 'Notifications',
            subtitle: 'Messages, calls, circles and invitations.',
            action: Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(
                  tooltip: 'Preferences',
                  onPressed: () => showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) =>
                          NotificationPreferencesSheet(api: widget.api)),
                  icon: const Icon(Icons.tune_rounded)),
              IconButton(
                  tooltip: 'Mark all read',
                  onPressed: () async {
                    await widget.api.readAllNotifications();
                    await load();
                  },
                  icon: const Icon(Icons.done_all_rounded))
            ])),
        if (loading) const LinearProgressIndicator(minHeight: 2),
        if (error != null)
          Padding(
              padding: const EdgeInsets.all(16),
              child: Text(error!,
                  style: const TextStyle(
                      color: Colors.red, fontWeight: FontWeight.w700))),
        Expanded(
            child:
                RefreshIndicator(onRefresh: load, child: _notificationList())),
      ]);
  Widget _notificationList() {
    if (items.isEmpty && !loading) {
      return ListView(children: const [
        SizedBox(height: 120),
        Icon(Icons.notifications_none_rounded,
            size: 52, color: Color(0xFF9A8CD6)),
        Center(
            child: Padding(
                padding: EdgeInsets.all(12),
                child: Text('You are all caught up.')))
      ]);
    }
    return ListView.separated(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (context, index) {
          final item = items[index];
          final unread = item['readAt'] == null;
          return Material(
              color: unread ? const Color(0xFFF1ECFF) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => read(item),
                  child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                                radius: 19,
                                backgroundColor: unread
                                    ? AppTheme.primary
                                    : const Color(0xFFEDEAF7),
                                child: Icon(
                                    _notificationIcon('${item['type']}'),
                                    size: 19,
                                    color: unread
                                        ? Colors.white
                                        : AppTheme.primary)),
                            const SizedBox(width: 10),
                            Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Text('${item['title']}',
                                      style: TextStyle(
                                          fontWeight: unread
                                              ? FontWeight.w900
                                              : FontWeight.w700,
                                          color: AppTheme.ink)),
                                  const SizedBox(height: 2),
                                  Text('${item['body']}',
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFF596579))),
                                  const SizedBox(height: 4),
                                  Text(_notificationTime(item['createdAt']),
                                      style: const TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF8992A3)))
                                ])),
                            if (unread)
                              const Padding(
                                  padding: EdgeInsets.only(top: 7, left: 6),
                                  child: CircleAvatar(
                                      radius: 4,
                                      backgroundColor: AppTheme.primary))
                          ]))));
        });
  }

  IconData _notificationIcon(String type) => switch (type) {
        'DIRECT_MESSAGE' => Icons.chat_bubble_rounded,
        'CIRCLE_MESSAGE' => Icons.groups_rounded,
        'CALL' => Icons.call_rounded,
        'INVITATION' => Icons.person_add_rounded,
        'RELATIONSHIP' => Icons.family_restroom_rounded,
        _ => Icons.notifications_rounded
      };
  String _notificationTime(dynamic value) {
    final text = '${value ?? ''}';
    return text.length > 16
        ? text.substring(0, 16).replaceFirst('T', ' ')
        : text;
  }
}

class NotificationPreferencesSheet extends StatefulWidget {
  const NotificationPreferencesSheet({super.key, required this.api});
  final CircleNetApi api;
  @override
  State<NotificationPreferencesSheet> createState() =>
      _NotificationPreferencesSheetState();
}

class _NotificationPreferencesSheetState
    extends State<NotificationPreferencesSheet> {
  Map<String, dynamic>? values;
  String? error;
  bool saving = false;
  @override
  void initState() {
    super.initState();
    widget.api.notificationPreferences().then((v) {
      if (mounted) setState(() => values = v);
    }).catchError((e) {
      if (mounted) setState(() => error = e.toString());
    });
  }

  @override
  Widget build(BuildContext context) => SafeArea(
      child: Padding(
          padding: EdgeInsets.fromLTRB(
              16, 12, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
          child: values == null
              ? SizedBox(
                  height: 180,
                  child: Center(
                      child: error == null
                          ? const CircularProgressIndicator()
                          : Text(error!,
                              style: const TextStyle(color: Colors.red))))
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                      Row(children: [
                        Expanded(
                            child: Text('Notification preferences',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w900))),
                        IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close))
                      ]),
                      const Text('Delivery channels',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      Wrap(
                          spacing: 8,
                          children: [
                            'emailEnabled',
                            'smsEnabled',
                            'pushEnabled'
                          ]
                              .map((key) => FilterChip(
                                  label: Text(_label(key)),
                                  selected: values![key] == true,
                                  onSelected: (v) =>
                                      setState(() => values![key] = v)))
                              .toList()),
                      const SizedBox(height: 12),
                      const Text('Notify me about',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            'messagesEnabled',
                            'circlesEnabled',
                            'relationshipsEnabled',
                            'callsEnabled',
                            'invitationsEnabled'
                          ]
                              .map((key) => FilterChip(
                                  label: Text(_label(key)),
                                  selected: values![key] == true,
                                  onSelected: (v) =>
                                      setState(() => values![key] = v)))
                              .toList()),
                      const SizedBox(height: 14),
                      SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                              onPressed: saving ? null : save,
                              child: Text(
                                  saving ? 'Saving...' : 'Save preferences')))
                    ])));
  String _label(String key) =>
      const {
        'emailEnabled': 'Email',
        'smsEnabled': 'SMS',
        'pushEnabled': 'Push',
        'messagesEnabled': 'Messages',
        'circlesEnabled': 'Circles',
        'relationshipsEnabled': 'Relationships',
        'callsEnabled': 'Calls',
        'invitationsEnabled': 'Invitations'
      }[key] ??
      key;
  Future<void> save() async {
    setState(() => saving = true);
    try {
      await widget.api.updateNotificationPreferences(values!);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader(
      {required this.eyebrow,
      required this.title,
      required this.subtitle,
      this.action});
  final String eyebrow, title, subtitle;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(eyebrow,
              style: const TextStyle(
                  color: AppTheme.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2)),
          const SizedBox(height: 4),
          Text(title,
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(fontWeight: FontWeight.w900, color: AppTheme.ink)),
          const SizedBox(height: 3),
          Text(subtitle,
              style: const TextStyle(color: Color(0xFF718096), fontSize: 13))
        ])),
        if (action != null) action!
      ]));
}

class _Avatar extends StatelessWidget {
  const _Avatar(this.person, {this.radius = 24});
  final Person person;
  final double radius;
  @override
  Widget build(BuildContext context) => CircleAvatar(
      radius: radius,
      backgroundColor: const Color(0xFFE9E4FF),
      backgroundImage: person.profilePhoto?.isNotEmpty == true
          ? NetworkImage(person.profilePhoto!)
          : null,
      child: person.profilePhoto?.isNotEmpty == true
          ? null
          : Text(person.displayName.characters.first.toUpperCase(),
              style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: radius * .75,
                  color: AppTheme.primary)));
}

class _ErrorState extends StatelessWidget {
  const _ErrorState(this.message, {this.retry});
  final String message;
  final VoidCallback? retry;
  @override
  Widget build(BuildContext context) => Center(
      child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.cloud_off_rounded,
                size: 46, color: Color(0xFFC34D62)),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: Color(0xFFB4233C), fontWeight: FontWeight.w700)),
            if (retry != null) ...[
              const SizedBox(height: 12),
              FilledButton.tonal(
                  onPressed: retry, child: const Text('Try again'))
            ]
          ])));
}

class NetworkHome extends StatefulWidget {
  const NetworkHome({super.key, required this.api});
  final CircleNetApi api;
  @override
  State<NetworkHome> createState() => _NetworkHomeState();
}

class _NetworkHomeState extends State<NetworkHome> {
  List<Relationship>? items;
  UserProfileModel? profile;
  bool treeView = true;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      error = null;
    });
    try {
      final values = await Future.wait([
        widget.api.relationships(),
        widget.api.profile(),
      ]);
      if (mounted) {
        setState(() {
          items = values[0] as List<Relationship>;
          profile = values[1] as UserProfileModel;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
      onRefresh: load,
      child: CustomScrollView(slivers: [
        SliverToBoxAdapter(
            child: _PageHeader(
                eyebrow: 'MY CIRCLENET',
                title: 'Relationships',
                subtitle: 'Your connected family and social network.',
                action: SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment(
                          value: true,
                          icon: Icon(Icons.account_tree_rounded),
                          tooltip: 'Tree view'),
                      ButtonSegment(
                          value: false,
                          icon: Icon(Icons.view_list_rounded),
                          tooltip: 'List view')
                    ],
                    selected: {
                      treeView
                    },
                    showSelectedIcon: false,
                    onSelectionChanged: (value) =>
                        setState(() => treeView = value.first)))),
        if (error != null)
          SliverFillRemaining(child: _ErrorState(error!, retry: load))
        else if (items == null)
          const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()))
        else if (items!.isEmpty)
          const SliverFillRemaining(
              child: Center(
                  child: Text('Add your first relationship from Discover.')))
        else if (treeView)
          SliverFillRemaining(
              hasScrollBody: true,
              child: _FamilyTreeView(
                  relationships: items!,
                  profile: profile,
                  api: widget.api,
                  onChanged: load))
        else
          SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
              sliver: SliverList.separated(
                  itemCount: items!.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => RelationshipTile(
                      relationship: items![i],
                      api: widget.api,
                      onRemoved: load)))
      ]));
}

class _FamilyTreeView extends StatelessWidget {
  const _FamilyTreeView({
    required this.relationships,
    required this.profile,
    required this.api,
    required this.onChanged,
  });

  final List<Relationship> relationships;
  final UserProfileModel? profile;
  final CircleNetApi api;
  final VoidCallback onChanged;

  static const nodeWidth = 142.0;
  static const nodeHeight = 108.0;
  static const horizontalGap = 42.0;
  static const verticalGap = 72.0;

  @override
  Widget build(BuildContext context) {
    final layout = _layout(MediaQuery.sizeOf(context).width);
    return Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 92),
        decoration: BoxDecoration(
            color: const Color(0xFFFBFAFF),
            border: Border.all(color: const Color(0xFFE1DBF2)),
            borderRadius: BorderRadius.circular(22)),
        clipBehavior: Clip.antiAlias,
        child: Stack(children: [
          InteractiveViewer(
              constrained: false,
              minScale: .35,
              maxScale: 2.2,
              boundaryMargin: const EdgeInsets.all(180),
              child: SizedBox(
                  width: layout.width,
                  height: layout.height,
                  child: Stack(children: [
                    CustomPaint(
                        size: Size(layout.width, layout.height),
                        painter: _TreeConnectorPainter(
                            relationships: relationships,
                            positions: layout.positions)),
                    ...relationships.map((relationship) {
                      final position =
                          layout.positions[relationship.person.id]!;
                      return Positioned(
                          left: position.dx,
                          top: position.dy,
                          child: _TreePersonNode(
                              relationship: relationship,
                              onTap: () => RelationshipTile(
                                      relationship: relationship,
                                      api: api,
                                      onRemoved: onChanged)
                                  .showConnect(context)));
                    }),
                    Positioned(
                        left: layout.positions[-1]!.dx,
                        top: layout.positions[-1]!.dy,
                        child: _SelfTreeNode(profile: profile))
                  ]))),
          Positioned(
              right: 12,
              bottom: 12,
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .92),
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: const [
                        BoxShadow(color: Color(0x16000000), blurRadius: 10)
                      ]),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.pinch_rounded,
                        size: 16, color: AppTheme.primary),
                    SizedBox(width: 5),
                    Text('Pinch and drag',
                        style: TextStyle(
                            fontSize: 10, fontWeight: FontWeight.w800))
                  ])))
        ]));
  }

  _TreeLayout _layout(double viewportWidth) {
    final personIds = relationships.map((item) => item.person.id).toSet();
    final levels = <int, int>{-1: 0};
    for (var pass = 0; pass < relationships.length + 2; pass++) {
      var changed = false;
      for (final item in relationships) {
        if (levels.containsKey(item.person.id)) continue;
        final anchor = item.relativeToUserId;
        final anchorId =
            anchor != null && personIds.contains(anchor) ? anchor : -1;
        final anchorLevel = levels[anchorId];
        if (anchorLevel == null) continue;
        levels[item.person.id] = anchorLevel + _levelDelta(item.type);
        changed = true;
      }
      if (!changed) break;
    }
    for (final item in relationships) {
      levels.putIfAbsent(item.person.id, () => 0);
    }

    final byLevel = <int, List<int>>{};
    levels.forEach((id, level) => byLevel.putIfAbsent(level, () => []).add(id));
    final minLevel = levels.values.reduce(math.min);
    final maxLevel = levels.values.reduce(math.max);
    final maxNodes =
        byLevel.values.map((items) => items.length).reduce(math.max);
    final width = math.max(viewportWidth - 24,
        maxNodes * nodeWidth + math.max(0, maxNodes - 1) * horizontalGap + 80);
    final height = (maxLevel - minLevel + 1) * (nodeHeight + verticalGap) + 80;
    final positions = <int, Offset>{};
    for (var level = maxLevel; level >= minLevel; level--) {
      final ids = byLevel[level] ?? [];
      ids.sort((a, b) => _order(a).compareTo(_order(b)));
      final rowWidth =
          ids.length * nodeWidth + math.max(0, ids.length - 1) * horizontalGap;
      final start = (width - rowWidth) / 2;
      for (var index = 0; index < ids.length; index++) {
        positions[ids[index]] = Offset(
            start + index * (nodeWidth + horizontalGap),
            38 + (maxLevel - level) * (nodeHeight + verticalGap));
      }
    }
    return _TreeLayout(width, height, positions);
  }

  int _order(int id) {
    if (id == -1) return 50;
    final item = relationships.firstWhere((value) => value.person.id == id);
    final type = item.type.toLowerCase();
    if (type.contains('brother') ||
        type.contains('sister') ||
        type.contains('sibling')) {
      return 20;
    }
    if (_isPartner(type)) return 60;
    return 40;
  }

  static int _levelDelta(String value) {
    final type = value.toLowerCase();
    if (type.contains('grandparent')) return 2;
    if (type.contains('parent') || type == 'father' || type == 'mother') {
      return 1;
    }
    if (type.contains('grandchild')) return -2;
    if (type == 'child' || type == 'son' || type == 'daughter') return -1;
    return 0;
  }

  static bool _isPartner(String value) =>
      value.contains('spouse') ||
      value.contains('wife') ||
      value.contains('husband');
}

class _TreeLayout {
  const _TreeLayout(this.width, this.height, this.positions);
  final double width, height;
  final Map<int, Offset> positions;
}

class _TreeConnectorPainter extends CustomPainter {
  const _TreeConnectorPainter(
      {required this.relationships, required this.positions});
  final List<Relationship> relationships;
  final Map<int, Offset> positions;

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = const Color(0xFF75639B)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final fill = Paint()..color = const Color(0xFF75639B);
    final ids = relationships.map((item) => item.person.id).toSet();
    for (final item in relationships) {
      final target = positions[item.person.id];
      final anchorId =
          item.relativeToUserId != null && ids.contains(item.relativeToUserId)
              ? item.relativeToUserId!
              : -1;
      final source = positions[anchorId];
      if (source == null || target == null) continue;
      final partner = _FamilyTreeView._isPartner(item.type.toLowerCase());
      final sourceCenter = Offset(source.dx + _FamilyTreeView.nodeWidth / 2,
          source.dy + _FamilyTreeView.nodeHeight / 2);
      final targetCenter = Offset(target.dx + _FamilyTreeView.nodeWidth / 2,
          target.dy + _FamilyTreeView.nodeHeight / 2);
      if (partner) {
        canvas.drawLine(
            sourceCenter,
            targetCenter,
            Paint()
              ..color = const Color(0xFFE36A98)
              ..strokeWidth = 2.4);
        _label(
            canvas,
            '♥',
            Offset((sourceCenter.dx + targetCenter.dx) / 2,
                (sourceCenter.dy + targetCenter.dy) / 2 - 9),
            color: const Color(0xFFD34F80));
        continue;
      }
      final downward = targetCenter.dy > sourceCenter.dy;
      final start = Offset(sourceCenter.dx,
          downward ? source.dy + _FamilyTreeView.nodeHeight : source.dy);
      final end = Offset(targetCenter.dx,
          downward ? target.dy : target.dy + _FamilyTreeView.nodeHeight);
      final midY = (start.dy + end.dy) / 2;
      final path = Path()
        ..moveTo(start.dx, start.dy)
        ..lineTo(start.dx, midY)
        ..lineTo(end.dx, midY)
        ..lineTo(end.dx, end.dy);
      canvas.drawPath(path, line);
      final direction = downward ? 1.0 : -1.0;
      canvas.drawPath(
          Path()
            ..moveTo(end.dx, end.dy)
            ..lineTo(end.dx - 5, end.dy - 8 * direction)
            ..lineTo(end.dx + 5, end.dy - 8 * direction)
            ..close(),
          fill);
      _label(canvas, item.type, Offset(end.dx, midY - 8));
    }
  }

  void _label(Canvas canvas, String text, Offset center,
      {Color color = const Color(0xFF56437F)}) {
    final painter = TextPainter(
        text: TextSpan(
            text: text,
            style: TextStyle(
                color: color, fontSize: 9, fontWeight: FontWeight.w900)),
        textDirection: TextDirection.ltr)
      ..layout();
    painter.paint(canvas,
        Offset(center.dx - painter.width / 2, center.dy - painter.height / 2));
  }

  @override
  bool shouldRepaint(covariant _TreeConnectorPainter oldDelegate) =>
      oldDelegate.relationships != relationships ||
      oldDelegate.positions != positions;
}

class _TreePersonNode extends StatelessWidget {
  const _TreePersonNode({required this.relationship, required this.onTap});
  final Relationship relationship;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final gender = (relationship.person.gender ?? '').toUpperCase();
    final border = gender == 'FEMALE'
        ? const Color(0xFFF1A1C4)
        : gender == 'MALE'
            ? const Color(0xFF77C8F4)
            : const Color(0xFFF2BC68);
    return SizedBox(
        width: _FamilyTreeView.nodeWidth,
        height: _FamilyTreeView.nodeHeight,
        child: Material(
            color: Colors.white,
            elevation: 3,
            shadowColor: border.withValues(alpha: .25),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: border, width: 2)),
            child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: onTap,
                child: Padding(
                    padding: const EdgeInsets.all(9),
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _Avatar(relationship.person, radius: 25),
                          const SizedBox(height: 5),
                          Text(relationship.person.displayName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.w900)),
                          Text(relationship.type,
                              maxLines: 1,
                              style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800))
                        ])))));
  }
}

class _SelfTreeNode extends StatelessWidget {
  const _SelfTreeNode({required this.profile});
  final UserProfileModel? profile;

  @override
  Widget build(BuildContext context) {
    final name = [profile?.value('firstName'), profile?.value('surname')]
        .where((value) => value?.trim().isNotEmpty == true)
        .join(' ');
    final photo = profile?.value('profilePhoto') ?? '';
    return SizedBox(
        width: _FamilyTreeView.nodeWidth,
        height: _FamilyTreeView.nodeHeight,
        child: DecoratedBox(
            decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFF6957CF), Color(0xFF9670D8)]),
                borderRadius: BorderRadius.circular(18),
                boxShadow: const [
                  BoxShadow(color: Color(0x33705CC6), blurRadius: 18)
                ]),
            child:
                Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white24,
                  backgroundImage:
                      photo.isNotEmpty ? NetworkImage(photo) : null,
                  child: photo.isEmpty
                      ? Text(name.isEmpty ? 'Y' : name.characters.first,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w900))
                      : null),
              const SizedBox(height: 5),
              Text(name.isEmpty ? 'You' : name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w900)),
              const Text('You',
                  style: TextStyle(color: Colors.white70, fontSize: 9))
            ])));
  }
}

class RelationshipTile extends StatelessWidget {
  const RelationshipTile(
      {super.key,
      required this.relationship,
      required this.api,
      required this.onRemoved});
  final Relationship relationship;
  final CircleNetApi api;
  final VoidCallback onRemoved;
  @override
  Widget build(BuildContext context) {
    final person = relationship.person;
    return Card(
        child: InkWell(
            borderRadius: BorderRadius.circular(22),
            onTap: person.canConnect ? () => showConnect(context) : null,
            child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  _Avatar(person),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(person.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: AppTheme.ink)),
                        const SizedBox(height: 6),
                        Wrap(spacing: 6, runSpacing: 5, children: [
                          _Tag(relationship.type, const Color(0xFFE2F6EC),
                              const Color(0xFF157A4B)),
                          _Tag(relationship.visibilityScope,
                              const Color(0xFFECE7FF), const Color(0xFF5A43A5)),
                          _Tag(
                              person.accountStatus == 'ACTIVE'
                                  ? 'Verified'
                                  : 'Not verified',
                              person.accountStatus == 'ACTIVE'
                                  ? const Color(0xFFE2F6EC)
                                  : const Color(0xFFFFEFC7),
                              person.accountStatus == 'ACTIVE'
                                  ? const Color(0xFF157A4B)
                                  : const Color(0xFF9A6100))
                        ])
                      ])),
                  if (person.canConnect)
                    IconButton.filledTonal(
                        tooltip: 'Connect',
                        onPressed: () => showConnect(context),
                        icon: const Icon(Icons.connect_without_contact_rounded))
                ]))));
  }

  void showConnect(BuildContext context) => showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
          child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(relationship.person.displayName,
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    const Text('Choose how you want to connect.',
                        style: TextStyle(color: Color(0xFF718096))),
                    const SizedBox(height: 16),
                    _ConnectAction(
                        icon: Icons.chat_bubble_rounded,
                        label: 'Text message',
                        color: AppTheme.primary,
                        onTap: () {
                          Navigator.pop(context);
                          Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => DirectChatScreen(
                                      api: api, person: relationship.person)));
                        }),
                    _ConnectAction(
                        icon: Icons.call_rounded,
                        label: 'Audio call',
                        color: const Color(0xFF16875C),
                        onTap: () => _startCall(context, 'AUDIO')),
                    _ConnectAction(
                        icon: Icons.videocam_rounded,
                        label: 'Video call',
                        color: const Color(0xFFD15C87),
                        onTap: () => _startCall(context, 'VIDEO')),
                    const Divider(height: 22),
                    _ConnectAction(
                        icon: Icons.edit_rounded,
                        label: 'Edit relationship',
                        color: AppTheme.primary,
                        onTap: () {
                          Navigator.pop(context);
                          _edit(context);
                        }),
                    _ConnectAction(
                        icon: Icons.person_remove_rounded,
                        label: 'Remove relationship',
                        color: const Color(0xFFB4233C),
                        onTap: () {
                          Navigator.pop(context);
                          _remove(context);
                        })
                  ]))));
  void _startCall(BuildContext context, String type) {
    Navigator.pop(context);
    Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) => DirectCallScreen(
                api: api, person: relationship.person, callType: type)));
  }

  Future<void> _edit(BuildContext context) async {
    var type = relationship.type;
    var visibility = relationship.visibilityScope;
    final saved = await showModalBottomSheet<bool>(
        context: context,
        showDragHandle: true,
        builder: (context) => StatefulBuilder(
            builder: (context, setModal) => SafeArea(
                child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text('Edit ${relationship.person.displayName}',
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 14),
                      DropdownButtonFormField<String>(
                          initialValue: type,
                          decoration:
                              const InputDecoration(labelText: 'Relationship'),
                          items: const [
                            'Friend',
                            'Spouse',
                            'Father',
                            'Mother',
                            'Parent',
                            'Child',
                            'Son',
                            'Daughter',
                            'Sibling',
                            'Brother',
                            'Sister',
                            'Colleague',
                            'Relative'
                          ]
                              .map((value) => DropdownMenuItem(
                                  value: value, child: Text(value)))
                              .toList(),
                          onChanged: (value) => setModal(() => type = value!)),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                          initialValue: visibility,
                          decoration: const InputDecoration(labelText: 'View'),
                          items: const [
                            DropdownMenuItem(
                                value: 'FRIENDS', child: Text('Friends')),
                            DropdownMenuItem(
                                value: 'RELATIVES', child: Text('Relatives')),
                            DropdownMenuItem(
                                value: 'COLLEAGUES', child: Text('Colleagues')),
                            DropdownMenuItem(
                                value: 'PUBLIC', child: Text('Public'))
                          ],
                          onChanged: (value) =>
                              setModal(() => visibility = value!)),
                      const SizedBox(height: 16),
                      SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                              onPressed: () => Navigator.pop(context, true),
                              child: const Text('Save changes')))
                    ])))));
    if (saved != true) return;
    try {
      await api.updateRelationship(relationship, type, visibility);
      onRemoved();
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(e.toString()),
            backgroundColor: const Color(0xFFB4233C)));
      }
    }
  }

  Future<void> _remove(BuildContext context) async {
    final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Remove relationship?'),
                content: Text(
                    '${relationship.person.displayName} will be removed from your relationship tree.'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Remove'))
                ]));
    if (confirmed != true) return;
    try {
      await api.removeRelationship(relationship.id);
      onRemoved();
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(e.toString()),
            backgroundColor: const Color(0xFFB4233C)));
      }
    }
  }
}

class DirectCallScreen extends StatefulWidget {
  const DirectCallScreen(
      {super.key,
      required this.api,
      this.person,
      this.callType = 'AUDIO',
      this.incomingCall});
  final CircleNetApi api;
  final Person? person;
  final String callType;
  final DirectCallModel? incomingCall;

  @override
  State<DirectCallScreen> createState() => _DirectCallScreenState();
}

class _DirectCallScreenState extends State<DirectCallScreen> {
  final localRenderer = RTCVideoRenderer();
  final remoteRenderer = RTCVideoRenderer();
  RTCPeerConnection? peer;
  MediaStream? localStream;
  DirectCallModel? call;
  Timer? poller;
  String phase = 'Preparing devices...';
  String? error;
  bool muted = false;
  bool cameraEnabled = true;

  bool get video => (call?.callType ?? widget.callType) == 'VIDEO';
  String get personName =>
      widget.incomingCall?.callerName ??
      widget.person?.displayName ??
      'CircleNet member';

  @override
  void initState() {
    super.initState();
    initialize();
  }

  Future<void> initialize() async {
    try {
      await Future.wait(
          [localRenderer.initialize(), remoteRenderer.initialize()]);
      localStream = await navigator.mediaDevices
          .getUserMedia({'audio': true, 'video': video});
      localRenderer.srcObject = localStream;
      peer = await createPeerConnection({
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'}
        ]
      });
      for (final track in localStream!.getTracks()) {
        await peer!.addTrack(track, localStream!);
      }
      peer!.onTrack = (event) {
        if (event.streams.isNotEmpty) {
          remoteRenderer.srcObject = event.streams.first;
          if (mounted) setState(() => phase = 'Connected');
        }
      };
      peer!.onConnectionState = (state) {
        if (!mounted) return;
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          setState(() => phase = 'Connected');
        } else if (state ==
                RTCPeerConnectionState.RTCPeerConnectionStateFailed ||
            state ==
                RTCPeerConnectionState.RTCPeerConnectionStateDisconnected) {
          setState(() => error = 'Call connection was interrupted.');
        }
      };
      if (widget.incomingCall != null) {
        await answer(widget.incomingCall!);
      } else {
        await start();
      }
    } catch (e) {
      if (mounted) setState(() => error = _friendlyError(e));
    }
  }

  Future<void> start() async {
    final offer = await peer!.createOffer();
    await peer!.setLocalDescription(offer);
    await _waitForIce();
    final description = await peer!.getLocalDescription();
    call = await widget.api.startCall(
        widget.person!.id, widget.callType, jsonEncode(description!.toMap()));
    if (mounted) setState(() => phase = 'Ringing...');
    poller = Timer.periodic(const Duration(seconds: 2), (_) => pollCall());
  }

  Future<void> answer(DirectCallModel incoming) async {
    call = incoming;
    final offer = jsonDecode(incoming.offerSdp) as Map<String, dynamic>;
    await peer!.setRemoteDescription(RTCSessionDescription(
        offer['sdp'] as String?, offer['type'] as String?));
    final answer = await peer!.createAnswer();
    await peer!.setLocalDescription(answer);
    await _waitForIce();
    final description = await peer!.getLocalDescription();
    call = await widget.api
        .acceptCall(incoming.id, jsonEncode(description!.toMap()));
    if (mounted) setState(() => phase = 'Connecting...');
  }

  Future<void> pollCall() async {
    if (call == null) return;
    try {
      final current = await widget.api.call(call!.id);
      call = current;
      if (current.status == 'ACCEPTED' && current.answerSdp != null) {
        poller?.cancel();
        final answer = jsonDecode(current.answerSdp!) as Map<String, dynamic>;
        await peer!.setRemoteDescription(RTCSessionDescription(
            answer['sdp'] as String?, answer['type'] as String?));
        if (mounted) setState(() => phase = 'Connected');
      } else if (current.status == 'REJECTED' || current.status == 'ENDED') {
        poller?.cancel();
        if (mounted) {
          setState(() => error =
              current.status == 'REJECTED' ? 'Call declined.' : 'Call ended.');
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = _friendlyError(e));
    }
  }

  Future<void> _waitForIce() async {
    for (var attempt = 0; attempt < 40; attempt++) {
      if (peer?.iceGatheringState ==
          RTCIceGatheringState.RTCIceGatheringStateComplete) {
        return;
      }
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
  }

  Future<void> end() async {
    if (call != null) {
      try {
        await widget.api.endCall(call!.id);
      } catch (_) {}
    }
    if (mounted) Navigator.pop(context);
  }

  void toggleMute() {
    muted = !muted;
    for (final track in localStream?.getAudioTracks() ?? <MediaStreamTrack>[]) {
      track.enabled = !muted;
    }
    setState(() {});
  }

  void toggleCamera() {
    cameraEnabled = !cameraEnabled;
    for (final track in localStream?.getVideoTracks() ?? <MediaStreamTrack>[]) {
      track.enabled = cameraEnabled;
    }
    setState(() {});
  }

  String _friendlyError(Object value) {
    final text = value.toString();
    if (text.toLowerCase().contains('permission')) {
      return 'Microphone or camera permission was denied. Enable it in device settings and try again.';
    }
    return text;
  }

  @override
  Widget build(BuildContext context) => PopScope(
      canPop: false,
      onPopInvokedWithResult: (_, __) => end(),
      child: Scaffold(
          backgroundColor: const Color(0xFF17132A),
          body: SafeArea(
              child: Stack(fit: StackFit.expand, children: [
            if (video && remoteRenderer.srcObject != null)
              RTCVideoView(remoteRenderer,
                  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
            Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
              if (!video || remoteRenderer.srcObject == null)
                CircleAvatar(
                    radius: 56,
                    backgroundColor: const Color(0xFF6F5BD3),
                    backgroundImage: (widget.incomingCall?.callerPhoto ??
                                    widget.person?.profilePhoto)
                                ?.isNotEmpty ==
                            true
                        ? NetworkImage(widget.incomingCall?.callerPhoto ??
                            widget.person!.profilePhoto!)
                        : null,
                    child: (widget.incomingCall?.callerPhoto ??
                                    widget.person?.profilePhoto)
                                ?.isNotEmpty ==
                            true
                        ? null
                        : Text(personName.characters.first,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 38,
                                fontWeight: FontWeight.w900))),
              const SizedBox(height: 16),
              Text(personName,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              Text(error ?? phase,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: error == null
                          ? Colors.white70
                          : const Color(0xFFFF9BAE),
                      fontWeight: FontWeight.w700))
            ])),
            if (video && localRenderer.srcObject != null)
              Positioned(
                  right: 16,
                  top: 18,
                  width: 112,
                  height: 158,
                  child: ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: RTCVideoView(localRenderer, mirror: true))),
            Positioned(
                left: 0,
                right: 0,
                bottom: 28,
                child:
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  _CallControl(
                      icon: muted ? Icons.mic_off_rounded : Icons.mic_rounded,
                      onTap: toggleMute),
                  if (video) ...[
                    const SizedBox(width: 18),
                    _CallControl(
                        icon: cameraEnabled
                            ? Icons.videocam_rounded
                            : Icons.videocam_off_rounded,
                        onTap: toggleCamera)
                  ],
                  const SizedBox(width: 18),
                  _CallControl(
                      icon: Icons.call_end_rounded,
                      color: const Color(0xFFE54B64),
                      onTap: end)
                ]))
          ]))));

  @override
  void dispose() {
    poller?.cancel();
    for (final track in localStream?.getTracks() ?? <MediaStreamTrack>[]) {
      track.stop();
    }
    peer?.close();
    localRenderer.dispose();
    remoteRenderer.dispose();
    super.dispose();
  }
}

class _CallControl extends StatelessWidget {
  const _CallControl(
      {required this.icon, required this.onTap, this.color = Colors.white24});
  final IconData icon;
  final Color color;
  final FutureOr<void> Function() onTap;
  @override
  Widget build(BuildContext context) => Material(
      color: color,
      shape: const CircleBorder(),
      child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox.square(
              dimension: 58,
              child: Icon(icon, color: Colors.white, size: 27))));
}

class _Tag extends StatelessWidget {
  const _Tag(this.text, this.background, this.foreground);
  final String text;
  final Color background, foreground;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
          color: background, borderRadius: BorderRadius.circular(999)),
      child: Text(text,
          style: TextStyle(
              color: foreground, fontSize: 10, fontWeight: FontWeight.w900)));
}

class _ConnectAction extends StatelessWidget {
  const _ConnectAction(
      {required this.icon,
      required this.label,
      required this.color,
      required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: .12),
          child: Icon(icon, color: color)),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap);
}

class CirclesScreen extends StatefulWidget {
  const CirclesScreen({super.key, required this.api});
  final CircleNetApi api;
  @override
  State<CirclesScreen> createState() => _CirclesScreenState();
}

class _CirclesScreenState extends State<CirclesScreen> {
  List<CircleModel>? circles;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final data = await widget.api.circles();
      if (mounted) {
        setState(() {
          circles = data;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
          onPressed: create,
          icon: const Icon(Icons.add_rounded),
          label: const Text('New circle')),
      body: RefreshIndicator(
          onRefresh: load,
          child: CustomScrollView(slivers: [
            SliverToBoxAdapter(
                child: _PageHeader(
                    eyebrow: 'MY GROUPS',
                    title: 'Circles',
                    subtitle: 'Private spaces for the people who matter.',
                    action: IconButton.filledTonal(
                        onPressed: load,
                        icon: const Icon(Icons.refresh_rounded)))),
            if (error != null)
              SliverFillRemaining(child: _ErrorState(error!, retry: load))
            else if (circles == null)
              const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()))
            else
              SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
                  sliver: SliverList.separated(
                      itemCount: circles!.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final circle = circles![i];
                        return Card(
                            child: ListTile(
                                contentPadding: const EdgeInsets.all(14),
                                leading: CircleAvatar(
                                    radius: 26,
                                    backgroundColor: AppTheme.primary,
                                    child: Text(circle.name.characters.first,
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900))),
                                title: Text(circle.name,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w900)),
                                subtitle: Text(
                                    '${circle.members.length} members · ${circle.currentUserAdmin ? 'Admin' : 'Member'}\n${circle.description}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis),
                                isThreeLine: true,
                                trailing:
                                    const Icon(Icons.chevron_right_rounded),
                                onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) => CircleChatScreen(
                                            api: widget.api,
                                            circle: circle)))));
                      }))
          ])));
  Future<void> create() async {
    final name = TextEditingController(), description = TextEditingController();
    final result = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Create a circle'),
                content: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextField(
                      controller: name,
                      decoration:
                          const InputDecoration(labelText: 'Circle name')),
                  const SizedBox(height: 10),
                  TextField(
                      controller: description,
                      decoration:
                          const InputDecoration(labelText: 'Description'),
                      maxLines: 2)
                ]),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Create'))
                ]));
    if (result == true && name.text.trim().isNotEmpty) {
      await widget.api.createCircle(name.text.trim(), description.text.trim());
      await load();
    }
  }
}

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key, required this.api});
  final CircleNetApi api;
  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final query = TextEditingController();
  List<Person> results = [];
  bool loading = false;
  String? error;
  Future<void> search() async {
    if (query.text.trim().isEmpty) return;
    setState(() => loading = true);
    try {
      results = await widget.api.search(query.text.trim());
      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(slivers: [
        const SliverToBoxAdapter(
            child: _PageHeader(
                eyebrow: 'DISCOVER',
                title: 'Find people',
                subtitle: 'Search by name, mobile number or location.')),
        SliverToBoxAdapter(
            child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: SearchBar(
                    controller: query,
                    hintText: 'Search CircleNet…',
                    leading: const Icon(Icons.search),
                    trailing: [
                      IconButton(
                          onPressed: loading ? null : search,
                          icon: loading
                              ? const SizedBox.square(
                                  dimension: 20,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.arrow_forward_rounded))
                    ],
                    onSubmitted: (_) => search()))),
        if (error != null)
          SliverToBoxAdapter(
              child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(error!,
                      style: const TextStyle(
                          color: Color(0xFFB4233C),
                          fontWeight: FontWeight.w700))))
        else
          SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              sliver: SliverList.separated(
                  itemCount: results.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final person = results[i];
                    return Card(
                        child: ListTile(
                            contentPadding: const EdgeInsets.all(12),
                            leading: _Avatar(person),
                            title: Text(person.displayName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900)),
                            subtitle: Text(
                                person.location ?? 'Location not provided'),
                            trailing: FilledButton.tonal(
                                onPressed: () => add(person),
                                child: const Text('Add'))));
                  }))
      ]);
  Future<void> add(Person person) async {
    String relation = 'Friend', visibility = 'FRIENDS';
    final ok = await showModalBottomSheet<bool>(
        context: context,
        showDragHandle: true,
        builder: (context) => StatefulBuilder(
            builder: (context, setModal) => Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text('Add ${person.displayName}',
                      style: const TextStyle(
                          fontSize: 20, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 16),
                  DropdownButtonFormField(
                      initialValue: relation,
                      decoration:
                          const InputDecoration(labelText: 'Relationship'),
                      items: [
                        'Friend',
                        'Spouse',
                        'Parent',
                        'Child',
                        'Sibling',
                        'Brother',
                        'Sister',
                        'Colleague',
                        'Relative'
                      ]
                          .map(
                              (v) => DropdownMenuItem(value: v, child: Text(v)))
                          .toList(),
                      onChanged: (v) => setModal(() => relation = v!)),
                  const SizedBox(height: 10),
                  DropdownButtonFormField(
                      initialValue: visibility,
                      decoration:
                          const InputDecoration(labelText: 'Who can view'),
                      items: const [
                        DropdownMenuItem(
                            value: 'FRIENDS', child: Text('Friends')),
                        DropdownMenuItem(
                            value: 'RELATIVES', child: Text('Relatives')),
                        DropdownMenuItem(
                            value: 'COLLEAGUES', child: Text('Colleagues')),
                        DropdownMenuItem(value: 'PUBLIC', child: Text('Public'))
                      ],
                      onChanged: (v) => setModal(() => visibility = v!)),
                  const SizedBox(height: 18),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Add relationship'))
                ]))));
    if (ok == true) {
      try {
        await widget.api.addRelationship(person, relation, visibility);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('${person.displayName} added to your network.')));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(e.toString())));
        }
      }
    }
  }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.api});
  final CircleNetApi api;
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  UserProfileModel? profile;
  String? error;
  bool saving = false;
  final fields = <String, TextEditingController>{};
  final definitions = const [
    ('firstName', 'First name'),
    ('surname', 'Surname'),
    ('bio', 'About me'),
    ('phoneNumber', 'Mobile number'),
    ('email', 'Email'),
    ('location', 'Location'),
    ('addressLine1', 'Address'),
    ('city', 'City'),
    ('state', 'State'),
    ('country', 'Country'),
    ('linkedin', 'LinkedIn'),
    ('instagram', 'Instagram'),
    ('highestQualification', 'Highest qualification'),
    ('institution', 'Institution'),
    ('employer', 'Employer'),
    ('jobTitle', 'Job title')
  ];
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final value = await widget.api.profile();
      for (final item in definitions) {
        fields[item.$1] = TextEditingController(text: value.value(item.$1));
      }
      if (mounted) setState(() => profile = value);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(slivers: [
        SliverToBoxAdapter(
            child: _PageHeader(
                eyebrow: 'MY IDENTITY',
                title: 'Profile',
                subtitle: 'Personal, contact, education and work details.',
                action: IconButton.filled(
                    onPressed: saving || profile == null ? null : save,
                    icon: saving
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.check_rounded)))),
        if (error != null)
          SliverFillRemaining(child: _ErrorState(error!, retry: load))
        else if (profile == null)
          const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()))
        else
          SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
              sliver: SliverList.list(children: [
                Card(
                    child: ListTile(
                        leading: const CircleAvatar(
                            child: Icon(Icons.auto_awesome_rounded)),
                        title: const Text('AI Contact Organizer',
                            style: TextStyle(fontWeight: FontWeight.w800)),
                        subtitle: const Text(
                            'Optional: review AI suggestions for relationships and circles. Nothing is added without confirmation.'),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => ContactOrganizerScreen(
                                    api: widget.api))))),
                const SizedBox(height: 12),
                Card(
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(children: [
                          CircleAvatar(
                              radius: 48,
                              backgroundColor: const Color(0xFFE9E4FF),
                              backgroundImage: profile!
                                      .value('profilePhoto')
                                      .isNotEmpty
                                  ? NetworkImage(profile!.value('profilePhoto'))
                                  : null,
                              child: profile!.value('profilePhoto').isEmpty
                                  ? const Icon(Icons.person_rounded,
                                      size: 44, color: AppTheme.primary)
                                  : null),
                          const SizedBox(height: 10),
                          const Text(
                              'Your profile photo is shared according to your privacy settings.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: Color(0xFF718096), fontSize: 12))
                        ]))),
                const SizedBox(height: 12),
                Card(
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(children: [
                          for (final item in definitions) ...[
                            TextField(
                                controller: fields[item.$1],
                                maxLines: item.$1 == 'bio' ? 3 : 1,
                                keyboardType: item.$1 == 'email'
                                    ? TextInputType.emailAddress
                                    : item.$1 == 'phoneNumber'
                                        ? TextInputType.phone
                                        : TextInputType.text,
                                decoration:
                                    InputDecoration(labelText: item.$2)),
                            const SizedBox(height: 10)
                          ]
                        ])))
              ]))
      ]);
  Future<void> save() async {
    setState(() => saving = true);
    try {
      final data = Map<String, dynamic>.from(profile!.data);
      for (final item in definitions) {
        data[item.$1] = fields[item.$1]!.text.trim();
      }
      profile = await widget.api.saveProfile(data);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile saved successfully.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }
}

class ContactOrganizerScreen extends StatefulWidget {
  const ContactOrganizerScreen({super.key, required this.api});
  final CircleNetApi api;
  @override
  State<ContactOrganizerScreen> createState() => _ContactOrganizerScreenState();
}

class _ContactOrganizerScreenState extends State<ContactOrganizerScreen> {
  bool loading = false;
  String? error;
  List<Map<String, dynamic>> suggestions = [];
  static const relationshipTypes = [
    'Friend', 'Mother', 'Father', 'Sister', 'Brother', 'Spouse',
    'Son', 'Daughter', 'Relative', 'Colleague', 'Other'
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('AI Contact Organizer')),
      body: SafeArea(
          child: loading
              ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  CircularProgressIndicator(), SizedBox(height: 12),
                  Text('Analyzing contact names and organizations…')]))
              : suggestions.isEmpty ? consentView() : reviewView()));

  Widget consentView() => ListView(padding: const EdgeInsets.all(16), children: [
        const Icon(Icons.contact_phone_rounded, size: 60, color: AppTheme.primary),
        const SizedBox(height: 16),
        Text('Organize contacts with AI', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900), textAlign: TextAlign.center),
        const SizedBox(height: 12),
        const Text('CircleNet reads your phonebook only after permission. Raw contacts are not retained during analysis. You review every relationship and circle before anything is added.', textAlign: TextAlign.center),
        const SizedBox(height: 16),
        const Card(child: Padding(padding: EdgeInsets.all(14), child: Column(children: [
          ListTile(leading: Icon(Icons.lock_outline_rounded), title: Text('Explicit permission'), subtitle: Text('You can deny or revoke contact access at any time.')),
          ListTile(leading: Icon(Icons.rule_rounded), title: Text('Review required'), subtitle: Text('AI suggestions never modify your tree automatically.')),
          ListTile(leading: Icon(Icons.skip_next_rounded), title: Text('Completely optional'), subtitle: Text('Skip now and use it later from Profile.')),
        ]))),
        if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w800))),
        const SizedBox(height: 16),
        FilledButton.icon(onPressed: readAndAnalyze, icon: const Icon(Icons.auto_awesome_rounded), label: const Text('Allow and analyze contacts')),
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Skip for now')),
      ]);

  Widget reviewView() => Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(16, 10, 16, 4), child: Row(children: [
          Expanded(child: Text('${suggestions.where((item) => item['selected'] == true).length} of ${suggestions.length} selected', style: const TextStyle(fontWeight: FontWeight.w800))),
          TextButton(onPressed: () => setState(() { for (final item in suggestions) { item['selected'] = true; } }), child: const Text('Select all')),
          TextButton(onPressed: () => setState(() { for (final item in suggestions) { item['selected'] = false; } }), child: const Text('Clear')),
        ])),
        if (error != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text(error!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w800))),
        Expanded(child: ListView.builder(padding: const EdgeInsets.fromLTRB(12, 4, 12, 100), itemCount: suggestions.length, itemBuilder: (_, index) {
          final item = suggestions[index];
          final circles = List<String>.from(item['suggested_circles'] as List? ?? const []);
          return Card(child: Padding(padding: const EdgeInsets.all(10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CheckboxListTile(contentPadding: EdgeInsets.zero, value: item['selected'] == true, onChanged: (value) => setState(() => item['selected'] = value ?? false), title: Text(item['display_name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w800)), subtitle: Text(item['phone']?.toString() ?? 'No mobile number — will be skipped')),
            DropdownButtonFormField<String>(initialValue: item['suggested_relationship']?.toString(), decoration: const InputDecoration(labelText: 'Relationship'), items: relationshipTypes.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(), onChanged: (value) => setState(() => item['suggested_relationship'] = value)),
            const SizedBox(height: 8),
            TextFormField(initialValue: circles.join(', '), decoration: const InputDecoration(labelText: 'Suggested circles', helperText: 'Separate circle names with commas'), onChanged: (value) => item['suggested_circles'] = value.split(',').map((part) => part.trim()).where((part) => part.isNotEmpty).toList()),
            const SizedBox(height: 6),
            Text('${((item['confidence'] as num?)?.toDouble() ?? 0) * 100 ~/ 1}% confidence • ${(item['reasons'] as List? ?? const []).join(' • ')}', style: const TextStyle(fontSize: 12, color: Color(0xFF718096))),
          ])));
        })),
        Padding(padding: const EdgeInsets.all(12), child: SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: accept, icon: const Icon(Icons.check_circle_outline_rounded), label: const Text('Confirm selected suggestions'))))
      ]);

  Future<void> readAndAnalyze() async {
    if (kIsWeb) { setState(() => error = 'Contact import is available in the Android and iOS apps.'); return; }
    final status = await Permission.contacts.request();
    if (!status.isGranted) { setState(() => error = status.isPermanentlyDenied ? 'Contact access is disabled. Enable it in device settings, or skip this step.' : 'Contact permission was not granted. Nothing was uploaded.'); return; }
    setState(() { loading = true; error = null; });
    try {
      final contacts = await FastContacts.getAllContacts();
      final payload = contacts.where((contact) => contact.displayName.trim().isNotEmpty).map((contact) => {
        'contact_key': contact.id,
        'display_name': contact.displayName.trim(),
        'phones': contact.phones.map((phone) => phone.number).where((value) => value.trim().isNotEmpty).toList(),
        'emails': contact.emails.map((email) => email.address).where((value) => value.trim().isNotEmpty).toList(),
        'organization': contact.organization?.company ?? '',
        'job_title': contact.organization?.jobDescription ?? '',
        'labels': [...contact.phones.map((phone) => phone.label), ...contact.emails.map((email) => email.label), if ((contact.organization?.department ?? '').isNotEmpty) contact.organization!.department]
      }).toList();
      final result = await widget.api.analyzeContacts(payload);
      for (final item in result) { item['selected'] = item['phone'] != null; }
      if (mounted) setState(() => suggestions = result);
    } catch (exception) { if (mounted) setState(() => error = exception.toString()); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> accept() async {
    setState(() { loading = true; error = null; });
    try {
      final payload = suggestions.map((item) => {
        'displayName': item['display_name'], 'phone': item['phone'], 'email': item['email'],
        'relationship': item['suggested_relationship'], 'circles': item['suggested_circles'],
        'selected': item['selected'] == true
      }).toList();
      final result = await widget.api.acceptContactSuggestions(payload);
      if (!mounted) return;
      await showDialog<void>(context: context, builder: (_) => AlertDialog(title: const Text('Contacts organized'), content: Text('${result['peopleAdded']} people added and ${result['circleMembershipsAdded']} circle memberships created.${(result['skipped'] as List? ?? const []).isEmpty ? '' : '\n\nSkipped:\n${(result['skipped'] as List).join('\n')}'}'), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Done'))]));
      if (mounted) Navigator.pop(context);
    } catch (exception) { if (mounted) setState(() => error = exception.toString()); }
    finally { if (mounted) setState(() => loading = false); }
  }
}

class DirectChatScreen extends StatelessWidget {
  const DirectChatScreen({super.key, required this.api, required this.person});
  final CircleNetApi api;
  final Person person;
  @override
  Widget build(BuildContext context) => ConversationScreen(
      title: person.displayName,
      subtitle: 'Private conversation',
      load: () => api.directMessages(person.id),
      send: (text, _) => api.sendDirectMessage(person.id, text),
      sendAttachment: (text, bytes, name, _, onProgress) =>
          api.sendDirectAttachment(person.id, text, bytes, name,
              onProgress: onProgress),
      fetchAttachment: api.attachment,
      person: person);
}

class CircleChatScreen extends StatefulWidget {
  const CircleChatScreen({super.key, required this.api, required this.circle});
  final CircleNetApi api;
  final CircleModel circle;
  @override
  State<CircleChatScreen> createState() => _CircleChatScreenState();
}

class _CircleChatScreenState extends State<CircleChatScreen> {
  late CircleModel circle = widget.circle;

  @override
  Widget build(BuildContext context) => ConversationScreen(
          title: circle.name,
          subtitle: '${circle.members.length} members',
          load: () => widget.api.circleMessages(circle.id),
          send: (text, parentId) => widget.api
              .postCircleMessage(circle.id, text, parentMessageId: parentId),
          sendAttachment: (text, bytes, name, parentId, onProgress) =>
              widget.api.postCircleAttachment(circle.id, text, bytes, name,
                  parentMessageId: parentId, onProgress: onProgress),
          fetchAttachment: widget.api.attachment,
          allowReplies: true,
          actions: [
            IconButton(
                tooltip: 'Members',
                onPressed: showMembers,
                icon: const Icon(Icons.group_rounded)),
            if (circle.currentUserAdmin)
              IconButton(
                  tooltip: 'Circle settings',
                  onPressed: showSettings,
                  icon: const Icon(Icons.settings_rounded))
          ]);

  Future<void> showSettings() async {
    final name = TextEditingController(text: circle.name);
    final description = TextEditingController(text: circle.description);
    var permission = circle.postingPermission;
    final save = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (context) => StatefulBuilder(
            builder: (context, setModal) => Padding(
                padding: EdgeInsets.fromLTRB(
                    20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Text('Circle settings',
                      style:
                          TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 14),
                  TextField(
                      controller: name,
                      decoration: const InputDecoration(labelText: 'Name')),
                  const SizedBox(height: 10),
                  TextField(
                      controller: description,
                      maxLines: 2,
                      decoration:
                          const InputDecoration(labelText: 'Description')),
                  RadioGroup<String>(
                      groupValue: permission,
                      onChanged: (value) => setModal(() => permission = value!),
                      child: const Column(children: [
                        RadioListTile(
                            value: 'ALL_MEMBERS',
                            title: Text('All members can post')),
                        RadioListTile(
                            value: 'ADMINS_ONLY',
                            title: Text('Only admins can post'))
                      ])),
                  SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Save settings')))
                ]))));
    if (save != true || name.text.trim().isEmpty) return;
    try {
      final updated = await widget.api.updateCircle(
          circle.id, name.text.trim(), description.text.trim(), permission);
      if (mounted) setState(() => circle = updated);
    } catch (e) {
      if (mounted) _showError(e);
    }
  }

  Future<void> showMembers() async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (sheetContext) => StatefulBuilder(
            builder: (context, setModal) => FractionallySizedBox(
                heightFactor: .78,
                child: Column(children: [
                  Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 12, 8),
                      child: Row(children: [
                        Expanded(
                            child: Text('Members (${circle.members.length})',
                                style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900))),
                        if (circle.currentUserAdmin)
                          FilledButton.tonalIcon(
                              onPressed: () async {
                                await addMember(sheetContext);
                                setModal(() {});
                              },
                              icon: const Icon(Icons.person_add_rounded),
                              label: const Text('Add'))
                      ])),
                  Expanded(
                      child: ListView.builder(
                          itemCount: circle.members.length,
                          itemBuilder: (context, index) {
                            final member = circle.members[index];
                            return ListTile(
                                leading: _Avatar(member.person),
                                title: Text(member.person.displayName,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800)),
                                subtitle: Text(member.creator
                                    ? 'Creator - Admin'
                                    : member.admin
                                        ? 'Admin'
                                        : 'Member'),
                                trailing: !circle.currentUserAdmin ||
                                        member.creator
                                    ? null
                                    : PopupMenuButton<String>(
                                        onSelected: (action) async {
                                          try {
                                            final updated = action == 'remove'
                                                ? await widget.api
                                                    .removeCircleMember(
                                                        circle.id,
                                                        member.person.id)
                                                : member.admin
                                                    ? await widget.api
                                                        .demoteCircleAdmin(
                                                            circle.id,
                                                            member.person.id)
                                                    : await widget.api
                                                        .promoteCircleAdmin(
                                                            circle.id,
                                                            member.person.id);
                                            if (mounted) {
                                              setState(() => circle = updated);
                                              setModal(() {});
                                            }
                                          } catch (e) {
                                            if (mounted) _showError(e);
                                          }
                                        },
                                        itemBuilder: (_) => [
                                              PopupMenuItem(
                                                  value: 'admin',
                                                  child: Text(member.admin
                                                      ? 'Remove admin'
                                                      : 'Make admin')),
                                              const PopupMenuItem(
                                                  value: 'remove',
                                                  child: Text('Remove member'))
                                            ]));
                          }))
                ]))));
  }

  Future<void> addMember(BuildContext sheetContext) async {
    final relationships = await widget.api.relationships();
    final ids = circle.members.map((item) => item.person.id).toSet();
    final available = relationships
        .map((item) => item.person)
        .where((person) => !ids.contains(person.id))
        .toList();
    if (!mounted) return;
    final selected = await showDialog<Person>(
        context: context,
        builder: (context) => AlertDialog(
            title: const Text('Add member'),
            content: SizedBox(
                width: 360,
                child: available.isEmpty
                    ? const Text('All your relationships are already members.')
                    : ListView.builder(
                        shrinkWrap: true,
                        itemCount: available.length,
                        itemBuilder: (_, index) => ListTile(
                            leading: _Avatar(available[index]),
                            title: Text(available[index].displayName),
                            onTap: () =>
                                Navigator.pop(context, available[index]))))));
    if (selected == null) return;
    try {
      final updated = await widget.api.addCircleMember(circle.id, selected.id);
      if (mounted) setState(() => circle = updated);
    } catch (e) {
      if (mounted) _showError(e);
    }
  }

  void _showError(Object error) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString()),
          backgroundColor: const Color(0xFFB4233C)));
}

class ConversationScreen extends StatefulWidget {
  const ConversationScreen(
      {super.key,
      required this.title,
      required this.subtitle,
      required this.load,
      required this.send,
      required this.sendAttachment,
      required this.fetchAttachment,
      this.actions = const [],
      this.allowReplies = false,
      this.person});
  final String title, subtitle;
  final Future<List<ConversationMessage>> Function() load;
  final Future<void> Function(String, int?) send;
  final Future<void> Function(
    String message,
    Uint8List bytes,
    String fileName,
    int? parentMessageId,
    void Function(double progress) onProgress,
  ) sendAttachment;
  final Future<Uint8List> Function(String) fetchAttachment;
  final List<Widget> actions;
  final bool allowReplies;
  final Person? person;
  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final text = TextEditingController();
  List<ConversationMessage>? messages;
  String? error;
  bool sending = false;
  PlatformFile? selectedFile;
  ConversationMessage? replyingTo;
  double? uploadProgress;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final value = await widget.load();
      if (mounted) {
        setState(() {
          messages = value;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> send() async {
    if (text.text.trim().isEmpty && selectedFile == null) return;
    setState(() => sending = true);
    try {
      if (selectedFile != null) {
        final bytes = selectedFile!.bytes;
        if (bytes == null) {
          throw const CircleNetApiException(
              'Could not read the selected file.');
        }
        await widget.sendAttachment(
          text.text.trim(),
          bytes,
          selectedFile!.name,
          replyingTo?.id,
          (progress) {
            if (mounted) setState(() => uploadProgress = progress);
          },
        );
      } else {
        await widget.send(text.text.trim(), replyingTo?.id);
      }
      text.clear();
      selectedFile = null;
      replyingTo = null;
      uploadProgress = null;
      await load();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  Future<void> chooseAttachment() async {
    setState(() => error = null);
    final result = await FilePicker.platform.pickFiles(
      withData: true,
      allowMultiple: false,
      type: FileType.custom,
      allowedExtensions: const [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'mp4',
        'webm',
        'mp3',
        'wav',
        'm4a',
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'txt'
      ],
    );
    if (result == null) return;
    final file = result.files.single;
    if (file.size > 25 * 1024 * 1024) {
      setState(() => error =
          '“${file.name}” is ${_formatSize(file.size)}. Maximum attachment size is 25 MB.');
      return;
    }
    if (file.bytes == null) {
      setState(() =>
          error = 'Could not read “${file.name}”. Please choose it again.');
      return;
    }
    setState(() {
      selectedFile = file;
      uploadProgress = null;
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(
          title: Row(children: [
            if (widget.person != null) ...[
              _Avatar(widget.person!, radius: 19),
              const SizedBox(width: 10)
            ],
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.title,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w900)),
              Text(widget.subtitle,
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF718096)))
            ])
          ]),
          actions: [
            ...widget.actions,
            IconButton(onPressed: load, icon: const Icon(Icons.refresh_rounded))
          ]),
      body: Column(children: [
        if (error != null)
          Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              color: const Color(0xFFFFE8EC),
              child: Text(error!,
                  style: const TextStyle(
                      color: Color(0xFFB4233C), fontWeight: FontWeight.w700))),
        Expanded(
            child: messages == null
                ? const Center(child: CircularProgressIndicator())
                : messages!.isEmpty
                    ? const Center(
                        child: Text('No messages yet. Start the conversation.'))
                    : ListView.builder(
                        reverse: true,
                        padding: const EdgeInsets.all(14),
                        itemCount: messages!.length,
                        itemBuilder: (context, index) {
                          final item = messages![messages!.length - 1 - index];
                          final parent = _messageById(item.parentMessageId);
                          return Align(
                              alignment: item.mine
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                  constraints: BoxConstraints(
                                      maxWidth:
                                          MediaQuery.sizeOf(context).width *
                                              .78),
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding:
                                      const EdgeInsets.fromLTRB(12, 9, 12, 7),
                                  decoration: BoxDecoration(
                                      color: item.mine
                                          ? const Color(0xFFE9E3FF)
                                          : Colors.white,
                                      border: Border.all(
                                          color: item.mine
                                              ? const Color(0xFFD3C7F4)
                                              : const Color(0xFFE0DCE8)),
                                      borderRadius: BorderRadius.only(
                                          topLeft: const Radius.circular(16),
                                          topRight: const Radius.circular(16),
                                          bottomLeft: Radius.circular(
                                              item.mine ? 16 : 4),
                                          bottomRight: Radius.circular(
                                              item.mine ? 4 : 16))),
                                  child:
                                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    if (!item.mine)
                                      Text(item.authorName,
                                          style: const TextStyle(
                                              color: AppTheme.primary,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w900)),
                                    if (parent != null) ...[
                                      Container(
                                          width: double.infinity,
                                          margin: const EdgeInsets.only(
                                              top: 3, bottom: 6),
                                          padding: const EdgeInsets.all(7),
                                          decoration: BoxDecoration(
                                              color: Colors.white
                                                  .withValues(alpha: .62),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              border: const Border(
                                                  left: BorderSide(
                                                      color: AppTheme.primary,
                                                      width: 3))),
                                          child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(parent.authorName,
                                                    style: const TextStyle(
                                                        color: AppTheme.primary,
                                                        fontSize: 10,
                                                        fontWeight:
                                                            FontWeight.w900)),
                                                Text(
                                                    parent.message
                                                            .trim()
                                                            .isNotEmpty
                                                        ? parent.message
                                                        : parent.attachmentName ??
                                                            'Attachment',
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: const TextStyle(
                                                        fontSize: 11))
                                              ]))
                                    ],
                                    if (item.message.isNotEmpty)
                                      Text(item.message,
                                          style: const TextStyle(
                                              color: AppTheme.ink,
                                              fontSize: 14)),
                                    if (item.hasAttachment) ...[
                                      if (item.message.isNotEmpty)
                                        const SizedBox(height: 8),
                                      _MessageAttachment(
                                        message: item,
                                        fetch: widget.fetchAttachment,
                                      ),
                                    ],
                                    const SizedBox(height: 3),
                                    Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(_time(item.createdAt),
                                              style: const TextStyle(
                                                  color: Color(0xFF7F748D),
                                                  fontSize: 9)),
                                          if (widget.allowReplies) ...[
                                            const SizedBox(width: 7),
                                            InkWell(
                                                onTap: () => setState(
                                                    () => replyingTo = item),
                                                child: const Padding(
                                                    padding: EdgeInsets.all(2),
                                                    child: Icon(
                                                        Icons.reply_rounded,
                                                        size: 15,
                                                        color:
                                                            AppTheme.primary)))
                                          ]
                                        ])
                                  ])));
                        })),
        if (replyingTo != null)
          Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 7, 8, 7),
              color: const Color(0xFFF2EEFF),
              child: Row(children: [
                const Icon(Icons.reply_rounded,
                    size: 18, color: AppTheme.primary),
                const SizedBox(width: 7),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('Replying to ${replyingTo!.authorName}',
                          style: const TextStyle(
                              color: AppTheme.primary,
                              fontSize: 10,
                              fontWeight: FontWeight.w900)),
                      Text(
                          replyingTo!.message.isNotEmpty
                              ? replyingTo!.message
                              : replyingTo!.attachmentName ?? 'Attachment',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11))
                    ])),
                IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: () => setState(() => replyingTo = null),
                    icon: const Icon(Icons.close_rounded, size: 18))
              ])),
        SafeArea(
            top: false,
            child: Container(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Color(0xFFE5E0EF)))),
                child: Row(children: [
                  IconButton.filledTonal(
                      tooltip: 'Attach photo, video, audio, or document',
                      onPressed: sending ? null : chooseAttachment,
                      icon: const Icon(Icons.add_rounded)),
                  const SizedBox(width: 7),
                  Expanded(
                      child: TextField(
                          controller: text,
                          minLines: 1,
                          maxLines: 4,
                          textCapitalization: TextCapitalization.sentences,
                          decoration: const InputDecoration(
                              hintText: 'Message…', isDense: true))),
                  const SizedBox(width: 7),
                  IconButton.filled(
                      onPressed: sending ? null : send,
                      icon: sending
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send_rounded))
                ]))),
        if (selectedFile != null || uploadProgress != null)
          SafeArea(
            top: false,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 7, 14, 9),
              color: Colors.white,
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (selectedFile != null)
                      Row(children: [
                        const Icon(Icons.attach_file_rounded,
                            size: 18, color: AppTheme.primary),
                        const SizedBox(width: 6),
                        Expanded(
                            child: Text(
                          '${selectedFile!.name} · ${_formatSize(selectedFile!.size)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w700),
                        )),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          tooltip: 'Remove attachment',
                          onPressed: sending
                              ? null
                              : () => setState(() => selectedFile = null),
                          icon: const Icon(Icons.close_rounded, size: 18),
                        ),
                      ]),
                    if (uploadProgress != null)
                      LinearProgressIndicator(value: uploadProgress),
                  ]),
            ),
          )
      ]));
  String _time(DateTime value) =>
      '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';

  ConversationMessage? _messageById(int? id) {
    if (id == null || messages == null) return null;
    for (final message in messages!) {
      if (message.id == id) return message;
    }
    return null;
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class _MessageAttachment extends StatefulWidget {
  const _MessageAttachment({required this.message, required this.fetch});
  final ConversationMessage message;
  final Future<Uint8List> Function(String) fetch;

  @override
  State<_MessageAttachment> createState() => _MessageAttachmentState();
}

class _MessageAttachmentState extends State<_MessageAttachment> {
  late final Future<Uint8List> bytes =
      widget.fetch(widget.message.attachmentUrl!);
  bool opening = false;

  @override
  Widget build(BuildContext context) {
    final type = widget.message.attachmentType ?? 'application/octet-stream';
    if (type.startsWith('image/')) {
      return FutureBuilder<Uint8List>(
        future: bytes,
        builder: (context, snapshot) {
          if (snapshot.hasError) return _errorCard();
          if (!snapshot.hasData) {
            return const SizedBox(
              height: 110,
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            );
          }
          return InkWell(
            onTap: () => _open(snapshot.data!),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.memory(
                snapshot.data!,
                width: 260,
                height: 180,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _fileCard(type),
              ),
            ),
          );
        },
      );
    }
    return _fileCard(type);
  }

  Widget _fileCard(String type) => FutureBuilder<Uint8List>(
        future: bytes,
        builder: (context, snapshot) => InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap:
              snapshot.hasData && !opening ? () => _open(snapshot.data!) : null,
          child: Container(
            constraints: const BoxConstraints(minWidth: 210),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .72),
              border: Border.all(color: const Color(0xFFD9D2E8)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              CircleAvatar(
                backgroundColor: const Color(0xFFE9E3FF),
                child: Icon(_icon(type), color: AppTheme.primary),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.message.attachmentName ?? 'Attachment',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppTheme.ink,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_label(type)} · ${_size(widget.message.attachmentSize)}',
                      style: const TextStyle(
                        color: Color(0xFF756B82),
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
              if (snapshot.hasError)
                const Icon(Icons.error_outline_rounded,
                    color: Color(0xFFB4233C))
              else if (!snapshot.hasData || opening)
                const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(
                  type.startsWith('audio/') || type.startsWith('video/')
                      ? Icons.play_circle_fill_rounded
                      : Icons.open_in_new_rounded,
                  color: AppTheme.primary,
                ),
            ]),
          ),
        ),
      );

  Widget _errorCard() => const Text(
        'Attachment could not be loaded',
        style: TextStyle(color: Color(0xFFB4233C), fontWeight: FontWeight.w700),
      );

  Future<void> _open(Uint8List data) async {
    setState(() => opening = true);
    final opened = await openAttachmentBytes(
      data,
      widget.message.attachmentType ?? 'application/octet-stream',
      widget.message.attachmentName ?? 'attachment',
    );
    if (mounted) {
      setState(() => opening = false);
      if (!opened) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content:
              Text('Opening downloaded files on this device is coming next.'),
        ));
      }
    }
  }

  IconData _icon(String type) {
    if (type.startsWith('audio/')) return Icons.audiotrack_rounded;
    if (type.startsWith('video/')) return Icons.videocam_rounded;
    if (type == 'application/pdf') return Icons.picture_as_pdf_rounded;
    if (type.contains('sheet') || type.contains('excel')) {
      return Icons.table_chart_rounded;
    }
    return Icons.insert_drive_file_rounded;
  }

  String _label(String type) {
    if (type.startsWith('audio/')) return 'Audio';
    if (type.startsWith('video/')) return 'Video';
    if (type == 'application/pdf') return 'PDF';
    return 'Document';
  }

  String _size(int? bytes) {
    if (bytes == null) return 'Unknown size';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
