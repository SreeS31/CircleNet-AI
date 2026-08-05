class Person {
  Person(
      {required this.id,
      required this.displayName,
      required this.accountStatus,
      this.profilePhoto,
      this.location,
      this.identityType,
      this.gender});
  final int id;
  final String displayName;
  final String accountStatus;
  final String? profilePhoto;
  final String? location;
  final String? identityType;
  final String? gender;
  bool get canConnect => accountStatus == 'ACTIVE' && identityType != 'MANAGED';
  factory Person.fromJson(Map<String, dynamic> json) => Person(
      id: (json['id'] as num).toInt(),
      displayName: json['displayName'] as String? ?? 'Unknown',
      accountStatus: json['accountStatus'] as String? ?? 'INVITED',
      profilePhoto: json['profilePhoto'] as String?,
      location: json['location'] as String?,
      identityType: json['identityType'] as String?,
      gender: json['gender'] as String?);
}

class Relationship {
  Relationship(
      {required this.id,
      required this.type,
      required this.person,
      required this.visibilityScope,
      this.relativeToUserId});
  final int id;
  final String type;
  final Person person;
  final String visibilityScope;
  final int? relativeToUserId;
  factory Relationship.fromJson(Map<String, dynamic> json) => Relationship(
      id: (json['id'] as num).toInt(),
      type: json['type'] as String? ?? 'Relation',
      person: Person.fromJson(json['person'] as Map<String, dynamic>),
      visibilityScope: json['visibilityScope'] as String? ?? 'FRIENDS',
      relativeToUserId: (json['relativeToUserId'] as num?)?.toInt());
}

class CircleMember {
  CircleMember(
      {required this.person, required this.admin, required this.creator});
  final Person person;
  final bool admin;
  final bool creator;
  factory CircleMember.fromJson(Map<String, dynamic> json) => CircleMember(
      person: Person.fromJson(json['person'] as Map<String, dynamic>),
      admin: json['admin'] == true,
      creator: json['creator'] == true);
}

class CircleModel {
  CircleModel(
      {required this.id,
      required this.name,
      required this.description,
      required this.ownerName,
      required this.members,
      required this.currentUserAdmin,
      required this.currentUserCanPost});
  final int id;
  final String name;
  final String description;
  final String ownerName;
  final List<CircleMember> members;
  final bool currentUserAdmin;
  final bool currentUserCanPost;
  factory CircleModel.fromJson(Map<String, dynamic> json) => CircleModel(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? 'Circle',
      description: json['description'] as String? ?? '',
      ownerName: json['ownerName'] as String? ?? '',
      members: (json['members'] as List? ?? [])
          .map((item) => CircleMember.fromJson(item as Map<String, dynamic>))
          .toList(),
      currentUserAdmin: json['currentUserAdmin'] == true,
      currentUserCanPost: json['currentUserCanPost'] == true);
}

class ConversationMessage {
  ConversationMessage(
      {required this.id,
      required this.authorName,
      required this.message,
      required this.createdAt,
      required this.mine,
      this.authorPhoto,
      this.attachmentUrl,
      this.attachmentName,
      this.attachmentType,
      this.attachmentSize});
  final int id;
  final String authorName;
  final String message;
  final DateTime createdAt;
  final bool mine;
  final String? authorPhoto;
  final String? attachmentUrl;
  final String? attachmentName;
  final String? attachmentType;
  final int? attachmentSize;
  bool get hasAttachment => attachmentUrl?.isNotEmpty == true;
  factory ConversationMessage.fromJson(Map<String, dynamic> json) =>
      ConversationMessage(
          id: (json['id'] as num).toInt(),
          authorName:
              (json['authorName'] ?? json['senderName'] ?? 'Member') as String,
          message: json['message'] as String? ?? '',
          createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
              DateTime.now(),
          mine: json['currentUserAuthor'] == true,
          authorPhoto: (json['authorPhoto'] ?? json['senderPhoto']) as String?,
          attachmentUrl: json['attachmentUrl'] as String?,
          attachmentName: json['attachmentName'] as String?,
          attachmentType: json['attachmentType'] as String?,
          attachmentSize: (json['attachmentSize'] as num?)?.toInt());
}

class UserProfileModel {
  UserProfileModel(this.data);
  final Map<String, dynamic> data;
  String value(String key) => data[key]?.toString() ?? '';
  factory UserProfileModel.fromJson(Map<String, dynamic> json) =>
      UserProfileModel(Map<String, dynamic>.from(json));
}
