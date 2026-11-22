/** 사이트 이름 등 기본 정보. 이름이 정해지면 여기만 바꾸면 됩니다. */
export const site = {
  name: "뭉치네",
  description: "뭉치랑 같이 노는 동네 커뮤니티. 매일 오늘의 질문에 한마디 남기고, 다 같이 뭉치를 키워요.",
  /** 실제 사이트 주소. 검색엔진과 링크 미리보기에 쓰입니다. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://community.zinnote.kr",
};
