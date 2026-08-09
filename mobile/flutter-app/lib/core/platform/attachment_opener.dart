export 'attachment_opener_stub.dart'
    if (dart.library.io) 'attachment_opener_io.dart'
    if (dart.library.html) 'attachment_opener_web.dart';
