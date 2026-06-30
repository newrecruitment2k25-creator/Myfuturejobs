// Client-side PDF text extraction using pdfjs-dist.
// IMPORTANT: only import in client code (uses FileReader + DOM APIs).

const PDF_WORKER_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function getPdfLib() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  return pdfjs;
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read PDF file."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read PDF file."));
    reader.readAsArrayBuffer(file);
  });
}

async function extractWithPdfJs(file: File): Promise<string> {
  const pdfjs = await getPdfLib();
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const originalWorker = globalThis.Worker;
  const workerGlobal = globalThis as unknown as {
    Worker: typeof Worker | undefined;
  };

  // Force PDF.js to use its fake-worker path. This avoids iOS Safari/mobile
  // worker initialization failures while still using the explicit 3.11.174 worker script.
  try {
    workerGlobal.Worker = undefined;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it: any) => ("str" in it ? it.str : ""))
        .join(" ");
      fullText += pageText + "\n\n";
    }
    return fullText.trim();
  } finally {
    workerGlobal.Worker = originalWorker;
  }
}

export async function extractPdfText(file: File): Promise<string> {
  try {
    return await extractWithPdfJs(file);
  } catch (pdfError) {
    console.warn("PDF.js extraction failed, trying plain-text fallback:", pdfError);
    const fallbackText = await file.text();
    if (fallbackText.trim()) return fallbackText.trim();
    throw pdfError;
  }
}