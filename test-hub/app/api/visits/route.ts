import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 프로젝트 루트 폴더에 'db.json' 파일을 만들어 데이터를 영구 저장함
const filePath = path.join(process.cwd(), 'db.json');

// 파일에서 데이터를 읽어오는 함수
function readData(): number {
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(fileData);
      return json.totalVisits || 1;
    }
  } catch (error) {
    console.error('파일 읽기 실패, 기본값 사용');
  }
  return 1; // 파일이 없으면 1부터 시작
}

// 파일에 데이터를 저장하는 함수
function writeData(count: number) {
  try {
    fs.writeFileSync(filePath, JSON.stringify({ totalVisits: count }), 'utf8');
  } catch (error) {
    console.error('파일 저장 실패');
  }
}

export async function GET() {
  const currentHits = readData();
  return NextResponse.json({ totalVisits: currentHits });
}

export async function POST() {
  let currentHits = readData();
  currentHits += 1; // 새로고침이나 접속 시 숫자를 누적
  writeData(currentHits); // 하드디스크에 영구 저장
  
  return NextResponse.json({ totalVisits: currentHits });
}