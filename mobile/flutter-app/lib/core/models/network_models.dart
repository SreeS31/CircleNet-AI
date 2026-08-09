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
      this.relativeToUserId,
      this.contactPhone,
      this.contactEmail,
      this.visibilityCompany});
  final int id;
  final String type;
  final Person person;
  final String visibilityScope;
  final int? relativeToUserId;
  final String? contactPhone, contactEmail, visibilityCompany;
  factory Relationship.fromJson(Map<String, dynamic> json) => Relationship(
      id: (json['id'] as num).toInt(),
      type: json['type'] as String? ?? 'Relation',
      person: Person.fromJson(json['person'] as Map<String, dynamic>),
      visibilityScope: json['visibilityScope'] as String? ?? 'FRIENDS',
      relativeToUserId: (json['relativeToUserId'] as num?)?.toInt(),
      contactPhone: json['contactPhone'] as String?,
      contactEmail: json['contactEmail'] as String?,
      visibilityCompany: json['visibilityCompany'] as String?);
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
      required this.currentUserCanPost,
      required this.postingPermission});
  final int id;
  final String name;
  final String description;
  final String ownerName;
  final List<CircleMember> members;
  final bool currentUserAdmin;
  final bool currentUserCanPost;
  final String postingPermission;
  factory CircleModel.fromJson(Map<String, dynamic> json) => CircleModel(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? 'Circle',
      description: json['description'] as String? ?? '',
      ownerName: json['ownerName'] as String? ?? '',
      members: (json['members'] as List? ?? [])
          .map((item) => CircleMember.fromJson(item as Map<String, dynamic>))
          .toList(),
      currentUserAdmin: json['currentUserAdmin'] == true,
      currentUserCanPost: json['currentUserCanPost'] == true,
      postingPermission: json['postingPermission'] as String? ?? 'ALL_MEMBERS');
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
      this.attachmentSize,
      this.parentMessageId});
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
  final int? parentMessageId;
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
          attachmentSize: (json['attachmentSize'] as num?)?.toInt(),
          parentMessageId: (json['parentPostId'] as num?)?.toInt());
}

class UserProfileModel {
  UserProfileModel(this.data);
  final Map<String, dynamic> data;
  String value(String key) => data[key]?.toString() ?? '';
  factory UserProfileModel.fromJson(Map<String, dynamic> json) =>
      UserProfileModel(Map<String, dynamic>.from(json));
}

class DirectCallModel {
  DirectCallModel({
    required this.id,
    required this.callerId,
    required this.recipientId,
    required this.callerName,
    required this.recipientName,
    required this.callType,
    required this.status,
    required this.offerSdp,
    required this.currentUserCaller,
    this.answerSdp,
    this.callerPhoto,
    this.recipientPhoto,
  });
  final int id, callerId, recipientId;
  final String callerName, recipientName, callType, status, offerSdp;
  final String? answerSdp, callerPhoto, recipientPhoto;
  final bool currentUserCaller;
  factory DirectCallModel.fromJson(Map<String, dynamic> json) =>
      DirectCallModel(
          id: (json['id'] as num).toInt(),
          callerId: (json['callerId'] as num).toInt(),
          recipientId: (json['recipientId'] as num).toInt(),
          callerName: json['callerName'] as String? ?? 'Caller',
          recipientName: json['recipientName'] as String? ?? 'Recipient',
          callType: json['callType'] as String? ?? 'AUDIO',
          status: json['status'] as String? ?? 'RINGING',
          offerSdp: json['offerSdp'] as String? ?? '',
          answerSdp: json['answerSdp'] as String?,
          callerPhoto: json['callerPhoto'] as String?,
          recipientPhoto: json['recipientPhoto'] as String?,
          currentUserCaller: json['currentUserCaller'] == true);
}
