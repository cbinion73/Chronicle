interface ApiBibleBook {
  id: string;
  name: string;
}

interface ApiBibleChapter {
  id: string;
  number: string;
}

let booksPromise: Promise<ApiBibleBook[]> | null = null;
const chaptersCache = new Map<string, Promise<number[]>>();
const bookIdToName = new Map<string, string>();
const bookNameToId = new Map<string, string>();

export async function getApiBibleBooks() {
  if (!booksPromise) {
    booksPromise = fetch('/api/api-bible/books')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load API.Bible books.');
        const payload = await response.json() as { data?: ApiBibleBook[] };
        const books = payload.data || [];
        for (const book of books) {
          bookIdToName.set(book.id, book.name);
          bookNameToId.set(book.name, book.id);
        }
        return books;
      });
  }

  const books = await booksPromise;
  return books.map((book) => book.name);
}

export async function getApiBibleChapters(bookName: string) {
  const bookId = await getApiBibleBookId(bookName);
  if (!bookId) return [];

  if (!chaptersCache.has(bookId)) {
    chaptersCache.set(bookId, fetch(`/api/api-bible/chapters?bookId=${encodeURIComponent(bookId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load chapters for ${bookName}.`);
        const payload = await response.json() as { data?: ApiBibleChapter[] };
        return (payload.data || [])
          .map((chapter) => Number(chapter.number))
          .filter((chapter) => Number.isFinite(chapter));
      }));
  }

  return chaptersCache.get(bookId)!;
}

export async function getApiBibleBookId(bookName: string) {
  if (bookNameToId.has(bookName)) return bookNameToId.get(bookName)!;

  await getApiBibleBooks();
  return bookNameToId.get(bookName) || null;
}
