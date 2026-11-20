# 커뮤니티 사이트

회원가입 후 게시판에서 활동하는 자유 커뮤니티 사이트입니다.

- **Next.js** (App Router, TypeScript, Tailwind CSS): 화면과 기능
- **Supabase**: DB(PostgreSQL), 회원가입·로그인, 사진 저장
- **Vercel**: 배포

## 폴더 구조

| 경로 | 내용 |
| --- | --- |
| `src/app` | 페이지 |
| `src/components` | 화면 부품 |
| `src/lib/supabase` | Supabase 연결 코드 |
| `src/proxy.ts` | 로그인 세션 갱신 |
| `supabase/migrations` | DB 구조(SQL) |

## 시작하기

1. `npm install`
2. `.env.example`을 `.env.local`로 복사하고 Supabase 프로젝트의 URL과 키를 넣습니다.
3. Supabase SQL Editor에서 `supabase/migrations/0001_init.sql`을 실행합니다.
4. `npm run dev` 후 http://localhost:3000 접속

환경 변수가 없어도 예시 게시판으로 화면은 열립니다.

## 첫 관리자 지정

회원가입 후 Supabase SQL Editor에서 한 번 실행합니다.

```sql
update public.profiles set role = 'admin' where nickname = '내닉네임';
```
