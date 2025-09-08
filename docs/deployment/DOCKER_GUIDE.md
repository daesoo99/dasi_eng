# 🐳 DaSi English Learning Platform - Docker Deployment Guide

이 가이드는 DaSi 플랫폼을 Docker를 사용하여 배포하는 방법을 설명합니다.

## 📋 사전 요구사항

- **Docker Desktop** (Windows/Mac) 또는 **Docker Engine** (Linux)
- **Docker Compose** v2.0 이상
- 최소 4GB RAM, 2GB 디스크 공간

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# .env.docker 파일을 .env로 복사
cp backend/.env.docker backend/.env

# 환경 변수 수정 (Firebase 설정 등)
# backend/.env 파일을 편집하여 실제 값으로 변경
```

### 2. 서비스 시작

**Windows:**
```cmd
docker-start.bat
```

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**수동 시작:**
```bash
# 개발 모드 (Backend + Redis)
docker-compose up -d

# 프로덕션 모드 (Backend + Redis + Frontend + Nginx)
docker-compose --profile production up -d
```

### 3. 서비스 확인

- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **Prometheus Metrics**: http://localhost:8080/metrics
- **Redis**: localhost:6379
- **Frontend** (프로덕션 모드): http://localhost:80

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   React Frontend│    │   Node Backend  │
│   (Port 80)     │◄──►│   (Port 3000)   │◄──►│   (Port 8080)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                               ┌─────────────────┐
                                               │   Redis Cache   │
                                               │   (Port 6379)   │
                                               └─────────────────┘
```

## 🐳 서비스 구성

### Backend Service
- **Image**: Node.js 20 Alpine
- **Features**: 
  - Non-root user 보안
  - Health check 내장
  - 모니터링 & 로깅
  - Redis 캐시 연동
- **Volumes**: 
  - `./backend/logs:/app/logs` (로그)
  - Firebase 서비스 계정 키

### Redis Service  
- **Image**: Redis 7 Alpine
- **Features**:
  - 데이터 영속성 (AOF)
  - Health check
  - 네트워크 격리
- **Volume**: `redis-data:/data`

### Frontend Service (선택적)
- **Image**: Multi-stage build (Node + Nginx)
- **Features**:
  - Production 최적화 빌드
  - Gzip 압축
  - API 프록시 설정
  - 정적 파일 캐싱

## 📊 모니터링 & 로깅

### Prometheus 메트릭
```bash
# 메트릭 확인
curl http://localhost:8080/metrics

# 주요 메트릭:
# - http_request_duration_ms: HTTP 요청 지연시간
# - api_requests_total: API 요청 수
# - cache_hit_rate_total: 캐시 히트율
# - queue_size_total: 큐 크기
# - task_processing_time_ms: 작업 처리시간
```

### 로그 확인
```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f redis

# 실시간 로그 (JSON 형태)
docker-compose exec backend tail -f /app/logs/app.log
```

## 🔧 유지보수 명령어

```bash
# 서비스 상태 확인
docker-compose ps

# 서비스 재시작
docker-compose restart backend

# 특정 서비스 스케일링
docker-compose up -d --scale backend=2

# 서비스 중지
docker-compose down

# 데이터와 함께 완전 삭제
docker-compose down -v --remove-orphans

# 이미지 재빌드
docker-compose build --no-cache
```

## 🛡️ 보안 고려사항

### 컨테이너 보안
- ✅ Non-root 사용자 실행
- ✅ 최소 권한 원칙
- ✅ 보안 헤더 설정
- ✅ 네트워크 격리

### 환경 변수 보안
```bash
# .env 파일 권한 설정
chmod 600 backend/.env

# 중요: 프로덕션에서는 다음 변경 필수
# - JWT_SECRET: 강력한 비밀키로 변경
# - Firebase 인증 정보: 실제 프로젝트 정보
# - REDIS_URL: 프로덕션 Redis 인스턴스
```

## 🚀 프로덕션 배포

### Google Cloud Run
```bash
# 이미지 빌드 및 푸시
docker build -t gcr.io/YOUR_PROJECT/dasi-backend ./backend
docker push gcr.io/YOUR_PROJECT/dasi-backend

# Cloud Run 배포
gcloud run deploy dasi-backend \
  --image gcr.io/YOUR_PROJECT/dasi-backend \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

### Kubernetes
```yaml
# k8s/backend-deployment.yaml 예시
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dasi-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dasi-backend
  template:
    metadata:
      labels:
        app: dasi-backend
    spec:
      containers:
      - name: backend
        image: your-registry/dasi-backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 🔍 문제 해결

### 일반적인 문제

1. **포트 충돌**
   ```bash
   # 포트 사용 확인
   netstat -tulpn | grep :8080
   # 다른 포트 사용
   PORT=9000 docker-compose up
   ```

2. **메모리 부족**
   ```bash
   # Docker 메모리 할당 확인
   docker system df
   docker system prune
   ```

3. **Redis 연결 실패**
   ```bash
   # Redis 컨테이너 상태 확인
   docker-compose exec redis redis-cli ping
   ```

4. **Firebase 인증 오류**
   - `backend/.env`의 Firebase 설정 확인
   - 서비스 계정 키 파일 경로 확인
   - Firebase 프로젝트 권한 확인

### 로그 분석
```bash
# 에러 로그만 필터링
docker-compose logs backend | grep ERROR

# 최근 100줄 로그
docker-compose logs --tail=100 backend

# 특정 시간대 로그
docker-compose logs --since="2024-01-01T10:00:00" backend
```

## 📈 성능 최적화

### 캐시 최적화
- Redis 메모리 설정: `maxmemory 256mb`
- LRU 정책: `maxmemory-policy allkeys-lru`
- 캐시 TTL 조정: 환경변수로 설정

### 스케일링
```bash
# 수평 스케일링
docker-compose up -d --scale backend=3

# 로드 밸런서 설정 (nginx.conf)
upstream backend_pool {
    server backend_1:8080;
    server backend_2:8080;
    server backend_3:8080;
}
```

---

## 📞 지원

문제가 발생하면:
1. 로그 확인: `docker-compose logs`
2. Health check: `curl http://localhost:8080/health`
3. 메트릭 확인: `curl http://localhost:8080/metrics`

더 자세한 정보는 프로젝트 문서를 참조하세요.