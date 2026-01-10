import { Database } from "bun:sqlite";
import { join } from "path";

// 1. 데이터베이스 경로 설정
const HOME = process.env.HOME;
const DB_PATH = join(
  HOME!,
  "Library/Containers/com.ranchero.NetNewsWire-Evergreen/Data/Library/Application Support/NetNewsWire/Accounts/2_iCloud/DB.sqlite3"
);

export function getTodayArticles(): {
  title: string;
  url: string;
  datePublished: number;
}[] {
  const db = new Database(DB_PATH, { readonly: true });
  const query = db.query(`
    SELECT a.title, a.url, a.datePublished
    FROM articles a
    JOIN statuses s ON a.articleID = s.articleID
    WHERE s.read = 0
      AND a.datePublished >= strftime('%s', date('now', '+9 hours', '-1 day'), '-9 hours')
    ORDER BY a.datePublished DESC
  `);
  const todayArticles = query.all() as {
    title: string;
    url: string;
    datePublished: number;
  }[];
  db.close();
  return todayArticles;
}
