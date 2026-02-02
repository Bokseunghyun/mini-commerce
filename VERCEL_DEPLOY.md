# 🚀 Vercel 배포 가이드

## 방법 1: GitHub 연동 배포 (권장)

### 1단계: GitHub 저장소 생성
1. GitHub에서 새 저장소 생성
2. 로컬에서 원격 저장소 연결:
```bash
cd mini-commerce-updated
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 2단계: Vercel에서 배포
1. [Vercel](https://vercel.com) 접속 및 로그인
2. "New Project" 클릭
3. GitHub 저장소 import
4. 프로젝트 설정:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. "Deploy" 클릭!

---

## 방법 2: Vercel CLI로 직접 배포

### 1단계: Vercel CLI 설치
```bash
npm install -g vercel
```

### 2단계: 로그인
```bash
vercel login
```

### 3단계: 배포
```bash
cd mini-commerce-updated
vercel
```

프롬프트에서:
- Set up and deploy: **Y**
- Which scope: 본인 계정 선택
- Link to existing project: **N**
- Project name: `mini-commerce-qa` (원하는 이름)
- In which directory: **./** (Enter)
- Want to override settings: **N**

### 4단계: 프로덕션 배포
```bash
vercel --prod
```

---

## ⚙️ 환경 변수 설정 (선택사항)

Vercel 대시보드에서:
1. 프로젝트 선택
2. Settings > Environment Variables
3. 필요한 환경 변수 추가:
   - `VITE_API_BASE_URL`: API 베이스 URL (선택)

---

## 🔧 vercel.json 설정 (이미 포함됨)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## ✅ 배포 확인

배포 후 다음을 확인하세요:

1. **홈페이지 접속**
   - URL: `https://your-project.vercel.app`
   - 홈페이지가 첫 화면으로 표시되는지 확인

2. **로그인 테스트**
   - 일반 사용자: user / password
   - 관리자: admin / admin123

3. **주요 기능 확인**
   - [ ] 상품 검색
   - [ ] 장바구니 담기
   - [ ] 주문하기
   - [ ] 관리자 기능 (admin 계정)

---

## 🐛 문제 해결

### 빌드 오류
```bash
# 로컬에서 먼저 빌드 테스트
npm run build
npm run preview
```

### API 라우트 404 오류
- `vercel.json` 파일이 프로젝트 루트에 있는지 확인
- Vercel 대시보드에서 Functions 로그 확인

### 환경 변수 문제
- `.env.production` 파일 확인
- Vercel 대시보드에서 환경 변수 설정

---

## 📱 Playwright 테스트 설정

배포 후 Playwright 테스트에서 URL 변경:

```javascript
// playwright.config.js
export default {
  use: {
    baseURL: 'https://your-project.vercel.app',
  },
}
```

---

## 🔄 재배포

코드 수정 후:

### GitHub 연동 시 (자동 배포)
```bash
git add .
git commit -m "Update features"
git push
```
→ Vercel이 자동으로 재배포합니다!

### CLI 사용 시
```bash
vercel --prod
```

---

## 💡 유용한 명령어

```bash
# 배포 로그 확인
vercel logs

# 프로젝트 목록
vercel ls

# 특정 배포 삭제
vercel rm [deployment-url]

# 환경 변수 추가
vercel env add
```

---

Happy Deploying! 🎉
