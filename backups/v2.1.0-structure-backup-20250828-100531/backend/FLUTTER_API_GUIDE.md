# 📱 DASI API Flutter 연동 가이드

## 🚀 Quick Start

### 1. Flutter 프로젝트에 dio 패키지 추가

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.4.0
  socket_io_client: ^2.0.3+1
  json_annotation: ^4.8.1

dev_dependencies:
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
```

### 2. API 클라이언트 설정

```dart
// lib/services/api_client.dart
import 'package:dio/dio.dart';

class ApiClient {
  static const String baseUrl = 'http://your-server:8080';
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // 인터셉터 추가 (Firebase Auth 토큰)
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Firebase Auth 토큰 추가
        final token = await FirebaseAuth.instance.currentUser?.getIdToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  Dio get dio => _dio;
}
```

## 🎯 주요 API 엔드포인트

### 1. 사용자 관리

#### 사용자 정보 조회
```dart
Future<UserProfile> getUser(String userId) async {
  final response = await _dio.get('/api/user/$userId');
  return UserProfile.fromJson(response.data['data']);
}
```

#### 경험치 추가
```dart
Future<void> addExperience({
  required String userId,
  required int amount,
  required String type, // 'LEARNING', 'REVIEW', 'STREAK', 'PERFECT', 'BONUS'
}) async {
  await _dio.post('/api/exp/add', data: {
    'userId': userId,
    'amount': amount,
    'type': type,
  });
}
```

### 2. 커리큘럼 & 콘텐츠

#### 레벨별 커리큘럼 조회
```dart
Future<ContentItem> getCurriculum(int level, {String version = 'revised'}) async {
  final response = await _dio.get(
    '/api/curriculum/$level',
    options: Options(headers: {'X-Curriculum-Version': version}),
  );
  return ContentItem.fromJson(response.data['data']);
}
```

### 3. 학습 세션

#### 세션 시작
```dart
Future<String> startSession({
  required String userId,
  required int level,
  required String stage,
  List<String>? cardIds,
}) async {
  final response = await _dio.post('/api/session/start', data: {
    'userId': userId,
    'level': level,
    'stage': stage,
    'cardIds': cardIds,
  });
  return response.data['sessionId'];
}
```

#### 세션 결과 제출
```dart
Future<void> submitSession({
  required String sessionId,
  required List<SessionResult> results,
}) async {
  await _dio.post('/api/session/submit', data: {
    'sessionId': sessionId,
    'results': results.map((r) => r.toJson()).toList(),
  });
}
```

## 🔄 실시간 통신 (Socket.IO)

### Flutter Socket.IO 클라이언트 설정

```dart
// lib/services/socket_service.dart
import 'package:socket_io_client/socket_io_client.dart';

class SocketService {
  late Socket _socket;

  void connect(String userId) {
    _socket = io('http://your-server:8080', 
      OptionBuilder()
        .setTransports(['websocket'])
        .enableForceNew()
        .build()
    );

    _socket.onConnect((_) {
      print('Socket connected');
      _socket.emit('join_user_room', userId);
    });

    // 스테이지 진행 상황 실시간 수신
    _socket.on('stage_progress', (data) {
      // UI 업데이트 로직
      updateStageProgress(data);
    });

    // 학습 완료 알림
    _socket.on('learning_complete', (data) {
      showCompletionNotification(data);
    });

    _socket.connect();
  }

  void disconnect() {
    _socket.disconnect();
  }
}
```

## 📊 데이터 모델 (JSON Serialization)

### 사용자 프로필
```dart
// lib/models/user_profile.dart
import 'package:json_annotation/json_annotation.dart';

part 'user_profile.g.dart';

@JsonSerializable()
class UserProfile {
  final String uid;
  final String email;
  final String? displayName;
  final int currentLevel;
  final int currentPhase;
  final int totalExp;
  final int streakDays;
  final ReviewStats? reviewStats;

