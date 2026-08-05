// ignore: deprecated_member_use
import 'dart:html' as html;
import 'dart:typed_data';

Future<bool> openAttachmentBytes(
  Uint8List bytes,
  String mimeType,
  String fileName,
) async {
  final blob = html.Blob(<Object>[bytes], mimeType);
  final url = html.Url.createObjectUrlFromBlob(blob);
  html.window.open(url, '_blank');
  Future<void>.delayed(const Duration(minutes: 1), () {
    html.Url.revokeObjectUrl(url);
  });
  return true;
}
