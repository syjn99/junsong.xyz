# 글 작성 가이드

새 글은 Markdown 파일 하나로 쓰고, `main` 브랜치에 푸시하면 몇 분 뒤
junsong.xyz에 올라간다. 서버나 관리자 화면은 없다.

1. `npm run new -- "제목"`으로 글 파일을 만든다.
2. 파일 맨 위(front matter)에 태그, 요약, 대표 이미지를 적는다.
3. 본문을 Markdown으로 쓰고, 이미지는 `public/content/images/` 아래에 넣는다.
4. `npm run dev`로 http://localhost:4321 에서 미리 본다.
5. `draft: true` 줄을 지우고 커밋, 푸시한다. GitHub Actions가 빌드, 검사, 배포를 한다.

## 처음 한 번만

코드는 [github.com/syjn99/junsong.xyz](https://github.com/syjn99/junsong.xyz)에 있다.
Node 버전은 `.nvmrc`에 고정돼 있다.

```bash
git clone git@github.com:syjn99/junsong.xyz.git   # 다른 컴퓨터에서만
cd junsong.xyz
nvm use        # .nvmrc의 Node 22 사용 (새 터미널마다)
npm install    # 처음 한 번, 또는 package.json이 바뀔 때
```

## 새 글 만들기

`npm run new`가 글 파일과 이번 달 이미지 폴더를 만들어 준다. 파일이 놓인
폴더(`en/`, `ko/`)가 언어와 URL을 정한다.

| 명령 | 만들어지는 파일 | 발행 URL |
| --- | --- | --- |
| `npm run new -- "My post title"` | `src/content/posts/en/my-post-title.md` | `/my-post-title/` |
| `npm run new -- "제목" --ko --slug my-slug` | `src/content/posts/ko/my-slug.md` | `/ko/my-slug/` |

- **slug**는 URL에 들어가는 이름이다. 영어 제목은 자동으로 만들어지지만,
  한국어 제목은 `--slug`를 꼭 넣어야 한다.
- 같은 slug가 이미 있으면 멈춘다. 발행 후 slug를 바꾸면 기존 링크가 깨지니
  처음에 정한다.
- 새 파일은 `draft: true`로 시작해서, 푸시해도 사이트에 보이지 않는다.

## Front matter

파일 맨 위 `---` 사이에 적는 설정이다. `title`과 `date`만 필수다.

```yaml
---
title: "My post title"
date: 2026-11-02T09:00:00+09:00
tags: [retrospect, core]
excerpt: "카드와 SNS 미리보기에 나오는 한 줄 요약"
feature_image: /content/images/2026/11/cover.jpg
feature_image_caption: "Photo by …"
translation: my-post-ko
draft: true
---
```

| 필드 | 설명 |
| --- | --- |
| `title` | 제목 (필수) |
| `date` | 발행일. 목록은 이 날짜 순서로 정렬된다 (필수) |
| `updated` | 수정일 (선택) |
| `tags` | 태그 slug 목록. 첫 번째가 카드와 글 상단에 표시된다. 기존 태그: `retrospect`, `open-source`, `core`, `frontend`, `archive`. 새 이름을 쓰면 태그 페이지가 자동으로 생긴다 |
| `excerpt` | 요약. 없으면 본문 앞 50단어 정도가 쓰인다 |
| `feature_image` | 대표 이미지. `/content/images/…` 경로 또는 외부 URL |
| `feature_image_alt` | 대표 이미지 대체 텍스트 |
| `feature_image_caption` | 대표 이미지 캡션. HTML 사용 가능 |
| `featured` | `true`면 추천 글로 표시 |
| `slug` | URL 이름. 없으면 파일 이름 |
| `translation` | 다른 언어로 쓴 같은 글의 slug (아래 "번역본 연결") |
| `draft` | `true`면 배포되지 않는다. `npm run dev`에서는 보인다 |

## 본문 작성

본문은 일반 Markdown이다.

**이미지**: 파일을 `public/content/images/<연>/<월>/`에 넣고 `/content/images/…`로
참조한다. `public`은 경로에 쓰지 않는다. 목록용 작은 크기와 WebP 버전은 빌드할 때
자동으로 만들어진다.

```markdown
![사진 설명](/content/images/2026/11/screenshot.png)
```

**코드 블록**: 언어 이름을 붙이면 Prism이 색을 입힌다.

````markdown
```go
func main() {}
```
````

**링크**: 내 글은 `/slug/`, `/ko/slug/`처럼 도메인 없이 쓴다.
외부 링크는 전체 URL을 쓴다.

Markdown으로 안 되는 표현(임베드 등)은 HTML을 그대로 써도 된다.

## 번역본 연결

같은 글을 영어와 한국어로 둘 다 썼다면, 한쪽 front matter에 상대 글의 slug를
적는다. 양쪽에 적어도 된다.

```yaml
# src/content/posts/en/my-post.md
translation: my-post-ko
```

연결하면 상단 `EN | KO` 스위치가 번역본으로 바로 간다. 연결하지 않으면 그 언어의
홈으로 간다. 홈, 태그 페이지, 하단 추천 글, 검색은 현재 언어의 글만 보여준다.
Ghost 시절 글의 번역 쌍은 `src/data/translations.json`에 있다.

## 미리보기와 발행

```bash
npm run dev     # http://localhost:4321 , 저장하면 바로 반영, draft도 보임
```

검색은 빌드할 때 색인을 만들어서 `npm run dev`에서는 동작하지 않는다.
검색까지 확인하려면 `npm run build && npm run preview`를 쓴다.

준비가 되면 `draft: true` 줄을 지우고 푸시한다.

```bash
git add src/content/posts public/content/images
git commit -m "Add post: My post title"
git push
```

푸시하면 GitHub Actions가 `npm run build`와 `npm run verify`(깨진 링크와 이미지
검사)를 거쳐 배포한다. 진행 상황은 저장소의
[Actions 탭](https://github.com/syjn99/junsong.xyz/actions)에서 본다. 보통 2~3분
걸린다.

## 자주 하는 작업과 문제 해결

- **글 수정**: 파일을 고치고 푸시한다. 필요하면 `updated`에 날짜를 적는다.
- **글 내리기**: `draft: true`를 다시 넣거나 파일을 지운다. 지우면 그 URL은 404가 된다.
- **Ghost에서 옮겨 온 글 수정**: `src/content/legacy/<slug>.json`의 `html` 필드를
  고친다. 꼭 필요할 때만 손댄다.
- **배포 실패**: Actions 탭에서 실패한 단계를 연다. 흔한 원인은 다음과 같다.
  - front matter 형식 오류 (따옴표, 날짜 형식)
  - 없는 이미지 경로 (`npm run verify`가 잡는다)
  - slug 중복 ("Duplicate URL" 오류)

  로컬에서 `npm run build && npm run verify`를 돌리면 같은 오류를 미리 볼 수 있다.
