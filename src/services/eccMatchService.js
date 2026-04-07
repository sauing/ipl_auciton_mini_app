export async function fetchKncbMatchHtml(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch KNCB match page");
  }

  return await response.text();
}