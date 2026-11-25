// 화면의 현재 시각·시뮬레이션 시작 시각을 서버 시계에 맞춘다(요청마다 새로 읽는다).
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
