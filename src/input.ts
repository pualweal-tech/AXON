type Recognition = {
  lang: string;
  start(): void;
  abort(): void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
function pick(accept: string, signal: AbortSignal): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    const abort = () => reject(new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    input.onchange = () => {
      signal.removeEventListener("abort", abort);
      const file = input.files?.[0];
      if (file) resolve(file);
      else abort();
    };
    input.oncancel = () => {
      signal.removeEventListener("abort", abort);
      abort();
    };
    input.click();
  });
}
export async function attachment(
  mode: "voice" | "image" | "link" | "document",
  extra: string | undefined,
  lang: string,
  signal: AbortSignal,
) {
  const zh = lang === "zh";
  if (mode === "voice") {
    const browser = window as Window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Engine = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Engine)
      throw Error(
        zh
          ? "此浏览器不支持语音识别。"
          : "Speech recognition is unavailable in this browser.",
      );
    const speech = new Engine();
    speech.lang = lang;
    const text = await new Promise<string>((resolve, reject) => {
      const abort = () => speech.abort();
      signal.addEventListener("abort", abort, { once: true });
      speech.onresult = (e) => resolve(e.results[0][0].transcript);
      speech.onerror = () =>
        reject(
          Error(
            zh
              ? "录音未完成，请检查麦克风权限。"
              : "Recording failed. Check microphone permission.",
          ),
        );
      speech.onend = () => {
        signal.removeEventListener("abort", abort);
        reject(new DOMException("Cancelled", "AbortError"));
      };
      speech.start();
    });
    return { text };
  }
  if (mode === "image") {
    const file = await pick("image/png,image/jpeg,image/webp", signal);
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1450000
    )
      throw Error(
        zh
          ? "请选择 1.4 MB 以内的 PNG、JPEG 或 WebP。"
          : "Select a PNG, JPEG or WebP under 1.4 MB.",
      );
    const image = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(Error("Image read failed"));
      r.readAsDataURL(file);
    });
    return { text: (zh ? "分析图片：" : "Analyze image: ") + file.name, image };
  }
  let label = "",
    content = "";
  if (mode === "document") {
    const file = await pick(".txt,.md,.csv,.json,.html,.htm", signal);
    if (!/\.(txt|md|csv|json|html?)$/i.test(file.name) || file.size > 200000)
      throw Error(
        zh
          ? "请选择 200 KB 以内的文本文件。"
          : "Select a text document under 200 KB.",
      );
    label = file.name;
    content = await file.text();
    if (/\.html?$/i.test(label)) content = extract(content);
  } else {
    const url = new URL(extra || "");
    if (url.protocol !== "https:" || url.username || url.password)
      throw Error(zh ? "请输入 HTTPS 网页地址。" : "Enter an HTTPS page URL.");
    label = url.href;
    try {
      const response = await fetch(url, {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      });
      if (
        !response.ok ||
        !response.body ||
        !/(text\/|application\/xhtml)/i.test(
          response.headers.get("content-type") || "",
        )
      )
        throw Error();
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      try {
        while (content.length < 200000) {
          const { done, value } = await reader.read();
          if (done) break;
          content += value;
        }
      } finally {
        await reader.cancel();
      }
      if (response.headers.get("content-type")?.includes("html"))
        content = extract(content);
    } catch {
      throw Error(
        zh
          ? "网页未允许浏览器读取。可将正文保存为文本文件后导入。"
          : "Page access was blocked. Import the page text as a document.",
      );
    }
  }
  content = content.trim();
  if (!content)
    throw Error(zh ? "没有可分析的正文。" : "No readable text found.");
  if (content.length > 27500)
    throw Error(
      zh
        ? "正文太长，请先选择需要分析的段落。"
        : "Select a smaller excerpt (up to 27,500 characters).",
    );
  return {
    text: (zh ? "总结来源 " : "Summarize source ") + label + "\n\n" + content,
  };
}
function extract(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("script,style,noscript,nav,footer")
    .forEach((n) => n.remove());
  return (doc.querySelector("main,article") || doc.body).textContent || "";
}