  UserProfile({
    required this.uid,
    required this.email,
    this.displayName,
    required this.currentLevel,
    required this.currentPhase,
    required this.totalExp,
    required this.streakDays,
    this.reviewStats,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) =>
      _$UserProfileFromJson(json);
  Map<String, dynamic> toJson() => _$UserProfileToJson(this);
}
```

### 리뷰 통계
```dart
@JsonSerializable()
class ReviewStats {
  final int totalReviews;
  final double accuracy;
  final double avgQuality;

  ReviewStats({
    required this.totalReviews,
    required this.accuracy,
    required this.avgQuality,
  });

  factory ReviewStats.fromJson(Map<String, dynamic> json) =>
      _$ReviewStatsFromJson(json);
  Map<String, dynamic> toJson() => _$ReviewStatsToJson(this);
}
```

## 🔧 API 상태 관리 (Riverpod 예시)

```dart
// lib/providers/user_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final userProvider = FutureProvider.family<UserProfile, String>((ref, userId) async {
  final apiClient = ref.watch(apiClientProvider);
  return await apiClient.getUser(userId);
});

final curriculumProvider = FutureProvider.family<ContentItem, int>((ref, level) async {
  final apiClient = ref.watch(apiClientProvider);
  return await apiClient.getCurriculum(level);
});
```

## 🛠️ 에러 처리

```dart
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => 'ApiException: $message (Status: $statusCode)';
}

// API 클라이언트에 에러 핸들링 추가
_dio.interceptors.add(InterceptorsWrapper(
  onError: (error, handler) {
    if (error.response != null) {
      final statusCode = error.response!.statusCode;
      final message = error.response!.data['error'] ?? 'Unknown error';
      
      handler.reject(DioException(
        requestOptions: error.requestOptions,
        error: ApiException(message, statusCode),
      ));
    } else {
      handler.next(error);
    }
  },
));
```

## 📱 Flutter UI 통합 예시

### 학습 세션 화면
```dart
class LearningSessionScreen extends ConsumerWidget {
  const LearningSessionScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Column(
        children: [
          // 진행률 표시
          Consumer(
            builder: (context, ref, _) {
              final sessionAsync = ref.watch(currentSessionProvider);
              return sessionAsync.when(
                data: (session) => LinearProgressIndicator(
                  value: session.progress / 100,
                ),
                loading: () => const LinearProgressIndicator(),
                error: (err, _) => const SizedBox(),
              );
            },
          ),
          
          // 학습 콘텐츠
          Expanded(
            child: Consumer(
              builder: (context, ref, _) {
                final curriculumAsync = ref.watch(curriculumProvider(1));
                return curriculumAsync.when(
                  data: (curriculum) => LearningContent(curriculum: curriculum),
                  loading: () => const CircularProgressIndicator(),
                  error: (err, _) => ErrorWidget(err),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

## 🔍 API 문서 확인

개발 중에는 다음 URL에서 실시간으로 API 문서를 확인할 수 있습니다:

- **Swagger UI**: `http://localhost:8080/docs`
- **OpenAPI JSON**: `http://localhost:8080/api-docs.json`
- **Flutter 정보**: `http://localhost:8080/api/info`

## 🚨 주의사항

1. **인증**: 모든 API 호출에 Firebase Auth 토큰이 필요합니다
2. **CORS**: 개발 환경에서만 열려있으며, 프로덕션에서는 도메인 제한
3. **Rate Limiting**: 초당 100개 요청으로 제한됨
4. **Error Handling**: 항상 try-catch 블록으로 감싸서 처리
5. **Socket.IO**: 연결 끊김을 대비한 재연결 로직 구현 필요

## 🎯 추천 Flutter 패키지

```yaml
dependencies:
  # 필수
  dio: ^5.4.0                    # HTTP 클라이언트
  socket_io_client: ^2.0.3+1     # 실시간 통신
  firebase_auth: ^4.15.3         # Firebase 인증
  
  # 상태 관리
  flutter_riverpod: ^2.4.9       # 상태 관리
  
  # JSON 직렬화
  json_annotation: ^4.8.1
  
  # UI/UX
  flutter_screenutil: ^5.9.0     # 반응형 UI
  cached_network_image: ^3.3.0   # 이미지 캐싱
  
dev_dependencies:
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
```

이제 Flutter 앱에서 DASI API를 완전히 활용할 수 있습니다! 🚀