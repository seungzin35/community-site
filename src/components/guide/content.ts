import type { DriveStep } from "driver.js";

/** 지금 보고 있는 페이지 종류 */
export type PageKind = "home" | "board" | "gallery" | "anonymous" | "post" | "write" | "login" | "signup" | "admin" | "question" | "other";

export function pageKind(pathname: string): PageKind {
  if (pathname === "/") return "home";
  if (pathname === "/login") return "login";
  if (pathname === "/signup") return "signup";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/question")) return "question";
  if (/^\/b\/[^/]+\/write$/.test(pathname) || /^\/b\/[^/]+\/\d+\/edit$/.test(pathname)) return "write";
  if (/^\/b\/[^/]+\/\d+$/.test(pathname)) return "post";
  if (/^\/b\/[^/]+$/.test(pathname)) {
    // 갤러리 게시판인지는 화면에 붙은 표시로 알아냅니다.
    if (document.querySelector('[data-board-type="anonymous"]')) return "anonymous";
    return document.querySelector('[data-board-type="gallery"]') ? "gallery" : "board";
  }
  return "other";
}

/** 페이지마다 말풍선에 보여 줄 한마디 */
export const tips: Record<PageKind, string> = {
  home: "안녕하세요! 저는 뭉치예요. 여러분이 글을 쓰고 댓글을 달 때마다 제가 자라요. 오늘의 질문에도 답해 주세요! 처음이라면 '둘러보기'를 눌러 보세요.",
  board: "이 게시판의 글 목록이에요. 오른쪽 위 '글쓰기'로 새 글을 올리고, 아래 검색창으로 제목을 찾을 수 있어요.",
  gallery: "사진갤러리예요! 사진을 눌러 크게 보고, '글쓰기'로 내 사진도 자랑해 보세요.",
  anonymous:
    "여기는 익명 고민상담소예요. 닉네임 대신 '익명'으로 보여서 아무도 누가 썼는지 몰라요. 편하게 털어놓고, 다른 분 고민엔 따뜻한 댓글을 남겨 주세요!",
  post: "글이 마음에 들면 '추천'을 눌러 주세요. 추천을 많이 받으면 홈의 인기글에 올라가요!",
  write: "제목과 내용을 쓰고, 필요하면 사진도 붙일 수 있어요. 다 쓰면 '등록'을 눌러 주세요.",
  login: "가입할 때 쓴 이메일과 비밀번호로 로그인해요. 아직 회원이 아니라면 아래 '회원가입'을 눌러 주세요.",
  signup: "이메일, 닉네임, 비밀번호만 있으면 바로 가입돼요. 닉네임은 글과 댓글에 보여요.",
  admin: "관리자 화면이에요. 신고된 글을 처리하고, 게시판을 추가하고, 회원을 관리할 수 있어요.",
  question:
    "매일 밤 12시에 제가 새 질문을 내요! 답을 남겨야 다른 사람들의 답이 열리고, 좋아요를 가장 많이 받은 답은 명예의 전당에 올라가요.",
  other: "궁금한 게 있으면 저를 눌러 주세요!",
};

/** 둘러보기 단계: 화면에 있는 것만 골라서 보여 줍니다. */
const allSteps: (DriveStep & { pages: PageKind[] })[] = [
  {
    pages: ["home", "board", "gallery", "anonymous", "post"],
    element: '[data-tour="boards"]',
    popover: { title: "게시판 메뉴", description: "여기서 자유게시판, 유머게시판, 사진갤러리를 오갈 수 있어요." },
  },
  {
    pages: ["home"],
    element: '[data-tour="mascot"]',
    popover: {
      title: "함께 키우는 뭉치",
      description: "모두가 글, 댓글, 추천을 할 때마다 점수가 쌓여 뭉치가 자라요. 레벨이 오르면 모습이 바뀌어요!",
    },
  },
  {
    pages: ["home"],
    element: '[data-tour="question"]',
    popover: { title: "오늘의 질문", description: "매일 밤 12시에 새 질문이 열려요. 답을 남기면 다른 사람들의 답을 볼 수 있어요." },
  },
  {
    pages: ["question"],
    element: '[data-tour="answer"]',
    popover: { side: "top", title: "나의 답", description: "여기에 답을 쓰고 '답하기'를 누르면 다른 사람들의 답이 열려요." },
  },
  {
    pages: ["home"],
    element: '[data-tour="feeds"]',
    popover: { side: "top", title: "인기글 · 최신글", description: "추천을 많이 받은 글과 방금 올라온 글이 모여 있어요." },
  },
  {
    pages: ["home", "board", "gallery", "anonymous"],
    element: '[data-tour="write"]',
    popover: { side: "bottom", title: "글쓰기", description: "누르면 바로 새 글을 쓸 수 있어요. 글을 쓰려면 로그인이 필요해요." },
  },
  {
    pages: ["home"],
    element: '[data-tour="gallery"]',
    popover: { title: "사진갤러리", description: "사진을 올리고 구경하는 곳이에요. 사진이 큼직하게 모여 보여요." },
  },
  {
    pages: ["board", "gallery", "anonymous"],
    element: '[data-tour="search"]',
    popover: { title: "검색", description: "찾고 싶은 글의 제목을 넣어 보세요." },
  },
  {
    pages: ["post"],
    element: '[data-tour="vote"]',
    popover: { side: "top", title: "추천 · 비추천", description: "좋은 글엔 추천을 꾹! 추천을 많이 받으면 인기글이 돼요." },
  },
  {
    pages: ["post"],
    element: '[data-tour="comments"]',
    popover: { side: "top", title: "댓글", description: "댓글을 남기고, 다른 댓글에 '답글 쓰기'로 대화할 수 있어요." },
  },
  {
    pages: ["write"],
    element: '[data-tour="post-form"]',
    popover: { side: "top", title: "글 쓰는 곳", description: "제목, 내용, 사진을 넣고 '등록'을 누르면 끝이에요." },
  },
  {
    pages: ["home", "board", "gallery", "anonymous", "post", "write", "question", "other"],
    element: '[data-tour="signup"]',
    popover: { title: "회원가입", description: "가입하면 글쓰기, 댓글, 추천을 모두 할 수 있어요. 1분이면 끝나요!" },
  },
  {
    pages: ["home", "board", "gallery", "anonymous", "post", "write", "login", "signup", "admin", "question", "other"],
    element: '[data-tour="theme"]',
    popover: { title: "밤에는 어둡게", description: "눈이 부시면 이 버튼으로 어두운 화면으로 바꿀 수 있어요." },
  },
];

function isVisible(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function tourSteps(kind: PageKind): DriveStep[] {
  return allSteps
    .filter((step) => step.pages.includes(kind) && isVisible(step.element as string))
    .map((step) => ({ element: step.element, popover: step.popover }));
}
