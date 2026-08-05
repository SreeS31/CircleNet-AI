import 'dart:typed_data';

import 'package:circlenet_mobile/core/models/network_models.dart';
import 'package:circlenet_mobile/core/network/circlenet_api.dart';
import 'package:circlenet_mobile/core/platform/attachment_opener.dart';
import 'package:circlenet_mobile/core/theme/app_theme.dart';
import 'package:circlenet_mobile/features/auth/data/session_store.dart';
import 'package:circlenet_mobile/features/auth/models/auth_models.dart';
import 'package:flutter/material.dart';

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
  late final pages = <Widget>[
    NetworkHome(api: api),
    CirclesScreen(api: api),
    DiscoverScreen(api: api),
    ProfileScreen(api: api)
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
        icon: Icon(Icons.person_search_outlined),
        selectedIcon: Icon(Icons.person_search_rounded),
        label: 'Discover'),
    NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person_rounded),
        label: 'Profile')
  ];
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
      final value = await widget.api.relationships();
      if (mounted) setState(() => items = value);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
      onRefresh: load,
      child: CustomScrollView(slivers: [
        const SliverToBoxAdapter(
            child: _PageHeader(
                eyebrow: 'MY CIRCLENET',
                title: 'Relationships',
                subtitle: 'Your people, organized around you.')),
        if (error != null)
          SliverFillRemaining(child: _ErrorState(error!, retry: load))
        else if (items == null)
          const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()))
        else if (items!.isEmpty)
          const SliverFillRemaining(
              child: Center(
                  child: Text('Add your first relationship from Discover.')))
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
                        onTap: () => _callNotice(context, 'Audio')),
                    _ConnectAction(
                        icon: Icons.videocam_rounded,
                        label: 'Video call',
                        color: const Color(0xFFD15C87),
                        onTap: () => _callNotice(context, 'Video'))
                  ]))));
  void _callNotice(BuildContext context, String type) {
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            '$type call is ready to connect when the other person is online.')));
  }
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
      if (mounted)
        setState(() {
          circles = data;
          error = null;
        });
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
                      value: relation,
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
                      value: visibility,
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
        if (mounted)
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('${person.displayName} added to your network.')));
      } catch (e) {
        if (mounted)
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(e.toString())));
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
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile saved successfully.')));
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => saving = false);
    }
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
      send: (text) => api.sendDirectMessage(person.id, text),
      fetchAttachment: api.attachment,
      person: person);
}

class CircleChatScreen extends StatelessWidget {
  const CircleChatScreen({super.key, required this.api, required this.circle});
  final CircleNetApi api;
  final CircleModel circle;
  @override
  Widget build(BuildContext context) => ConversationScreen(
      title: circle.name,
      subtitle: '${circle.members.length} members',
      load: () => api.circleMessages(circle.id),
      send: (text) => api.postCircleMessage(circle.id, text),
      fetchAttachment: api.attachment);
}

class ConversationScreen extends StatefulWidget {
  const ConversationScreen(
      {super.key,
      required this.title,
      required this.subtitle,
      required this.load,
      required this.send,
      required this.fetchAttachment,
      this.person});
  final String title, subtitle;
  final Future<List<ConversationMessage>> Function() load;
  final Future<void> Function(String) send;
  final Future<Uint8List> Function(String) fetchAttachment;
  final Person? person;
  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final text = TextEditingController();
  List<ConversationMessage>? messages;
  String? error;
  bool sending = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final value = await widget.load();
      if (mounted)
        setState(() {
          messages = value;
          error = null;
        });
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> send() async {
    if (text.text.trim().isEmpty) return;
    setState(() => sending = true);
    try {
      await widget.send(text.text.trim());
      text.clear();
      await load();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => sending = false);
    }
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
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (!item.mine)
                                          Text(item.authorName,
                                              style: const TextStyle(
                                                  color: AppTheme.primary,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w900)),
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
                                        Text(_time(item.createdAt),
                                            style: const TextStyle(
                                                color: Color(0xFF7F748D),
                                                fontSize: 9))
                                      ])));
                        })),
        SafeArea(
            top: false,
            child: Container(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Color(0xFFE5E0EF)))),
                child: Row(children: [
                  IconButton.filledTonal(
                      onPressed: () => ScaffoldMessenger.of(context)
                          .showSnackBar(const SnackBar(
                              content: Text(
                                  'Choose photos, videos and documents from your device.'))),
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
                ])))
      ]));
  String _time(DateTime value) =>
      '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
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
