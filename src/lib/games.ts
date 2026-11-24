
export type GameId = "merge" | "quiz" | "jump" | "tower" | "balloon" | "cards" | "reflex";

export type GameInfo = {
  id: GameId;
  name: string;
  emoji: string;
  summary: string;
  howTo: string;
  /** 높을수록 좋은 기록인지 (점수) 낮을수록 좋은지 (시간) */
  higherBetter: boolean;
};

export const games: GameInfo[] = [
  {
    id: "merge",
    name: "뭉치 합치기",
    emoji: "🫧",
    summary: "같은 뭉치끼리 부딪혀 더 큰 뭉치로",
    howTo: "원하는 자리에서 손을 떼면 뭉치가 떨어져요. 같은 크기끼리 닿으면 합쳐져 커져요. 뭉치가 빨간 선 위로 넘치면 끝!",
    higherBetter: true,
  },
  {
    id: "quiz",
    name: "오늘의 초성 퀴즈",
    emoji: "🔤",
    summary: "하루 한 문제, 초성 보고 단어 맞히기",
    howTo: "초성과 힌트를 보고 단어를 6번 안에 맞혀요. 글자가 맞는 자리면 초록, 다른 자리에 있으면 노랑으로 알려 줘요. 매일 밤 12시에 새 문제!",
    higherBetter: true,
  },
  {
    id: "jump",
    name: "뭉치 점프",
    emoji: "🏃",
    summary: "굴러오는 장애물을 폴짝 뛰어넘어요",
    howTo: "화면을 누르거나 스페이스바를 눌러 점프! 길게 누르면 더 높이 뛰어요. 오래 버틸수록 빨라져요.",
    higherBetter: true,
  },
  {
    id: "tower",
    name: "뭉치 탑 쌓기",
    emoji: "🏗️",
    summary: "움직이는 블록을 딱 맞춰 높이 높이",
    howTo: "좌우로 움직이는 블록을 눌러서 떨어뜨려요. 아래 블록에서 삐져나온 부분은 잘려 나가요. 딱 맞추면 블록이 안 줄어들어요!",
    higherBetter: true,
  },
  {
    id: "balloon",
    name: "풍선 뭉치",
    emoji: "🎈",
    summary: "톡톡 눌러 가시 구름 사이로 둥실",
    howTo: "누를 때마다 뭉치가 위로 둥실 떠올라요. 가시 구름 사이 빈틈으로 지나가면 1점! 땅에 닿아도 끝이에요.",
    higherBetter: true,
  },
  {
    id: "cards",
    name: "짝꿍 카드",
    emoji: "🃏",
    summary: "같은 그림 카드 8쌍을 빨리 찾아요",
    howTo: "카드를 두 장씩 뒤집어 같은 그림을 맞춰요. 모두 맞추는 시간이 짧을수록 높은 순위예요.",
    higherBetter: false,
  },
  {
    id: "reflex",
    name: "번개 반응",
    emoji: "⚡",
    summary: "화면이 바뀌는 순간 누르는 반응속도",
    howTo: "화면이 초록색으로 바뀌면 최대한 빨리 눌러요. 5번 잰 평균이 내 기록이에요. 너무 일찍 누르면 다시!",
    higherBetter: false,
  },
];

export function getGame(id: string): GameInfo | undefined {
  return games.find((game) => game.id === id);
}

/** 기록을 사람이 읽기 좋게 */
export function formatRecord(game: GameId, score: number) {
  if (game === "tower") return `${score.toLocaleString()}층`;
  if (game === "quiz") return `${score.toLocaleString()}일 정답`;
  if (game === "merge" || game === "jump" || game === "balloon") return `${score.toLocaleString()}점`;
  if (game === "cards") return `${(score / 1000).toFixed(1)}초`;
  return `${score}ms`;
}

export type RankEntry = { user_id: string; score: number; plays: number; nickname: string };

/** 오늘의 초성 퀴즈 상태 */
export type QuizGuess = { word: string; marks: number[] };
export type QuizToday = {
  day: string;
  chosung: string;
  length: number;
  category: string;
  hint: string;
  solvers: number;
  guesses: QuizGuess[];
  solved: boolean;
  answer: string | null;
};
