import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { getAllTitles } = await import('@/lib/titles');
  const titles = await getAllTitles();
  return NextResponse.json(titles);
}
